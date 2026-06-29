export type DatabaseProvider = 'sqlite' | 'oracle';

/** Active database backend — default sqlite for local dev. */
export function getDatabaseProvider(): DatabaseProvider {
  const raw = process.env.DATABASE_PROVIDER?.trim().toLowerCase();
  if (raw === 'oracle') return 'oracle';
  return 'sqlite';
}

export function isOracleMode(): boolean {
  return getDatabaseProvider() === 'oracle';
}

export function isSqliteMode(): boolean {
  return !isOracleMode();
}
