const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const schema = require('../electron/schema');
const environment = require('../electron/environment');
const { projects } = schema;

async function inspectProjects() {
  const pool = new Pool(environment.getDbConfig());
  const db = drizzle(pool, { schema });

  try {
    console.log('--- [INSPECTOR DE PROYECTOS DEVASSIST] ---');
    const allProjects = await db.select().from(projects);
    
    if (allProjects.length === 0) {
      console.log('No hay proyectos registrados en la base de datos Nexus.');
      return;
    }

    allProjects.forEach((p, index) => {
      console.log(`\n[PROYECTO ${index + 1}]: ${p.name}`);
      console.log(`- ID: ${p.id}`);
      console.log(`- Senda: ${p.path}`);
      console.log(`- Descripción: ${p.description || 'Sin descripción'}`);
      console.log(`- ADN Tecnológico (Stack): ${JSON.stringify(p.stack)}`);
      
      const stats = p.codeStats || {};
      console.log(`- Estadísticas de Código:`);
      console.log(`  * Total Archivos: ${stats.totalFiles || 0}`);
      console.log(`  * Lenguajes: ${JSON.stringify(stats.languages || {})}`);
      
      console.log(`- Estado de Telemetría:`);
      console.log(`  * Monitorización IA: ${p.monitoring === 1 ? 'ACTIVA (Vigilante ON)' : 'Inactiva'}`);
      console.log(`  * Último Acceso: ${p.lastOpened || 'Nunca'}`);
      
      console.log(`- Memoria Semántica:`);
      console.log(`  * Embedding Generado: ${p.projectEmbedding ? 'SÍ (Vectorizado)' : 'NO'}`);
      console.log(`  * Árbol de Archivos (Nodos): ${p.fileTree?.children?.length || 0} hijos en raíz`);
      
      console.log(`- Sincronización: ${p.updatedAt ? p.updatedAt.toISOString() : 'Desconocida'}`);
      console.log('------------------------------------------');
    });

  } catch (err) {
    console.error('Error inspeccionando la base de datos:', err.message);
  } finally {
    await pool.end();
  }
}

inspectProjects();
