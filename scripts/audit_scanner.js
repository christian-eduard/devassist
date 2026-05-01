const scanner = require('../electron/services/project_scanner');
const path = require('path');

async function testScan() {
    const projectPath = path.resolve(__dirname, '..');
    console.log(`Auditoría de Escáner en: ${projectPath}`);
    
    const result = await scanner.scan(projectPath, (progress) => {
        console.log(`[Progreso]: ${progress.percent}% - ${progress.step}`);
    });

    if (result.success) {
        console.log('\n--- RESULTADOS DEL ESCANEO ---');
        console.log(`Total Archivos Mapeados: ${result.stats.totalFiles}`);
        console.log(`Estadísticas de Lenguaje:`, result.stats.languages);
        console.log(`Estructura Generada: ${result.fileTree ? 'SÍ' : 'NO'}`);
        console.log(`Hijos en Raíz: ${result.fileTree?.children?.length || 0}`);
        
        // Verificar si hay archivos de código detectados
        const totalCodeFiles = Object.values(result.stats.languages).reduce((a, b) => a + b, 0);
        console.log(`Archivos de Código Relevantes: ${totalCodeFiles}`);
    } else {
        console.error('Fallo en el escaneo:', result.error);
    }
}

testScan();
