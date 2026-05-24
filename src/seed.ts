import { prisma } from './lib/prisma.js';
import pkg from 'bcryptjs';
const { hash } = pkg;

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing database
  console.log('🧹 Cleaning database...');
  await prisma.appointment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dentalService.deleteMany();
  await prisma.clinicConfig.deleteMany();

  // 2. Create default services
  console.log('🦷 Seeding dental services...');
  const services = await Promise.all([
    prisma.dentalService.create({
      data: {
        name: 'Limpeza e Profilaxia',
        duration: 45,
        description: 'Limpeza completa, remoção de tártaro e polimento dental para manter a saúde bucal.',
        icon: 'Sparkles',
      },
    }),
    prisma.dentalService.create({
      data: {
        name: 'Restauração Dental',
        duration: 60,
        description: 'Tratamento de cáries com resina composta da cor do seu dente.',
        icon: 'Shield',
      },
    }),
    prisma.dentalService.create({
      data: {
        name: 'Clareamento Dental',
        duration: 60,
        description: 'Clareamento clínico a laser para recuperar o branco natural do seu sorriso.',
        icon: 'Smile',
      },
    }),
    prisma.dentalService.create({
      data: {
        name: 'Tratamento de Canal',
        duration: 90,
        description: 'Remoção da polpa infeccionada e restauração interna para salvar o dente afetado.',
        icon: 'Activity',
      },
    }),
    prisma.dentalService.create({
      data: {
        name: 'Extração de Siso',
        duration: 75,
        description: 'Remoção cirúrgica segura de dentes do siso impactados ou desalinhados.',
        icon: 'Scissors',
      },
    }),
  ]);

  // 3. Create Clinic Configuration
  console.log('🏢 Seeding clinic configuration...');
  await prisma.clinicConfig.create({
    data: {
      name: 'Odonto Excell',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
      phone: '11999999999',
      logoUrl: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300',
      absenceReduction: true,
      reminderHoursBefore: 24,
      confirmationTemplate: 'Olá, [NOME]! Confirmamos sua consulta em [DATA] às [HORA]. Te esperamos!',
      cancellationTemplate: 'Olá, [NOME]! Sua consulta em [DATA] às [HORA] foi cancelada.',
    },
  });

  // 4. Create Users (Admin & Patient)
  console.log('👤 Seeding users...');
  const hashedAdminPassword = await hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Dra. Amanda Silva (Recepcionista/Admin)',
      email: 'admin@odontosync.com',
      phone: '11999999999', // Admin phone
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  });

  const hashedPatientPassword = await hash('paciente123', 10);
  const patient1 = await prisma.user.create({
    data: {
      name: 'Ana Paula Santos',
      email: 'ana.santos@email.com',
      phone: '11987654321',
      password: hashedPatientPassword,
      role: 'PATIENT',
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      name: 'Mariana Costa',
      email: 'mariana.costa@email.com',
      phone: '11976543210',
      password: hashedPatientPassword,
      role: 'PATIENT',
    },
  });

  const patient3 = await prisma.user.create({
    data: {
      name: 'Ricardo Alves',
      email: 'ricardo.alves@email.com',
      phone: '11965432109',
      password: hashedPatientPassword,
      role: 'PATIENT',
    },
  });

  const patient4 = await prisma.user.create({
    data: {
      name: 'Felipe Oliveira',
      email: 'felipe.oliveira@email.com',
      phone: '11954321098',
      password: hashedPatientPassword,
      role: 'PATIENT',
    },
  });

  // 5. Create Appointments
  console.log('📅 Seeding appointments...');
  
  // Future dates
  const today = new Date();
  today.setHours(10, 0, 0, 0);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 30, 0, 0);

  // A) Today — Ana Paula Santos
  await prisma.appointment.create({
    data: {
      phone: patient1.phone,
      userId: patient1.id,
      serviceId: services[0].id, // Limpeza
      dentistName: 'Dra. Amanda Silva',
      date: today,
      time: '10:00',
      status: 'CONFIRMED',
      notes: 'Paciente relatou leve sensibilidade.',
    },
  });

  // B) Today — Mariana Costa
  await prisma.appointment.create({
    data: {
      phone: patient2.phone,
      userId: patient2.id,
      serviceId: services[2].id, // Clareamento
      dentistName: 'Dra. Amanda Silva',
      date: today,
      time: '14:00',
      status: 'PENDING',
    },
  });

  // C) Tomorrow — Ana Paula Santos
  await prisma.appointment.create({
    data: {
      phone: patient1.phone,
      userId: patient1.id,
      serviceId: services[1].id, // Restauração
      dentistName: 'Dr. Roberto Santos',
      date: tomorrow,
      time: '09:00',
      status: 'CONFIRMED',
      notes: 'Retorno para avaliação.',
    },
  });

  // D) Orphan appointment (phone doesn't match a user)
  await prisma.appointment.create({
    data: {
      phone: '11977777777',
      serviceId: services[3].id, // Tratamento de Canal
      dentistName: 'Dr. Roberto Santos',
      date: nextWeek,
      time: '14:30',
      status: 'PENDING',
      notes: 'Paciente ligou agendando pelo WhatsApp.',
    },
  });

  // E) Past appointment — Felipe Oliveira — marked as ABSENT
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(16, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      phone: patient4.phone,
      userId: patient4.id,
      serviceId: services[4].id, // Extração de Siso
      dentistName: 'Dr. Roberto Santos',
      date: yesterday,
      time: '16:00',
      status: 'ABSENT',
      notes: 'Não compareceu e não justificou a ausência.',
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
