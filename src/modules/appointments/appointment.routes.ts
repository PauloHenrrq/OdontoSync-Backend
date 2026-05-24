// ============================================================
// OdontoSync — Appointment Routes
// CRUD com ações de status (confirm, cancel, no-show, complete)
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const bookingSchema = z.object({
  phone: z.string().min(10),
  serviceId: z.string().uuid(),
  dentistName: z.string().min(2),
  date: z.string(), // ISO date
  time: z.string(), // HH:mm
  notes: z.string().optional(),
});

export async function appointmentRoutes(app: FastifyInstance) {
  // Listar agendamentos (admin: todos, paciente: os seus)
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const { userId, role } = request.user as { userId: string; role: string };

    const where = role === 'ADMIN' ? {} : { userId };

    const appointments = await prisma.appointment.findMany({
      where,
      include: { service: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { date: 'desc' },
    });

    return { appointments };
  });

  // Criar agendamento
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = bookingSchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    // Busca usuário pelo telefone para vincular (elo central)
    const linkedUser = await prisma.user.findUnique({ where: { phone: body.phone } });

    const appointment = await prisma.appointment.create({
      data: {
        phone: body.phone,
        userId: linkedUser?.id ?? userId,
        serviceId: body.serviceId,
        dentistName: body.dentistName,
        date: new Date(body.date),
        time: body.time,
        notes: body.notes,
      },
      include: {
        service: true,
        user: { select: { id: true, name: true, phone: true } },
      },
    });

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
      where: { date: new Date(date) },
      include: { service: true, user: { select: { id: true, name: true, phone: true } } },
      orderBy: { time: 'asc' },
    });

    return { appointments };
  });
}
