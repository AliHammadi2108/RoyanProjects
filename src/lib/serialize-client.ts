/** Strip Prisma types (Decimal, Date, etc.) for safe Client Component props. */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
