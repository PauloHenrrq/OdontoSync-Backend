// ============================================================
// OdontoSync — Clinic Routes
// Configurações da clínica e KPIs do dashboard
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

export async function clinicRoutes(app: FastifyInstance) {
  // Obter configurações
  app.get('/config', { preHandler: [app.requireAdmin] }, async () => {
    const config = await prisma.clinicConfig.findFirst();
    return { config };
  });

  // Atualizar configurações
  app.patch('/config/:id', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;

    const config = await prisma.clinicConfig.update({
      where: { id },
      data: body,
    });

    return reply.send({ config });
  });

  // KPIs do Dashboard
  app.get('/kpis', { preHandler: [app.requireAdmin] }, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [confirmedToday, pendingContact, totalToday, absencesToday] = await Promise.all([
      prisma.appointment.count({
        where: { date: { gte: today, lt: tomorrow }, status: 'CONFIRMED' },
      }),
      prisma.appointment.count({
        where: { date: { gte: today, lt: tomorrow }, status: 'PENDING' },
      }),
      prisma.appointment.count({
        where: { date: { gte: today, lt: tomorrow } },
      }),
      prisma.appointment.count({
        where: { date: { gte: today, lt: tomorrow }, status: 'ABSENT' },
      }),
    ]);

    const absenceRate = totalToday > 0 ? Number(((absencesToday / totalToday) * 100).toFixed(1)) : 0;

    return {
      kpis: {
        confirmedToday,
        pendingContact,
        absenceRate,
      },
    };
  });
}
