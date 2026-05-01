const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');
const { EventEmitter } = require('events');

class AppLogger extends EventEmitter {
    constructor() {
        super();
        this.DATA_DIR = path.join(os.homedir(), '.devassist');
        this.LOG_FILE = path.join(this.DATA_DIR, 'app.log');
        if (!fs.existsSync(this.DATA_DIR)) {
            fs.mkdirSync(this.DATA_DIR, { recursive: true });
        }
    }

    writeToLog(level, ...args) {
        const timestamp = new Date().toISOString();
        const msg = args.map(arg => {
            if (typeof arg === 'object') return util.inspect(arg, { depth: null, breakLength: Infinity });
            return String(arg);
        }).join(' ');

        const formattedMsg = `[${timestamp}] [${level}] ${msg}\n`;

        try {
            if (fs.existsSync(this.LOG_FILE)) {
                const stats = fs.statSync(this.LOG_FILE);
                if (stats.size > 50 * 1024 * 1024) {
                    const oldLog = this.LOG_FILE + '.old';
                    if (fs.existsSync(oldLog)) fs.unlinkSync(oldLog);
                    fs.renameSync(this.LOG_FILE, oldLog);
                }
            }
            fs.appendFileSync(this.LOG_FILE, formattedMsg);
        } catch (err) { }

        try {
            process.stdout.write(formattedMsg);
        } catch (err) { }

        this.emit('message', { level, msg, timestamp, formatted: formattedMsg });
    }

    info(...args) { this.writeToLog('INFO', ...args); }
    warn(...args) { this.writeToLog('WARN', ...args); }
    error(...args) { this.writeToLog('ERROR', ...args); }
    debug(...args) { this.writeToLog('DEBUG', ...args); }
}

const logger = new AppLogger();
module.exports = logger;
