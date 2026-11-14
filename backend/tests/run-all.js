import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suites = [
  'auth.test.js',
  'tools.test.js',
  'orchestrator.test.js',
  'frontend-integration.test.js',
  'e2e-all-15-scenarios.test.js',
];

async function runSuite(suiteFile) {
  return new Promise((resolve) => {
    console.log(`\n============================================================`);
    console.log(`RUNNING SUITE: ${suiteFile}`);
    console.log(`============================================================`);
    const child = spawn(process.execPath, [path.join(__dirname, suiteFile)], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(` SUITE PASSED: ${suiteFile}`);
        resolve(true);
      } else {
        console.error(` SUITE FAILED (exit code ${code}): ${suiteFile}`);
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('ResolveFlow AI Backend - Running All Automated Test Suites\n');
  let allPassed = true;
  for (const suite of suites) {
    const passed = await runSuite(suite);
    if (!passed) {
      allPassed = false;
      break;
    }
  }

  if (allPassed) {
    console.log('\n============================================================');
    console.log(' ALL TEST SUITES PASSED CLEANLY');
    console.log('============================================================');
    process.exit(0);
  } else {
    console.error('\n============================================================');
    console.error(' ONE OR MORE TEST SUITES FAILED');
    console.error('============================================================');
    process.exit(1);
  }
}

main();
