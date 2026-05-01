const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const logger = require('../ipc/logger');
const execAsync = util.promisify(exec);

/**
 * Docker Manager
 * Gestiona el ciclo de vida del contenedor de base de datos PostgreSQL/Nexus.
 */
class DockerManager {
    constructor() {
        this.projectRoot = path.join(__dirname, '../../'); // Basado en /electron/services/
        this.containerName = 'devassist-postgres';
        this.composeFile = 'docker-compose.yml';
    }

    /**
     * Verifica si Docker está instalado y ejecutándose en el sistema.
     */
    async isDockerRunning() {
        try {
            await execAsync('docker info');
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Verifica el estado del contenedor de la base de datos.
     * Retorna: 'running', 'exited', 'missing' o 'docker_down'
     */
    async getContainerStatus() {
        if (!(await this.isDockerRunning())) return 'docker_down';
        
        try {
            const { stdout } = await execAsync(`docker inspect -f "{{.State.Status}}" ${this.containerName}`);
            return stdout.trim(); // running, exited, etc.
        } catch (err) {
            return 'missing';
        }
    }

    /**
     * Asegura que el servicio de base de datos esté activo.
     * Si no existe o está detenido, intenta levantarlo usando docker-compose.
     */
    async ensureDatabaseService() {
        logger.info(`[Docker:Check] Verificando estado de ${this.containerName}...`);
        
        const status = await this.getContainerStatus();
        
        if (status === 'running') {
            logger.info(`[Docker:OK] Base de datos activa y en ejecución.`);
            return { ok: true, status: 'running' };
        }

        if (status === 'docker_down') {
            logger.error('[Docker:FAIL] Docker no está iniciado en el sistema.');
            return { ok: false, error: 'DOCKER_NOT_RUNNING', message: 'Docker no está iniciado. Por favor, arranca Docker Desktop.' };
        }

        logger.info(`[Docker:Action] Levantando servicio de base de datos (Estado actual: ${status})...`);
        
        try {
            // Usamos -d para que no bloquee Electron
            const composeFilePath = path.join(this.projectRoot, this.composeFile);
            await execAsync(`docker compose -f "${composeFilePath}" up -d`);
            
            // Wait for healthcheck (máximo 30 segundos)
            logger.info('[Docker:Wait] Esperando a que PostgreSQL sea saludable...');
            let retries = 15;
            while (retries > 0) {
                const check = await this.getContainerStatus();
                if (check === 'running') {
                    // Verificación extra de salud del motor si es necesario (pg_isready ya está en docker-compose healthcheck)
                    logger.info('[Docker:DONE] Servicio restaurado con éxito.');
                    return { ok: true, status: 'recovered' };
                }
                await new Promise(r => setTimeout(r, 2000));
                retries--;
            }
            
            return { ok: false, error: 'TIMEOUT', message: 'La base de datos tardó demasiado en responder.' };
        } catch (err) {
            logger.error(`[Docker:CRITICAL] Fallo al intentar iniciar el servicio: ${err.message}`);
            return { ok: false, error: 'COMPOSE_ERROR', message: err.message };
        }
    }
}

module.exports = new DockerManager();
