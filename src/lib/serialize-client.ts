/** JSON-safe shape for values passed from Server to Client Components. */
export type Jsonify<T> = T extends Date
  ? string
  : T extends bigint
    ? string
    : T extends undefined
      ? undefined
      : T extends null
        ? null
        : T extends (infer U)[]
          ? Jsonify<U>[]
          : T extends object
            ? { [K in keyof T]: Jsonify<T[K]> }
            : T;

/** Strip Prisma types (Decimal, Date, etc.) for safe Client Component props. */
export function serializeForClient<T>(value: T): Jsonify<T> {
  return JSON.parse(JSON.stringify(value)) as Jsonify<T>;
}
