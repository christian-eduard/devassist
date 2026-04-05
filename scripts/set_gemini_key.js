const { loadConfig, saveConfig } = require('../electron/ipc/config');
const db = require('../electron/db_nexus');

async function setGeminiKey() {
    console.log("Updating Gemini Key...");
    const config = await loadConfig();
    
    if (!config.gemini) config.gemini = {};
    config.gemini.apiKey = "AIzaSyBje27YicmFjOx3JYjTeHXmlIG-Xw7PShM";

    await db.saveSetting('app_config', config);
    console.log("Gemini Key Updated!");
    process.exit(0);
}

setGeminiKey();
