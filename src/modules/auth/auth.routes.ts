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

// Armazenamento temporário de códigos OTP (expira em 5 minutos)
const otpStore = new Map<string, { code: string; expiresAt: number }>();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  code: z.string().min(6).max(6),
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

    // Impede login de usuários pré-cadastrados (draft/rascunho) que não ativaram a conta
    if (user.password === '' || user.email.startsWith('sem-email-')) {
      return reply.code(401).send({ error: 'Conta não ativada. Por favor, cadastre-se no aplicativo para ativar.', code: 401 });
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

  // Enviar código de verificação OTP para o WhatsApp
  app.post('/send-otp', async (request, reply) => {
    const body = z.object({ phone: z.string().min(10) }).parse(request.body);
    const cleanPhone = body.phone.replace(/\D/g, '');

    // Gerar código de 6 dígitos aleatório
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Salvar com validade de 5 minutos
    otpStore.set(cleanPhone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    console.log(`\n--- [SEGURANÇA ODONTOSYNC] ---`);
    console.log(`WhatsApp OTP enviado para ${cleanPhone}: ${code}`);
    console.log(`--------------------------------\n`);

    return reply.send({
      success: true,
      message: 'Código de verificação enviado!',
      devCode: code, // Retornado no payload para facilidade de testes locais / simulador
    });
  });

  // Register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const cleanPhone = body.phone.replace(/\D/g, '');

    // Validação rigorosa de código OTP
    const otpData = otpStore.get(cleanPhone);
    if (!otpData || otpData.code !== body.code || otpData.expiresAt < Date.now()) {
      return reply.code(400).send({ error: 'Código de verificação WhatsApp inválido ou expirado.', code: 400 });
    }

    // Código correto, remove do store
    otpStore.delete(cleanPhone);

    // Verifica se já existe um usuário com o mesmo e-mail ou telefone
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });

    if (existingUser) {
      // Se for uma conta de "Rascunho/Pré-cadastro" criada pela recepção (sem senha ou com e-mail provisório)
      const isDraft = existingUser.password === '' || existingUser.email.startsWith('sem-email-');

      if (isDraft) {
        // Verifica se o novo e-mail informado já pertence a outro usuário cadastrado
        if (existingUser.email !== body.email) {
          const emailExists = await prisma.user.findFirst({
            where: { email: body.email, NOT: { id: existingUser.id } }
          });
          if (emailExists) {
            return reply.code(409).send({ error: 'Este e-mail já está sendo usado por outro paciente.', code: 409 });
          }
        }

        const hashedPassword = await hash(body.password, 10);

        // Faz o upgrade seguro da conta rascunho preexistente para uma conta totalmente ativada!
        const activatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: body.name,
            email: body.email,
            phone: body.phone,
            password: hashedPassword,
          }
        });

        const token = app.jwt.sign(
          { userId: activatedUser.id, role: activatedUser.role },
          { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
        );

        return reply.code(200).send({
          token,
          user: {
            id: activatedUser.id,
            name: activatedUser.name,
            email: activatedUser.email,
            phone: activatedUser.phone,
            role: activatedUser.role,
          },
        });
      }

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
