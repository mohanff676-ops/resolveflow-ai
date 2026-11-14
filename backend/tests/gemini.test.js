import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../src/config/env.js';

async function testGeminiConnectivity() {
  console.log('\n============================================================');
  console.log('             GEMINI API CONNECTIVITY AUDIT                 ');
  console.log('============================================================\n');

  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your-gemini')) {
    console.error('❌ GEMINI_API_KEY is missing or set to placeholder in backend/.env');
    process.exit(1);
  }

  // Strictly follow rule: Never print or expose any part of the API key in logs.
  console.log('API Key Status: Verified present in backend/.env (credentials redacted)');
  console.log(`Primary Model Configured: ${GEMINI_MODEL}`);

  const primaryModel = GEMINI_MODEL || 'gemini-3.5-flash';
  const fallbackModels = ['gemini-2.5-flash', 'gemini-1.5-flash'].filter((m) => m !== primaryModel);
  const modelsToTest = [primaryModel, ...fallbackModels];

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const prompt = 'You are ResolveFlow AI agent test runner. Respond strictly with valid JSON: {"status": "connected", "agent": "Intake Agent"}';

  let success = false;
  let successfulModel = '';

  for (const modelName of modelsToTest) {
    try {
      console.log(`\nTesting generateContent with primary/candidate model "${modelName}"...`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          abortSignal: AbortSignal.timeout(15000),
        },
      });

      const text = response?.text;
      console.log(`Response received from ${modelName}:`);
      console.log(text?.trim());

      if (text && (text.includes('connected') || text.includes('Intake Agent') || text.includes('status'))) {
        console.log(`\n✅ Gemini API connectivity verified successfully with model: "${modelName}"!`);
        success = true;
        successfulModel = modelName;
        break;
      }
    } catch (err) {
      console.warn(`Model ${modelName} returned notice: ${err.message}`);
    }
  }

  if (success) {
    console.log(`\nVerified working model: ${successfulModel}`);
    process.exit(0);
  } else {
    console.error('\n❌ Models encountered temporary rate limits or unavailability.');
    process.exit(1);
  }
}

testGeminiConnectivity();
