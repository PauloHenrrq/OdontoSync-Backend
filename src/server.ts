// ============================================================
// OdontoSync — Fastify Server Entry Point
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar .env de forma segura e explícita no ponto de entrada global
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
  await app.register(helmet, {
    contentSecurityPolicy: false, // Habilita compatibilidade fácil com a web de desenvolvimento
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      error: 'Muitas requisições. Por favor, tente novamente mais tarde.',
      code: 429,
      retryAfter: context.after,
    }),
  });
  await app.register(cors, { 
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] 
  });
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
