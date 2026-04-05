const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = 'AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM';
const genAI = new GoogleGenerativeAI(apiKey);

async function list() {
  try {
    const listModels = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // dummy to get the client
    // Actually, we use the raw fetch if we want all
    console.log('LISTING_MODELS_ENABLED_FOR_KEY...');
    // We'll just try gemini-1.5-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent('ping');
    console.log('PING_SUCCESS: gemini-1.5-pro');
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}
list();
