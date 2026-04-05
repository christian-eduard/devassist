const fs = require('fs');
const path = require('path');
const os = require('os');

const devAssistConfigPath = path.join(os.homedir(), '.devassist', 'config.json');
let config = {};
if (fs.existsSync(devAssistConfigPath)) {
    try { config = JSON.parse(fs.readFileSync(devAssistConfigPath, 'utf8')); } catch(e){}
}

config.clawbot_telegramEnabled = true;
config.clawbot_telegramToken = "8567646326:AAHPxz-984nn9Mc1I2-6YADTW4ra4BJ0euk";
config.clawbot_whatsappEnabled = true;

fs.writeFileSync(devAssistConfigPath, JSON.stringify(config, null, 2));
console.log('Migración de OpenClaw completada en DevAssist config.');
