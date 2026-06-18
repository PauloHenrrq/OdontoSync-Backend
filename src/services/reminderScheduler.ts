// ============================================================
// OdontoSync — Automated Reminder Scheduler
// Checks for upcoming appointments and sends automatic pushes.
// ============================================================

import { prisma } from '../lib/prisma.js';
import { sendPushNotification } from '../lib/pushNotification.js';

export async function checkAndSendReminders() {
  try {
    const config = await prisma.clinicConfig.findFirst();
    if (!config || !config.absenceReduction) {
      return;
    }

    const hoursList = config.reminderHoursBefore
      .split(',')
      .map((h) => parseInt(h.trim(), 10))
      .filter((h) => !isNaN(h) && h > 0);

    if (hoursList.length === 0) return;

    // Fetch pending/confirmed appointments in the future
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    today.setHours(0, 0, 0, 0);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: today },
      },
      include: {
        user: true,
      },
    });

    const now = new Date();

    for (const apt of appointments) {
      const isUrgent = apt.notes?.toUpperCase().includes('URGENTE') ?? false;

      // Patients who don't have a push token can't receive push notifications anyway, EXCEPT if it's URGENT (where we want to ensure database notification is created)
      if (!isUrgent && (!apt.user || !apt.user.pushToken)) continue;

      // Determine exact date/time of appointment (date part from UTC Date + time string in Brazil timezone)
      const dateStr = apt.date.toISOString().split('T')[0];
      const aptDateTime = new Date(`${dateStr}T${apt.time}:00-03:00`);

      const diffMs = aptDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      // Check each configured reminder interval (e.g. 24h, 72h)
      for (const hoursBefore of hoursList) {
        // We trigger this reminder if the remaining hours are within the target window.
        // For a reminder target of H hours before, we trigger if the appointment is between (H - 2) and H hours away.
        // We use Math.max(0.1, ...) to make sure we don't trigger reminders for appointments that have already started.
        const lowerBound = Math.max(0.1, hoursBefore - 2);
        const upperBound = hoursBefore;

        if (diffHours >= lowerBound && diffHours <= upperBound) {
          const [year, month, day] = dateStr.split('-');
          const aptDateFormatted = `${day}/${month}/${year}`;
          const title = isUrgent ? '⚠️ Lembrete de Consulta URGENTE' : '⏰ Lembrete de Consulta';
          
          // Formata o template configurado pela clínica
          let template = config.confirmationTemplate || 'Olá [NOME], passando para lembrar da sua consulta no dia [DATA] às [HORA].';
          let msg = template
            .replace(/\[NOME\]/gi, apt.user?.name || 'Paciente')
            .replace(/\[DATA\]/gi, aptDateFormatted)
            .replace(/\[HORA\]/gi, apt.time);

          // Check if we already sent this exact notification
          const alreadySent = await prisma.notification.findFirst({
            where: {
              phone: apt.phone,
              title,
              message: msg,
            },
          });

          if (!alreadySent) {
            // 1. Send push notification if token exists
            if (apt.user?.pushToken) {
              await sendPushNotification(apt.user.pushToken, title, msg, {
                appointmentId: apt.id,
              }).catch(() => {});
            }

            // 2. Save notification in database so it appears in in-app alerts and prevents duplicate sends
            await prisma.notification.create({
              data: {
                userId: apt.userId,
                phone: apt.phone,
                channel: 'PUSH',
                title,
                message: msg,
                status: 'SENT',
                sentAt: new Date(),
              },
            });

            console.log(`[ReminderScheduler] Sent push reminder for appointment ${apt.id} to user ${apt.user?.name || apt.phone}`);

            // Se for urgente, notifica todos os administradores internamente e via push se possuírem token
            if (isUrgent) {
              try {
                const admins = await prisma.user.findMany({
                  where: { role: 'ADMIN' },
                });
                
                const adminTitle = '⚠️ Alerta: Consulta URGENTE';
                const adminMsg = `Atenção: Consulta urgente agendada para ${apt.user?.name || apt.phone} no dia ${aptDateFormatted} às ${apt.time}.`;

                for (const admin of admins) {
                  const adminAlreadyNotified = await prisma.notification.findFirst({
                    where: {
                      userId: admin.id,
                      title: adminTitle,
                      message: adminMsg,
                    },
                  });

                  if (!adminAlreadyNotified) {
                    await prisma.notification.create({
                      data: {
                        userId: admin.id,
                        phone: admin.phone,
                        channel: 'PUSH',
                        title: adminTitle,
                        message: adminMsg,
                        status: 'SENT',
                        sentAt: new Date(),
                      },
                    });

                    if (admin.pushToken) {
                      await sendPushNotification(admin.pushToken, adminTitle, adminMsg, {
                        appointmentId: apt.id,
                      }).catch(() => {});
                    }
                  }
                }
              } catch (adminErr) {
                console.error('[ReminderScheduler - Admin Notify Error]:', adminErr);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[ReminderScheduler Error]:', error);
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startReminderScheduler(intervalMs = 60000) {
  if (intervalId) return;
  
  console.log('⏰ Starting Automated Reminder Scheduler...');
  // Run immediately on start
  checkAndSendReminders().catch(console.error);
  
  // Schedule subsequent runs
  intervalId = setInterval(() => {
    checkAndSendReminders().catch(console.error);
  }, intervalMs);
}

export function stopReminderScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('⏰ Stopped Automated Reminder Scheduler.');
  }
}
