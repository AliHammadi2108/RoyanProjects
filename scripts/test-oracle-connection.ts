/**
 * Test Oracle connectivity.
 * Usage: npm run test:oracle-connection
 */
import { closeOraclePool, getOracleConfig, getOracleConnection, isOracleConfigured, q } from '../src/database/oracle';

async function main() {
  if (!isOracleConfigured()) {
    console.error('❌ Oracle not configured. Set ORACLE_USER, ORACLE_PASSWORD, ORACLE_HOST, etc.');
    process.exit(1);
  }

  const cfg = getOracleConfig();
  console.log('Connecting to Oracle...');
  console.log(`  connectString: ${cfg.connectString}`);
  console.log(`  schema: ${cfg.schema}`);
  console.log(`  pool: min=${cfg.poolMin} max=${cfg.poolMax}`);

  const conn = await getOracleConnection();
  try {
    const version = await conn.execute<{ BANNER: string }>(
      `SELECT BANNER FROM v$version WHERE ROWNUM = 1`
    );
    console.log('✅ Connected:', version.rows?.[0]?.BANNER ?? 'OK');

    const supplierCount = await conn.execute<{ CNT: number }>(
      `SELECT COUNT(*) AS CNT FROM ${q('V_DETAILS')} WHERE INACTIVE = 0`
    );
    console.log(`✅ Active suppliers (V_DETAILS): ${supplierCount.rows?.[0]?.CNT ?? 0}`);

    const currencyCount = await conn.execute<{ CNT: number }>(
      `SELECT COUNT(*) AS CNT FROM ${q('VENDOR_CURR')} WHERE INACTIVE = 0`
    );
    console.log(`✅ Active vendor currencies (VENDOR_CURR): ${currencyCount.rows?.[0]?.CNT ?? 0}`);

    console.log('\nOracle connection test passed.');
  } finally {
    await conn.close();
    await closeOraclePool();
  }
}

main().catch((err) => {
  console.error('❌ Oracle connection failed:', err.message ?? err);
  process.exit(1);
});
