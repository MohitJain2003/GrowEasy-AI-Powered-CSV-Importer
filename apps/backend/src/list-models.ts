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
    // Attempting to list models
    console.log('Testing connection to Gemini API...');
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Say hello');
    console.log('Success with gemini-1.5-flash:', result.response.text());
  } catch (err: any) {
    console.error('Error with gemini-1.5-flash:', err.message);
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent('Say hello');
    console.log('Success with gemini-1.5-flash-latest:', result.response.text());
  } catch (err: any) {
    console.error('Error with gemini-1.5-flash-latest:', err.message);
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say hello');
    console.log('Success with gemini-pro:', result.response.text());
  } catch (err: any) {
    console.error('Error with gemini-pro:', err.message);
  }
}

main();
