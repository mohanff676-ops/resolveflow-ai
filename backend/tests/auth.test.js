import server from '../src/server.js';
import { supabase } from '../src/config/database.js';

const BASE_URL = 'http://localhost:3001/api';

async function runAuthTests() {
  console.log('\n============================================================');
  console.log('              RESOLVEFLOW AI - AUTH TEST SUITE              ');
  console.log('============================================================\n');

  // Allow server to bind
  await new Promise((r) => setTimeout(r, 600));

  let testsPassed = 0;
  let testsFailed = 0;

  const assert = (condition, testName, extra = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${extra}`);
      testsFailed++;
    }
  };

  const testUser = {
    email: `qa.engineer.${Date.now()}@resolveflow.ai`,
    password: 'SecurePassword123!',
    name: 'QA Engineer',
    role: 'operator',
  };

  let registeredToken = null;
  let adminToken = null;
  let operatorToken = null;

  try {
    // 1. Test Registration
    console.log('1. Testing User Registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.success && regData.data.token, 'New user registration returns 201 with JWT', JSON.stringify(regData));
    registeredToken = regData.data?.token;

    // 2. Test Duplicate Registration (Conflict)
    console.log('2. Testing Duplicate Registration Prevention...');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409 && !dupData.success, 'Duplicate registration returns 409 Conflict', JSON.stringify(dupData));

    // 3. Test Zod Validation Rejection
    console.log('3. Testing Zod Validation Constraints...');
    const invalidRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email', password: 'short', name: 'A' }),
    });
    const invalidData = await invalidRes.json();
    assert(invalidRes.status === 400 && !invalidData.success, 'Invalid registration payload rejected with 400', JSON.stringify(invalidData));

    // 4. Test Seeded Admin Login
    console.log('4. Testing Seeded Admin Login...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@resolveflow.ai', password: 'admin123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert(
      adminLoginRes.status === 200 && adminLoginData.data.user.role === 'admin' && adminLoginData.data.token,
      'Seeded Admin login succeeds and returns role "admin"',
      JSON.stringify(adminLoginData)
    );
    adminToken = adminLoginData.data?.token;

    // 5. Test Seeded Operator Login
    console.log('5. Testing Seeded Operator Login...');
    const opLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operator@resolveflow.ai', password: 'operator123' }),
    });
    const opLoginData = await opLoginRes.json();
    assert(
      opLoginRes.status === 200 && opLoginData.data.user.role === 'operator' && opLoginData.data.token,
      'Seeded Operator login succeeds and returns role "operator"',
      JSON.stringify(opLoginData)
    );
    operatorToken = opLoginData.data?.token;

    // 6. Test Newly Registered User Login
    console.log('6. Testing Newly Registered User Login...');
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const newLoginData = await newLoginRes.json();
    assert(newLoginRes.status === 200 && newLoginData.success, 'Newly registered user can log in with credentials');

    // 7. Test Incorrect Password Failure
    console.log('7. Testing Incorrect Password Failure...');
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@resolveflow.ai', password: 'wrongPassword123!' }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(wrongPassRes.status === 401 && !wrongPassData.success, 'Incorrect password rejected with 401');

    // 8. Test Non-existent Email Failure
    console.log('8. Testing Non-existent Email Failure...');
    const noUserRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@nowhere.com', password: 'randomPassword!' }),
    });
    const noUserData = await noUserRes.json();
    assert(noUserRes.status === 401 && !noUserData.success, 'Non-existent email rejected with 401');

    // 9. Test Protected Route (GET /api/auth/me) with Valid JWT
    console.log('9. Testing Protected Route Access (GET /api/auth/me)...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${registeredToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 && meData.success && meData.data.email === testUser.email.toLowerCase(),
      'Protected /api/auth/me returns authenticated user profile'
    );

    // 10. Test Protected Route without Token
    console.log('10. Testing Protected Route Rejection Without Token...');
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    const noTokenData = await noTokenRes.json();
    assert(noTokenRes.status === 401 && !noTokenData.success, 'Missing Authorization header rejected with 401');

    // 11. Test Protected Route with Malformed Token
    console.log('11. Testing Protected Route Rejection With Invalid Token...');
    const badTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    const badTokenData = await badTokenRes.json();
    assert(badTokenRes.status === 401 && !badTokenData.success, 'Invalid/tampered JWT rejected with 401');

    // 12. Test Role-Based Authorization: Admin Allowed on Admin-Only Route
    console.log('12. Testing Role-Based Authorization (Admin on /api/auth/admin-only)...');
    const adminCheckRes = await fetch(`${BASE_URL}/auth/admin-only`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminCheckData = await adminCheckRes.json();
    assert(adminCheckRes.status === 200 && adminCheckData.success, 'Admin user granted access to admin-only endpoint');

    // 13. Test Role-Based Authorization: Operator Forbidden on Admin-Only Route
    console.log('13. Testing Role-Based Authorization (Operator on /api/auth/admin-only)...');
    const opCheckRes = await fetch(`${BASE_URL}/auth/admin-only`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const opCheckData = await opCheckRes.json();
    assert(opCheckRes.status === 403 && !opCheckData.success, 'Operator user denied access with 403 Forbidden');

  } catch (err) {
    console.error('Unexpected test suite error:', err);
    testsFailed++;
  } finally {
    // Clean up created test user to preserve database state
    console.log('\nCleaning up ephemeral test user from Supabase...');
    await supabase.from('users').delete().eq('email', testUser.email.toLowerCase());
    console.log('Ephemeral test user cleaned.\n');

    console.log('============================================================');
    console.log(`TEST SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('============================================================\n');

    server.close(() => {
      process.exit(testsFailed > 0 ? 1 : 0);
    });
  }
}

runAuthTests();
