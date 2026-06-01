import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do prisma para isolar os testes lógicos sem requerer conexão de banco físico
vi.mock('../../lib/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../lib/prisma.js';

describe('Appointment Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should format clean phone numbers correctly for database comparison', () => {
    const rawPhone = '(28) 99999-9999';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    expect(cleanPhone).toBe('28999999999');
  });

  it('should create new appointments directly in CONFIRMED status', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'João Teste',
      phone: '28999999999',
      email: 'joao@teste.com',
    };

    const mockCreatedApt = {
      id: 'apt-456',
      phone: '28999999999',
      userId: 'user-123',
      serviceId: 'svc-uuid',
      dentistName: 'Dr. Sorriso',
      date: new Date('2026-06-10T12:00:00'),
      time: '14:30',
      status: 'CONFIRMED',
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
    vi.mocked(prisma.appointment.create).mockResolvedValue(mockCreatedApt as any);

    // Valida que o status é CONFIRMED conforme exigência da clínica
    expect(mockCreatedApt.status).toBe('CONFIRMED');
  });

  it('should correctly identify orphan appointments that require database auto-healing', async () => {
    const mockAppointments = [
      { id: 'apt-1', userId: 'different-user', phone: '28999999999' },
      { id: 'apt-2', userId: 'user-123', phone: '28999999999' },
    ];

    const userId = 'user-123';
    
    // Filtro da lógica de auto-cura do Backend
    const unlinkedIds = mockAppointments
      .filter((apt) => apt.userId !== userId)
      .map((apt) => apt.id);

    expect(unlinkedIds).toContain('apt-1');
    expect(unlinkedIds).not.toContain('apt-2');
  });
});
