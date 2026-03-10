import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    FolderPlus,
    Edit3,
    Folder,
    Cpu,
    Trash2,
    Zap,
    Files,
    GitBranch,
    Clock
} from 'lucide-react';
import './ProjectsModule.css';

const ProjectsModule = ({ showToast }) => {
    const [projects, setProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // ── Load projects ──
    const loadProjects = useCallback(async () => {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.projects.load();
        setProjects(data);
    }, []);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    // ── Handlers ──
    const handleAddFolder = async () => {
        const folderPath = await window.electronAPI.projects.selectFolder();
        if (folderPath) {
            await window.electronAPI.projects.add(folderPath);
            loadProjects();
            showToast('Proyecto añadido correctamente', 'success');
        }
    };

    const handleOpenAntigravity = async (project) => {
        const result = await window.electronAPI.projects.openAntigravity(project.path);
        if (result.fallback) {
            showToast(result.message, 'info');
        }
        // Update lastOpened
        await window.electronAPI.projects.update(project.id, { lastOpened: new Date().toISOString() });
        loadProjects();
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm('¿Eliminar este proyecto del panel? (No se borrarán los archivos físicos)')) {
            await window.electronAPI.projects.remove(id);
            loadProjects();
            showToast('Proyecto eliminado', 'info');
        }
    };

    const handleUpdateNotes = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const notes = formData.get('notes');
        await window.electronAPI.projects.update(editingProject.id, { notes });
        setEditingProject(null);
        loadProjects();
        showToast('Notas actualizadas', 'success');
    };

    // ── Drag & Drop ──
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsAdding(true);
    };

    const handleDragLeave = () => {
        setIsAdding(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsAdding(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const folderPath = files[0].path;
            // Note: in Electron, files[0].path is the absolute path
            await window.electronAPI.projects.add(folderPath);
            loadProjects();
            showToast('Proyecto añadido vía Drag & Drop', 'success');
        }
    };

    // ── Filter ──
    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="projects-module">
            <header className="module-header">
                <div className="header-top">
                    <div>
                        <h1>Proyectos</h1>
                        <p>Gestiona tus repositorios y ábrelos en Antigravity</p>
                    </div>
                    <button className="btn btn-primary" onClick={handleAddFolder}>
                        <Plus size={16} /> Añadir carpeta
                    </button>
                </div>

                <div className="header-filters">
                    <div className="search-input">
                        <Search className="search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar proyecto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <div
                className={`module-body ${isAdding ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {filteredProjects.length === 0 ? (
                    <div className="empty-state">
                        <FolderPlus size={48} />
                        <p>{searchQuery ? 'No se encontraron proyectos' : 'No hay proyectos añadidos'}</p>
                        <button className="btn btn-sm" onClick={handleAddFolder}>
                            Seleccionar carpeta o arrastra aquí
                        </button>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {filteredProjects.map((project) => (
                            <div key={project.id} className="project-card card" style={{ '--accent-local': `#${project.color}` }}>
                                <div className="project-header">
                                    <div className="project-icon" style={{ backgroundColor: `#${project.color}20`, color: `#${project.color}` }}>
                                        {project.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="project-actions">
                                        <button className="btn-icon-tiny" title="Editar notas" onClick={() => setEditingProject(project)}><Edit3 size={14} /></button>
                                        <button className="btn-icon-tiny" title="Abrir en Finder" onClick={() => window.electronAPI.projects.openFinder(project.path)}><Folder size={14} /></button>
                                        <button className={`btn-icon-tiny ${project.monitoring ? 'active-pulse' : ''}`} title="Monitorizar con Clawbot" onClick={() => window.electronAPI.projects.update(project.id, { monitoring: !project.monitoring })}><Cpu size={14} /></button>
                                        <button className="btn-icon-tiny btn-danger-tiny" title="Eliminar" onClick={() => handleDeleteProject(project.id)}><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <h3 className="project-title">{project.name}</h3>
                                <p className="project-path" title={project.path}>{project.path}</p>

                                <div className="project-meta-row">
                                    <div className="stack-badges">
                                        {project.metadata?.stack?.map(tech => (
                                            <span key={tech} className="stack-badge">{tech}</span>
                                        ))}
                                        {(!project.metadata?.stack || project.metadata.stack.length === 0) && (
                                            <span className="stack-badge">General</span>
                                        )}
                                    </div>
                                    <div className="project-stats">
                                        <div className="stat-item" title="Número de archivos">
                                            <Files size={12} />
                                            {project.metadata?.fileCount || 0}
                                        </div>
                                        {project.metadata?.hasGit && (
                                            <div className="stat-item" title="Repositorio Git detectado">
                                                <GitBranch size={12} />
                                                <span className="git-status active"></span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {project.notes ? (
                                    <div className="project-notes">
                                        {project.notes}
                                    </div>
                                ) : (
                                    <div className="project-notes" style={{ opacity: 0.3, fontStyle: 'italic' }}>
                                        Sin notas adicionales...
                                    </div>
                                )}

                                <div className="project-footer">
                                    <div className="last-opened">
                                        <Clock size={10} />
                                        <span>{project.lastOpened ? `Abierto ${new Date(project.lastOpened).toLocaleDateString()}` : 'Nunca abierto'}</span>
                                    </div>
                                    <button className="btn btn-accent btn-full" onClick={() => handleOpenAntigravity(project)}>
                                        <Zap size={14} /> Antigravity
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Edit Notes Modal ── */}
            {editingProject && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="modal-title">Notas de {editingProject.name}</h2>
                        <form onSubmit={handleUpdateNotes}>
                            <textarea
                                name="notes"
                                className="textarea"
                                defaultValue={editingProject.notes}
                                placeholder="Escribe notas sobre el stack, tareas pendientes..."
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn" onClick={() => setEditingProject(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsModule;
