const { execSync } = require('child_process');
const path = require('path');

console.log("🌀 [NEXUS RESTART] Iniciando reinicio de emergencia...");

try {
    console.log("🔪 Matando procesos Electron y React existentes...");
    // Intentar matar por puerto
    try { execSync('lsof -ti :3123 | xargs kill -9', { stdio: 'ignore' }); } catch(e) {}
    // Matar por nombre (macOS)
    try { execSync('pkill -f "Electron"', { stdio: 'ignore' }); } catch(e) {}
    try { execSync('pkill -f "react-scripts"', { stdio: 'ignore' }); } catch(e) {}
    
    console.log("✅ Limpieza completada.");
} catch (err) {
    console.warn("⚠️ Advertencia durante la limpieza:", err.message);
}

console.log("🚀 Levantando DevAssist con el nuevo código IPC...");
// Lanzamos npm start en el directorio raíz
process.chdir(path.join(__dirname, '..'));
require('child_process').spawn('npm', ['start'], {
    stdio: 'inherit',
    shell: true,
    detached: true
}).unref();

console.log("✨ DevAssist se está reiniciando en segundo plano.");
console.log("Favor de esperar a que la ventana se abra con los parches aplicados.");
process.exit(0);
