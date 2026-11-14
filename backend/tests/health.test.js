import server from '../src/server.js';

async function testHealth() {
  try {
    await new Promise((r) => setTimeout(r, 500));

    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();

    console.log('HTTP_STATUS:', response.status);
    console.log('RESPONSE_DATA:', JSON.stringify(data, null, 2));

    const rootRes = await fetch('http://localhost:3001/');
    const rootData = await rootRes.json();
    console.log('ROOT_STATUS:', rootRes.status);
    console.log('ROOT_DATA:', JSON.stringify(rootData, null, 2));

    if (response.status === 200 && data.status === 'ok') {
      console.log('VERIFICATION_SUCCESSFUL');
      server.close(() => {
        process.exit(0);
      });
    } else {
      console.error('VERIFICATION_FAILED: Unexpected status or data');
      server.close(() => {
        process.exit(1);
      });
    }
  } catch (err) {
    console.error('VERIFICATION_ERROR:', err);
    server.close(() => {
      process.exit(1);
    });
  }
}

testHealth();
