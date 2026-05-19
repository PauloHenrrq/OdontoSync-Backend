// ============================================================
// OdontoSync — Fastify Server Entry Point
// ============================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authRoutes } from './modules/auth/auth.routes.js';
import { appointmentRoutes } from './modules/appointments/appointment.routes.js';
import { patientRoutes } from './modules/patients/patient.routes.js';
import { clinicRoutes } from './modules/clinic/clinic.routes.js';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
    },
  },
});

async function bootstrap() {
  // Plugins
  await app.register(cors, { origin: true });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'odontosync-dev-secret',
  });

  // Decorator para autenticação
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Token inválido ou expirado', code: 401 });
    }
  });

  // Decorator para autorização (Apenas Admin)
  app.decorate('requireAdmin', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'ADMIN') {
        reply.code(403).send({ error: 'Acesso negado. Requer privilégios de administrador.', code: 403 });
      }
    } catch {
      reply.code(401).send({ error: 'Token inválido ou expirado', code: 401 });
    }
  });

  // Rotas
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(appointmentRoutes, { prefix: '/api/appointments' });
  await app.register(patientRoutes, { prefix: '/api/patients' });
  await app.register(clinicRoutes, { prefix: '/api/clinic' });

  // Health check
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'OdontoSync API',
  }));

  // Start
  const port = Number(process.env.PORT) || 3333;
  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🦷 OdontoSync API running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
