// ============================================================
// OdontoSync — Auth Routes
// POST /api/auth/login | POST /api/auth/register
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hash, compare } from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';

const loginSchema = z.object({
  emailOrPhone: z.string().min(1),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  // Login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: body.emailOrPhone },
          { phone: body.emailOrPhone },
        ],
        status: 'ACTIVE',
      },
    });

    if (!user) {
      return reply.code(401).send({ error: 'Credenciais inválidas', code: 401 });
    }

    const passwordMatch = await compare(body.password, user.password);
    if (!passwordMatch) {
      return reply.code(401).send({ error: 'Credenciais inválidas', code: 401 });
    }

    const token = app.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });
  });

  // Register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });

    if (exists) {
      return reply.code(409).send({ error: 'Email ou telefone já cadastrado', code: 409 });
    }

    const hashedPassword = await hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        password: hashedPassword,
        role: 'PATIENT',
      },
    });

    const token = app.jwt.sign(
      { userId: user.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
    );

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  });
}
