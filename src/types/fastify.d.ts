// ============================================================
// OdontoSync — Fastify JWT Type Augmentation
// Estende os tipos do Fastify para incluir o JWT decorator.
// ============================================================

import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string;
      role: string;
    };
    user: {
      userId: string;
      role: string;
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    requireAdmin: (request: any, reply: any) => Promise<void>;
  }
}
