import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Layout, 
    FileText, 
    Code, 
    Binary, 
    RefreshCw, 
    Folder, 
    ArrowLeft,
    TrendingUp,
    ShieldCheck,
    Archive,
    AlertTriangle
} from 'lucide-react';
import ReactFlow, { 
    Background, 
    Controls, 
    applyEdgeChanges, 
    applyNodeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Tree } from 'react-arborist';
import dagre from 'dagre';
import { useProject } from '../../contexts/ProjectContext';

// ── Auto-layout para React Flow (dagre) ──
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    if (!nodes || nodes.length === 0) return { nodes: [], edges: [] };
    
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: 150, height: 50 });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            targetPosition: direction === 'LR' ? 'left' : 'top',
            sourcePosition: direction === 'LR' ? 'right' : 'bottom',
            position: {
                x: nodeWithPosition.x - 75,
                y: nodeWithPosition.y - 25,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

/**
 * Valida que un objeto fileTree sea compatible con react-arborist.
 * Cada nodo debe tener una propiedad 'id' string no vacía.
 */
function isValidTree(tree) {
    if (!tree) return false;
    if (typeof tree.id !== 'string' || tree.id === '') return false;
    if (tree.children && !Array.isArray(tree.children)) return false;
    return true;
}

/**
 * ProjectDetailView — Vista de detalle de un proyecto seleccionado.
 * 
 * Responsabilidades:
 *   - Renderizar dashboard de estadísticas (LOC, archivos, lenguajes)
 *   - Renderizar árbol de archivos interactivo (react-arborist)
 *   - Renderizar grafo de arquitectura (React Flow)
 *   - Disparar escaneo profundo manual
 * 
 * NO hace:
 *   - No gestiona estado global (usa ProjectContext)
 *   - No persiste datos
 */
const ProjectDetailView = ({ onBack, showToast }) => {
    const { selectedProject: project, runDeepScan, loading } = useProject();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isScanning, setIsScanning] = useState(false);
    
    // React Flow State
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    // ── Extraer estadísticas de forma segura ──
    const stats = useMemo(() => {
        if (!project) return { loc: 0, totalFiles: 0, languages: {} };
        
        const cs = project.codeStats || project.metadata || {};
        return {
            loc: cs.totalLines || cs.loc || cs.linesOfCode || 0,
            totalFiles: cs.totalFiles || cs.fileCount || 0,
            languages: cs.languages || {},
        };
    }, [project]);

    // ── Extraer flowData de forma segura ──
    useEffect(() => {
        if (!project) return;
        
        const flowData = project.flowData 
            || project.fullContext?.flowData 
            || null;
        
        if (flowData && flowData.nodes && flowData.nodes.length > 0) {
            try {
                const { nodes: ln, edges: le } = getLayoutedElements(
                    [...flowData.nodes],
                    [...(flowData.edges || [])]
                );
                setNodes(ln);
                setEdges(le);
            } catch (err) {
                console.error('[ProjectDetailView] Error en layout de grafo:', err);
                setNodes([]);
                setEdges([]);
            }
        } else {
            setNodes([]);
            setEdges([]);
        }
    }, [project]);

    // ── Validar fileTree para react-arborist ──
    const validTree = useMemo(() => {
        if (!project?.fileTree) return null;
        if (isValidTree(project.fileTree)) return project.fileTree;
        
        // Si viene como array (edge case)
        if (Array.isArray(project.fileTree) && project.fileTree.length > 0) {
            return isValidTree(project.fileTree[0]) ? project.fileTree[0] : null;
        }
        
        return null;
    }, [project]);

    const handleDeepScan = async () => {
        if (isScanning || !project?.id) return;
        setIsScanning(true);
        try {
            const res = await runDeepScan(project.id);
            if (res?.success) {
                showToast('Análisis profundo completado', 'success');
            } else {
                showToast(res?.error || 'Fallo en análisis', 'error');
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsScanning(false);
        }
    };

    // ── Estados de carga/error ──
    if (loading && !project) return (
        <div className="project-detail-container">
            <div className="loading-state">
                <RefreshCw size={48} className="spin" />
                <p>Inicializando motor de análisis...</p>
            </div>
        </div>
    );

    if (!project) return (
        <div className="project-detail-container">
             <header className="detail-header">
                <button className="btn btn-sm btn-ghost" onClick={onBack}>
                    <ArrowLeft size={16} /> Volver a Proyectos
                </button>
            </header>
            <div className="error-state-box">
                <Archive size={48} />
                <h2>Sin proyecto seleccionado</h2>
                <p>No se puede mostrar el análisis sin cargar un repositorio.</p>
                <div className="error-actions">
                    <button className="btn" onClick={onBack}>Volver a la selección</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="project-detail-container">
            <header className="detail-header">
                <button className="btn btn-sm btn-ghost" onClick={onBack}>
                    <ArrowLeft size={16} /> Volver
                </button>
                <div className="header-main">
                    <h1>{project.name}</h1>
                    <span className="path-label">{project.path}</span>
                </div>
                <button 
                    className={`btn ${isScanning ? 'disabled' : 'btn-primary'}`} 
                    onClick={handleDeepScan}
                    disabled={isScanning}
                >
                    <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
                    {isScanning ? 'Analizando...' : 'Escaneo Profundo'}
                </button>
            </header>

            <nav className="detail-tabs">
                <button className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                    <Layout size={16} /> Dashboard
                </button>
                <button className={`tab ${activeTab === 'architecture' ? 'active' : ''}`} onClick={() => setActiveTab('architecture')}>
                    <TrendingUp size={16} /> Arquitectura
                </button>
                <button className={`tab ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>
                    <Code size={16} /> Estructura
                </button>
                <button className={`tab ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                    <FileText size={16} /> Inteligencia
                </button>
            </nav>

            <div className="detail-content scrollable">
                {/* ── TAB: Dashboard ── */}
                {activeTab === 'dashboard' && (
                    <div className="dashboard-grid">
                        <div className="stat-card loc-card">
                            <div className="stat-icon-bg"><Binary size={24} /></div>
                            <div className="stat-info">
                                <h3>Líneas de Código (LOC)</h3>
                                <div className="stat-value">{stats.loc.toLocaleString()}</div>
                                <span className="stat-label">Líneas analizadas</span>
                            </div>
                        </div>

                        <div className="stat-card files-card">
                            <div className="stat-icon-bg"><Archive size={24} /></div>
                            <div className="stat-info">
                                <h3>Inventario de Archivos</h3>
                                <div className="stat-value">{stats.totalFiles.toLocaleString()}</div>
                                <span className="stat-label">Archivos detectados</span>
                            </div>
                        </div>

                        <div className="stat-card wide-card lang-card">
                            <div className="card-header">
                                <Code size={20} />
                                <h3>ADN Tecnológico</h3>
                            </div>
                            <div className="lang-grid">
                                {Object.entries(stats.languages)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 15)
                                    .map(([lang, count]) => (
                                        <div key={lang} className="lang-pill">
                                            <span className="lang-name">{lang.toUpperCase()}</span>
                                            <span className="lang-count">{count}</span>
                                            <div className="lang-progress" style={{ width: `${Math.min(100, (count / Math.max(stats.totalFiles, 1)) * 100)}%` }}></div>
                                        </div>
                                    ))}
                                {Object.keys(stats.languages).length === 0 && (
                                    <div className="hint-box">
                                        <AlertTriangle size={16} />
                                        <p>Sin datos. Ejecute un escaneo profundo para obtener estadísticas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: Arquitectura (React Flow) ── */}
                {activeTab === 'architecture' && (
                    <div className="architecture-view flow-container">
                        <div className="view-header">
                            <h3>Grafo Modular de Dependencias</h3>
                        </div>
                        <div style={{ width: '100%', height: 'calc(100% - 60px)', background: '#0b0b0b', borderRadius: '12px', border: '1px solid #222' }}>
                            {nodes.length > 0 ? (
                                <ReactFlow
                                    nodes={nodes}
                                    edges={edges}
                                    onNodesChange={onNodesChange}
                                    onEdgesChange={onEdgesChange}
                                    fitView
                                >
                                    <Background color="#333" gap={20} />
                                    <Controls />
                                </ReactFlow>
                            ) : (
                                <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                                    <TrendingUp size={48} />
                                    <h3>Sin datos de arquitectura</h3>
                                    <p>Ejecute un escaneo profundo para generar el grafo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── TAB: Estructura de Archivos (react-arborist) ── */}
                {activeTab === 'code' && (
                    <div className="code-browser pro-browser">
                        <div className="browser-sidebar">
                            <div className="sidebar-header">Explorador de Archivos</div>
                            <div className="tree-wrapper">
                                {validTree ? (
                                    <Tree
                                        key={`tree-${project.id}-${validTree.children?.length || 0}`}
                                        data={[validTree]}
                                        openByDefault={false}
                                        width={320}
                                        height={600}
                                        indent={16}
                                        rowHeight={32}
                                    >
                                        {({ node, style, dragHandle }) => (
                                            <div 
                                                style={style} 
                                                ref={dragHandle} 
                                                className={`tree-node ${node.data.type || 'file'} ${node.isSelected ? 'selected' : ''}`}
                                            >
                                                {node.data.type === 'dir' 
                                                    ? <Folder size={14} className="icon folder" /> 
                                                    : <FileText size={14} className="icon file" />}
                                                <span className="name">{node.data.name}</span>
                                            </div>
                                        )}
                                    </Tree>
                                ) : (
                                    <div className="empty-tree-hint">
                                        <RefreshCw size={24} className={isScanning ? 'spin' : ''} />
                                        <p>Estructura no disponible. Ejecute un escaneo profundo.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="browser-main">
                            <div className="empty-state">
                                <Code size={48} />
                                <h3>Editor Estratégico</h3>
                                <p>Seleccione un archivo del árbol para explorar su contenido.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TAB: Inteligencia ── */}
                {activeTab === 'docs' && (
                    <div className="docs-view">
                        <div className="ai-suggestion-box">
                            <ShieldCheck size={20} />
                            <h4>Análisis de Salud de Arquitectura</h4>
                            <p>
                                El proyecto <strong>{project.name}</strong> contiene {stats.totalFiles.toLocaleString()} archivos 
                                y {stats.loc.toLocaleString()} líneas de código
                                {Object.keys(stats.languages).length > 0 && (
                                    <> utilizando {Object.keys(stats.languages).slice(0, 5).join(', ')}</>
                                )}.
                                {stats.loc === 0 && ' Ejecute un escaneo profundo para obtener métricas detalladas.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDetailView;
