// ============================================================
// OdontoSync — Notification Routes (Patient & Admin)
// Listagem e marcação de leitura de alertas do paciente.
// ============================================================

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export async function notificationRoutes(app: FastifyInstance) {
  // Listar notificações do paciente autenticado
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string };

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { notifications };
  });

  // Marcar notificação como lida
  app.patch('/:id/read', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { userId } = request.user as { userId: string };

    const notification = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });

    return { success: true };
  });

  // Marcar todas como lidas
  app.patch('/read-all', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string };

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true };
  });
}
