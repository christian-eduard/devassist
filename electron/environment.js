const path = require('path');
const os = require('os');
const fs = require('fs');

/**
 * Entorno de DevAssist
 * Centraliza la resolución de rutas y parámetros para evitar el hardcoding.
 */
class Environment {
    constructor() {
        this.isDev = process.env.NODE_ENV === 'development' || !require('electron').app?.isPackaged;
        this.homeDir = os.homedir();
        this.dataDir = path.join(this.homeDir, '.devassist');
        
        // Cargar variables de entorno si existen (vía dotenv)
        require('dotenv').config();
    }

    /**
     * Obtiene la ruta al binario de OpenClaw.
     * Prioridad: ENV > Path estándar Homebrew > System PATH
     */
    getOpenClawPath() {
        if (process.env.OPENCLAW_PATH && fs.existsSync(process.env.OPENCLAW_PATH)) {
            return process.env.OPENCLAW_PATH;
        }

        // Típico en macOS (Homebrew Intel/Apple Silicon)
        const commonPaths = [
            path.join(this.homeDir, 'homebrew/bin/openclaw'),
            '/opt/homebrew/bin/openclaw',
            '/usr/local/bin/openclaw'
        ];

        for (const p of commonPaths) {
            if (fs.existsSync(p)) return p;
        }

        return 'openclaw'; // Fallback a PATH
    }

    /**
     * Obtiene los objetivos de notificación por defecto.
     */
    getNotificationTargets() {
        return {
            telegram: process.env.NOTIFY_TELEGRAM_ID || null,
            whatsapp: process.env.NOTIFY_WHATSAPP_ID || null
        };
    }

    /**
     * Obtiene el nombre del usuario principal para el sistema de prompts.
     */
    getUserName() {
        return process.env.USER_NAME || 'User';
    }

    /**
     * Obtiene la configuración de la base de datos PostgreSQL.
     */
    getDbConfig() {
        return {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '54325'),
            user: process.env.DB_USER || 'devassist_admin',
            password: process.env.DB_PASSWORD || 'devassist_secure_pass',
            database: process.env.DB_NAME || 'devassist_vault',
        };
    }
}

module.exports = new Environment();
