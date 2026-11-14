import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const sqlPath = path.join(__dirname, '001_create_tables.sql');
  logger.info(`Reading SQL migration from: ${sqlPath}`);

  if (!fs.existsSync(sqlPath)) {
    logger.error(`Migration file not found at ${sqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('\n============================================================');
  console.log('               RESOLVEFLOW AI - DATABASE MIGRATION          ');
  console.log('============================================================\n');
  console.log(`Target Database: ${SUPABASE_URL || 'Not Configured Yet'}`);
  console.log(`Migration File:  001_create_tables.sql (${sql.length} bytes)\n`);
  console.log('Tables to be created:');
  console.log('  1. users              7. workflows');
  console.log('  2. customers          8. agent_tasks');
  console.log('  3. products           9. agent_actions');
  console.log('  4. orders            10. approvals');
  console.log('  5. order_items       11. audit_logs');
  console.log('  6. issues            12. business_policies');
  console.log('\n------------------------------------------------------------');
  console.log('HOW TO RUN IN SUPABASE:');
  console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to your project -> SQL Editor -> New Query');
  console.log('3. Copy and paste the contents of backend/migrations/001_create_tables.sql');
  console.log('4. Click "Run"');
  console.log('------------------------------------------------------------\n');

  // If Supabase service role key is configured and not default placeholder, attempt direct execution
  if (
    SUPABASE_URL &&
    SUPABASE_SERVICE_ROLE_KEY &&
    !SUPABASE_URL.includes('your-project') &&
    !SUPABASE_URL.includes('placeholder')
  ) {
    try {
      logger.info('Attempting direct SQL execution via Supabase SQL endpoint...');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      });

      if (response.ok) {
        logger.info('Database migration executed successfully via Supabase RPC!');
        return;
      } else {
        const errorText = await response.text();
        logger.warn(`Direct execution returned status ${response.status}: ${errorText}`);
        logger.info('Please run the migration manually using Supabase SQL Editor.');
      }
    } catch (err) {
      logger.warn(`Could not execute directly: ${err.message}`);
      logger.info('Please run the migration manually using Supabase SQL Editor.');
    }
  } else {
    logger.info('Supabase credentials not yet configured in backend/.env.');
    logger.info('Use backend/migrations/001_create_tables.sql in Supabase SQL Editor once project is created.');
  }
}

runMigration().catch((err) => {
  logger.error('Migration failed:', err);
  process.exit(1);
});
