const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { fdir } = require('fdir');
const logger = require('../ipc/logger');

/**
 * ProjectScanner — Motor de Telemetría Industrial (Fase 33 Refactor)
 * 
 * Responsabilidades:
 *   - Escaneo recursivo ultrarrápido con fdir + exclusión nativa
 *   - Conteo real de LOC por extensión de código
 *   - Generación de FileTree compatible con react-arborist
 *   - Generación de FlowData compatible con React Flow
 * 
 * NO hace:
 *   - No persiste datos (eso es responsabilidad del IPC handler)
 *   - No gestiona UI ni estado
 */
class ProjectScanner {
    constructor() {
        // Directorios a excluir COMPLETAMENTE del crawl (fdir.exclude)
        this.excludeDirs = new Set([
            'node_modules', '.git', '.vscode', 'dist', 'build',
            '__pycache__', '.next', '.DS_Store', 'target', 'vendor',
            '.cache', '.vite', '.vite-temp', '.turbo', '.svn',
            '.idea', '.hg', 'coverage', '.nyc_output', '.parcel-cache',
            'bower_components', '.gradle', '.mvn', 'Pods',
            '.angular', '.output', '.nuxt'
        ]);

        // Extensiones de código fuente para análisis
        this.codeExtensions = new Set([
            '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.java',
            '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.rs', '.swift',
            '.css', '.scss', '.sass', '.html', '.json', '.yml', '.yaml',
            '.md', '.sql', '.vue', '.svelte', '.kt', '.dart', '.lua',
            '.sh', '.bash', '.zsh', '.toml', '.xml', '.graphql'
        ]);

        // Límites de seguridad para proteger la BD y la UI
        this.MAX_TREE_DEPTH = 8;       // Profundidad máxima del árbol de archivos
        this.MAX_TREE_NODES = 5000;     // Máximo de nodos en el fileTree
        this.MAX_LOC_FILE_SIZE = 512000; // 512KB máx por archivo para conteo de LOC
        this.FLOW_GRAPH_DEPTH = 2;      // Profundidad del grafo de arquitectura
    }

    /**
     * Determina si un nombre de directorio debe ser excluido
     */
    _isExcluded(dirName) {
        // Coincidencia exacta
        if (this.excludeDirs.has(dirName)) return true;
        
        // Excluir variantes de node_modules (node_modules_broken, node_modules_cache, etc.)
        if (dirName.startsWith('node_modules')) return true;
        
        // Excluir directorios de datos de BD (postgres_data, mysql_data, etc.)  
        if (dirName.endsWith('_data') && dirName.includes('postgres')) return true;
        if (dirName.endsWith('_data') && dirName.includes('mysql')) return true;
        if (dirName.endsWith('_data') && dirName.includes('redis')) return true;
        if (dirName === 'data' || dirName === 'tmp' || dirName === 'temp') return true;
        
        // Excluir directorios ocultos (empiezan con .)
        // EXCEPTO: .github, .husky, .env* (que son archivos, no dirs)
        if (dirName.startsWith('.') && dirName.length > 1) {
            const allowedHiddenDirs = new Set(['.github', '.husky', '.storybook']);
            if (!allowedHiddenDirs.has(dirName)) return true;
        }
        
        // Excluir directorios de salida/build comunes
        if (dirName === 'out' || dirName === 'release' || dirName === 'artifacts') return true;
        
        return false;
    }

    /**
     * Motor principal de escaneo
     * @param {string} projectPath - Ruta absoluta al proyecto
     * @param {function} onProgress - Callback de progreso { step, percent }
     * @returns {{ success, stats, fileTree, flowData, mermaidStructure }}
     */
    async scan(projectPath, onProgress = () => {}) {
        logger.info(`[Scanner] Iniciando escaneo en: ${projectPath}`);
        onProgress({ step: 'Iniciando escaneo...', percent: 5 });

        const stats = {
            totalFiles: 0,
            totalLines: 0,
            languages: {},
        };

        try {
            // ── Fase 1: Crawl ultrarrápido con exclusión nativa ──
            const api = new fdir()
                .withFullPaths()
                .withErrors()
                .exclude((dirName) => this._isExcluded(dirName))
                .crawl(projectPath);

            const allPaths = await api.withPromise();

            stats.totalFiles = allPaths.length;
            logger.info(`[Scanner] Archivos detectados (post-filtro): ${allPaths.length}`);

            // ── Fase 2: Conteo de LOC Industrial ──
            onProgress({ step: `Analizando ${allPaths.length} archivos...`, percent: 30 });

            let totalLines = 0;
            const CHUNK_SIZE = 80;

            for (let i = 0; i < allPaths.length; i += CHUNK_SIZE) {
                const chunk = allPaths.slice(i, i + CHUNK_SIZE);
                const results = await Promise.allSettled(chunk.map(async (fp) => {
                    const ext = path.extname(fp).toLowerCase();
                    if (!this.codeExtensions.has(ext)) return 0;

                    try {
                        const fileStat = await fs.stat(fp);
                        if (fileStat.size > this.MAX_LOC_FILE_SIZE) return 0;

                        const content = await fs.readFile(fp, 'utf-8');
                        return content.split('\n').length;
                    } catch {
                        return 0; // Binarios, permisos, etc.
                    }
                }));

                for (const r of results) {
                    if (r.status === 'fulfilled') totalLines += r.value;
                }

                const progress = 30 + Math.floor((i / allPaths.length) * 40);
                onProgress({ step: 'Mapeando ADN tecnológico...', percent: Math.min(progress, 70) });
            }
            stats.totalLines = totalLines;

            // ── Fase 3: Construcción del FileTree ──
            onProgress({ step: 'Construyendo árbol virtual...', percent: 75 });
            const fileTree = this._buildArboristTree(projectPath, allPaths, stats);

            // ── Fase 4: Generación del grafo de arquitectura ──
            onProgress({ step: 'Generando grafo de arquitectura...', percent: 85 });
            const flowData = this._generateFlowData(fileTree);

            onProgress({ step: 'Análisis completo', percent: 100 });
            
            logger.info(`[Scanner] Resultados: ${stats.totalFiles} archivos, ${stats.totalLines} LOC, ${Object.keys(stats.languages).length} lenguajes`);

            return {
                success: true,
                stats,
                fileTree,
                flowData,
                mermaidStructure: 'REACT_FLOW_GRAPH'
            };
        } catch (err) {
            logger.error(`[Scanner] Error crítico: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    /**
     * Construye un árbol de archivos compatible con react-arborist
     * Cada nodo: { id: string, name: string, type: 'dir'|'file', children?: [] }
     */
    _buildArboristTree(rootPath, allPaths, stats) {
        const rootName = path.basename(rootPath);
        const root = { id: 'root', name: rootName, children: [], type: 'dir' };
        const map = { '': root };
        let nodeCount = 0;

        for (const fullPath of allPaths) {
            if (nodeCount >= this.MAX_TREE_NODES) {
                logger.warn(`[Scanner] Límite de nodos alcanzado (${this.MAX_TREE_NODES}). Árbol truncado.`);
                break;
            }

            const relPath = path.relative(rootPath, fullPath);
            const segments = relPath.split(path.sep);

            // Protección de profundidad
            if (segments.length > this.MAX_TREE_DEPTH) continue;

            // Segunda línea de defensa: verificar que ningún segmento sea un dir excluido
            if (segments.some(s => this.excludeDirs.has(s))) continue;

            let currentPath = '';
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                const parentPath = currentPath;
                currentPath = currentPath ? `${currentPath}/${seg}` : seg;

                if (!map[currentPath]) {
                    const isDir = i < segments.length - 1;
                    const nodeId = `node-${currentPath}`;
                    const node = { id: nodeId, name: seg, type: isDir ? 'dir' : 'file' };
                    if (isDir) node.children = [];

                    const parentNode = map[parentPath];
                    if (parentNode && parentNode.children) {
                        parentNode.children.push(node);
                        map[currentPath] = node;
                        nodeCount++;
                    }

                    // Contabilizar lenguaje por extensión
                    if (!isDir) {
                        const ext = path.extname(seg).toLowerCase();
                        if (this.codeExtensions.has(ext)) {
                            const lang = ext.substring(1);
                            stats.languages[lang] = (stats.languages[lang] || 0) + 1;
                        }
                    }
                }
            }
        }

        // Ordenar: directorios primero, luego archivos, ambos alfabéticamente
        this._sortTree(root);
        
        return root;
    }

    /**
     * Ordena recursivamente el árbol: carpetas primero, luego archivos
     */
    _sortTree(node) {
        if (!node.children) return;
        node.children.sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.name.localeCompare(b.name);
        });
        node.children.forEach(child => this._sortTree(child));
    }

    /**
     * Genera nodos y aristas para React Flow (solo primeros 2 niveles)
     */
    _generateFlowData(tree) {
        const nodes = [];
        const edges = [];
        let xOffset = 0;

        const traverse = (node, parentId = null, depth = 0, xBase = 0) => {
            if (depth > this.FLOW_GRAPH_DEPTH) return;

            const nodeId = node.id;
            const x = xBase;
            const y = depth * 120;

            nodes.push({
                id: nodeId,
                data: { label: node.name, type: node.type },
                position: { x, y },
                type: node.type === 'dir' ? 'input' : 'default',
                style: {
                    background: node.type === 'dir' ? '#1a1a2e' : '#16213e',
                    color: '#e0e0e0',
                    border: '1px solid #333',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px'
                }
            });

            if (parentId) {
                edges.push({
                    id: `e-${parentId}-${nodeId}`,
                    source: parentId,
                    target: nodeId,
                    style: { stroke: '#444' },
                    animated: depth === 1
                });
            }

            if (node.children && depth < this.FLOW_GRAPH_DEPTH) {
                const childSpacing = 180;
                const totalWidth = (node.children.length - 1) * childSpacing;
                let childX = xBase - totalWidth / 2;

                // Solo mostrar dirs en el grafo principal (limitar ruido)
                const dirChildren = node.children.filter(c => c.type === 'dir');
                const childrenToShow = dirChildren.length > 0 ? dirChildren.slice(0, 12) : node.children.slice(0, 8);

                childrenToShow.forEach((child, idx) => {
                    traverse(child, nodeId, depth + 1, childX + idx * childSpacing);
                });
            }
        };

        traverse(tree);
        return { nodes, edges };
    }
}

module.exports = new ProjectScanner();
