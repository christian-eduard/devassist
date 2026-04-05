const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM';
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hola TESS, confirma conexión.');
    console.log('RESPONSE:', result.response.text());
  } catch (err) {
    console.error('API_KEY_ERROR:', err.message);
  }
}
test();
