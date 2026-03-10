const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const DATA_DIR = path.join(os.homedir(), '.devassist');
const LOG_FILE = path.join(DATA_DIR, 'app.log');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function writeToLog(level, ...args) {
    const timestamp = new Date().toISOString();
    const msg = args.map(arg => {
        if (typeof arg === 'object') return util.inspect(arg, { depth: null });
        return String(arg);
    }).join(' ');

    const formattedMsg = `[${timestamp}] [${level}] ${msg}\n`;

    try {
        fs.appendFileSync(LOG_FILE, formattedMsg);
    } catch (err) { }

    try {
        process.stdout.write(formattedMsg);
    } catch (err) {
        if (err.code !== 'EPIPE') {
            // Silence EPIPE, report others if we could
        }
    }
}

const logger = {
    info: (...args) => writeToLog('INFO', ...args),
    warn: (...args) => writeToLog('WARN', ...args),
    error: (...args) => writeToLog('ERROR', ...args),
    debug: (...args) => writeToLog('DEBUG', ...args),
};

module.exports = logger;
