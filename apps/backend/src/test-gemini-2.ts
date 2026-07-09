import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }
  const ai = new GoogleGenerativeAI(apiKey);
  try {
    console.log('Testing connection to Gemini API with gemini-2.0-flash...');
    const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent('Say hello');
    console.log('Success with gemini-2.0-flash:', result.response.text());
  } catch (err: any) {
    console.error('Error with gemini-2.0-flash:', err.message);
  }
}

main();
