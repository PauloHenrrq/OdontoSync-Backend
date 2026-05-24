// ============================================================
// OdontoSync — Patient Routes (Admin only)
// Listagem e busca de pacientes
// ============================================================

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export async function patientRoutes(app: FastifyInstance) {
  // Listar todos os pacientes
  app.get('/', { preHandler: [app.requireAdmin] }, async (request) => {
    const patients = await prisma.user.findMany({
      where: { role: 'PATIENT', status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return { patients };
  });

  // Buscar paciente por telefone (elo central)
  app.get('/by-phone/:phone', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    const { phone } = request.params as { phone: string };

    const patient = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        appointments: {
          include: { service: true },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!patient) {
      return reply.code(404).send({ error: 'Paciente não encontrado', code: 404 });
    }

    return { patient };
  });

  // Buscar pacientes por query (nome, email ou telefone)
  app.get('/search', { preHandler: [app.requireAdmin] }, async (request) => {
    const { q } = request.query as { q?: string };

    if (!q || q.length < 2) {
      return { patients: [] };
    }

    const patients = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
        status: 'ACTIVE',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        _count: { select: { appointments: true } },
      },
      take: 20,
    });

    return { patients };
  });
}
