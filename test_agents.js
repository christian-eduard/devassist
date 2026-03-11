const { isAgentActive } = require('./electron/ipc/agents_manager');
const path = require('path');
const os = require('os');
const DATA_DIR = path.join(os.homedir(), '.devassist');

console.log('DATA_DIR:', DATA_DIR);
console.log('isAgentActive (video_pipeline):', isAgentActive(DATA_DIR, 'video_pipeline'));
