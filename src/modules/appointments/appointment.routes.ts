// ============================================================
// OdontoSync — Appointment Routes
// CRUD com ações de status (confirm, cancel, no-show, complete)
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { sendPushNotification } from '../../lib/pushNotification.js';

const bookingSchema = z.object({
  phone: z.string().min(10),
  serviceId: z.string().uuid(),
  dentistName: z.string().min(2),
  date: z.string(), // ISO date
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato de hora inválido (HH:MM)"), // HH:mm de 00:00 a 23:59
  notes: z.string().optional(),
  patientName: z.string().optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  // Listar agendamentos (admin: todos, paciente: os seus)
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const { userId, role } = request.user as { userId: string; role: string };

    let where: any = {};

    if (role !== 'ADMIN') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return { appointments: [] };
      }

      const cleanPhone = user.phone.replace(/\D/g, '');
      const phoneFormats = [user.phone, cleanPhone];
      if (cleanPhone.length === 11) {
        phoneFormats.push(`(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`);
      } else if (cleanPhone.length === 10) {
        phoneFormats.push(`(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`);
      }

      where = {
        OR: [
          { userId },
          { phone: { in: phoneFormats } }
        ]
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { date: 'desc' },
    });

    // Auto-cura: vincula os agendamentos órfãos/desalinhados ao ID correto do usuário logado
    if (role !== 'ADMIN' && appointments.length > 0) {
      const unlinkedIds = appointments
        .filter((apt) => apt.userId !== userId)
        .map((apt) => apt.id);
      
      if (unlinkedIds.length > 0) {
        prisma.appointment.updateMany({
          where: { id: { in: unlinkedIds } },
          data: { userId },
        }).catch(() => {});
      }
    }

    return { appointments };
  });

  // Criar agendamento
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = bookingSchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    // Valida se a data é válida
    const parsedDate = new Date(body.date + 'T12:00:00-03:00');
    if (isNaN(parsedDate.getTime())) {
      return reply.code(400).send({ error: 'Data inválida.' });
    }

    // Valida se não está no passado
    const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(body.date + 'T12:00:00-03:00');
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return reply.code(400).send({ error: 'A data do agendamento não pode ser anterior a hoje.' });
    }

    // Busca usuário pelo telefone com suporte a múltiplos formatos
    const cleanPhone = body.phone.replace(/\D/g, '');
    const phoneFormats = [cleanPhone];
    if (cleanPhone.length === 11) {
      phoneFormats.push(`(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`);
    } else if (cleanPhone.length === 10) {
      phoneFormats.push(`(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`);
    }

    let linkedUser = await prisma.user.findFirst({
      where: {
        phone: { in: phoneFormats },
      },
    });

    if (!linkedUser) {
      // Se não existir, criamos o usuário no banco de dados automaticamente
      const name = body.patientName && body.patientName.trim() !== ''
        ? body.patientName.trim()
        : 'Desconhecida';

      linkedUser = await prisma.user.create({
        data: {
          name,
          phone: cleanPhone, // Armazena sempre limpo para consistência
          email: `sem-email-${cleanPhone}@odontosync.com.br`,
          password: '', // Sem senha inicialmente
          role: 'PATIENT',
        }
      });
    }

    const appointment = await prisma.appointment.create({
      data: {
        phone: cleanPhone, // Armazena sempre limpo para consistência
        userId: linkedUser.id,
        serviceId: body.serviceId,
        dentistName: body.dentistName,
        date: new Date(body.date + 'T12:00:00-03:00'),
        time: body.time,
        notes: body.notes,
        status: 'CONFIRMED', // Novo agendamento já é criado confirmado por padrão
      },
      include: {
        service: true,
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    // Disparar push notification para o paciente em segundo plano
    if (linkedUser.pushToken) {
      const dateFormatted = new Date(body.date + 'T12:00:00-03:00')
        .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      sendPushNotification(
        linkedUser.pushToken,
        '📅 Nova Consulta Agendada!',
        `Sua consulta foi marcada para ${dateFormatted} às ${body.time}.`,
        { appointmentId: appointment.id }
      ).catch(() => {});
    }

    return reply.code(201).send({ appointment });
  });

  // Atualizar status
  app.patch('/:id/status', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'ABSENT']) }).parse(request.body);

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
    });

    return reply.send({ appointment });
  });

  // Agendamentos por data (admin)
  app.get('/by-date/:date', { preHandler: [app.requireAdmin] }, async (request) => {
    const { date } = request.params as { date: string };

    const appointments = await prisma.appointment.findMany({
      where: { date: new Date(date + 'T12:00:00-03:00') },
      include: { service: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { time: 'asc' },
    });

    return { appointments };
  });
}
