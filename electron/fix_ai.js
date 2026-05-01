const { loadConfig, saveConfig } = require('./ipc/config');

async function fix() {
  try {
    const config = await loadConfig();
    const forcedKey = 'AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM'; // Key from OpenClaw
    
    config.gemini = config.gemini || {};
    config.gemini.apiKey = forcedKey;
    config.gemini.model = 'gemini-1.5-flash';
    
    config.apiKeys = config.apiKeys || {};
    config.apiKeys.gemini = forcedKey;

    await saveConfig(config);
    console.log('AI_KEY_PERSISTED_IN_DB');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit();
  }
}

fix();
