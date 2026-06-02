// ============================================================
// OdontoSync — Fastify Server Entry Point
// ============================================================

import fs from 'fs';
import path from 'path';

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
import { z } from 'zod';
import { prisma } from './lib/prisma.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { appointmentRoutes } from './modules/appointments/appointment.routes.js';
import { patientRoutes } from './modules/patients/patient.routes.js';
import { clinicRoutes } from './modules/clinic/clinic.routes.js';

const app = Fastify({
  logger: process.env.NODE_ENV === 'production'
    ? true
    : {
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

  // Interceptor de erro global (Sanitização e Segurança em Produção)
  app.setErrorHandler((error: any, request, reply) => {
    app.log.error(error);

    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: 'Erro de validação nos dados enviados.',
        code: 400,
        details: error.format(),
      });
    }

    if (reply.statusCode === 429) {
      return reply.code(429).send({
        error: 'Muitas requisições. Por favor, tente novamente mais tarde.',
        code: 429,
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction 
      ? 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
      : error.message;

    return reply.code(error.statusCode || 500).send({
      error: message,
      code: error.statusCode || 500,
    });
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

  // Graceful Shutdown (Encerramento gracioso do Fastify e do Prisma)
  const closeGracefully = async (signal: string) => {
    console.log(`\n🦷 Recebido sinal ${signal}. Encerrando o servidor de forma graciosa...`);
    try {
      await app.close();
      await prisma.$disconnect();
      console.log('✔ Conexões de banco de dados e servidor encerrados com sucesso.');
      process.exit(0);
    } catch (err) {
      console.error('Erro ao encerrar conexões:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
}

bootstrap();
