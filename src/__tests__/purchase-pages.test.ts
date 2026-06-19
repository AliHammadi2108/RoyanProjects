import { describe, expect, it } from 'vitest';
import { serializeForClient } from '@/lib/serialize-client';

describe('serializeForClient', () => {
  it('produces JSON-safe output for dates and nested data', () => {
    const input = {
      total: 12.5,
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
      nested: [{ amount: 1 }],
    };
    const out = serializeForClient(input);
    expect(out.total).toBe(12.5);
    expect(out.createdAt).toBe('2024-01-15T00:00:00.000Z');
    expect(() => JSON.stringify(out)).not.toThrow();
  });
});

describe('purchase list routes', () => {
  const routes = [
    '/purchases/quotations',
    '/purchases/comparisons',
    '/purchases/supplier-selection',
    '/purchases/orders',
    '/purchases/inspections',
    '/purchases/receivings',
    '/purchases/invoices',
    '/purchases/supplier-payments',
    '/purchases/tracking',
    '/purchases/requests',
  ];

  it('lists all purchase operation list paths for smoke checks', () => {
    expect(routes).toHaveLength(10);
    routes.forEach((route) => expect(route.startsWith('/purchases/')).toBe(true));
  });
});
