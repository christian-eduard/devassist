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
    Clock,
    UploadCloud
} from 'lucide-react';
import './ProjectsModule.css';
import ProjectDetailView from './ProjectDetailView';
import './ProjectDetailView.css';

import { useProject } from '../../contexts/ProjectContext';

const ProjectsModule = ({ showToast }) => {
    const { 
        projects, 
        refreshProjects, 
        addProjectFolder, 
        removeProject, 
        updateProject,
        syncStatus, 
        loading,
        selectedProject,
        selectProject
    } = useProject();

    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingProject, setEditingProject] = useState(null);

    // ── Handlers ──
    const handleAddFolder = async () => {
        const folderPath = await window.electronAPI.projects.selectFolder();
        if (folderPath) {
            await addProjectFolder(folderPath);
            showToast('Sincronización iniciada', 'info');
        }
    };

    const handleOpenAntigravity = async (project) => {
        const result = await window.electronAPI.projects.openAntigravity(project.path);
        if (result.fallback) {
            showToast(result.message, 'info');
        }
        // Update local state and DB via context
        await updateProject(project.id, { lastOpened: Date.now() });
    };

    const handleDeleteProject = async (id) => {
        if (window.confirm('¿Eliminar este proyecto del panel? (No se borrarán los archivos físicos)')) {
            await removeProject(id);
            showToast('Proyecto eliminado', 'info');
        }
    };

    const handleUpdateNotes = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const notes = formData.get('notes');
        await window.electronAPI.projects.update(editingProject.id, { notes });
        setEditingProject(null);
        refreshProjects();
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
            await addProjectFolder(folderPath);
            showToast('Sincronización iniciada vía Drag & Drop', 'info');
        }
    };

    // ── Filter ──
    const filteredProjects = projects.filter(p => {
        const name = p.name || '';
        const path = p.path || '';
        const notes = p.notes || '';
        const matchesSearch =
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            path.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notes.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    if (selectedProject) {
        return (
            <ProjectDetailView 
                onBack={() => {
                    selectProject(null);
                    refreshProjects();
                }} 
                showToast={showToast} 
            />
        );
    }

    return (
        <div className="projects-module">
            <header className="module-header">
                <div className="header-top">
                    <h1>Proyectos</h1>
                    <p>Gestiona y monitoriza tus repositorios industriales</p>
                </div>

                <div className="header-actions-bar">
                    <div className="search-and-add">
                        <button className="btn-add-premium" onClick={handleAddFolder}>
                            <Plus size={20} />
                            <span>Añadir Carpeta</span>
                        </button>
                        
                        <div className="search-input-premium">
                            <Search className="search-icon-premium" size={20} />
                            <input
                                type="text"
                                placeholder="Filtrar por nombre, stack o notas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
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
                            <div key={project.id} className="project-card">
                                <div className="project-header">
                                    <div className="project-icon-wrapper" style={{ color: `#${project.color || '7c6af7'}` }}>
                                        {(project.name || 'P').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="project-actions">
                                        <button className="btn-icon-premium" title="Análisis Profundo" onClick={() => selectProject(project.id)}>
                                            <Zap size={16} />
                                        </button>
                                        <button className="btn-icon-premium" title="Editar Notas" onClick={() => setEditingProject(project)}>
                                            <Edit3 size={16} />
                                        </button>
                                        <button className="btn-icon-premium" title="Abrir Carpeta" onClick={() => window.electronAPI.projects.openFinder(project.path)}>
                                            <Folder size={16} />
                                        </button>
                                        <button className={`btn-icon-premium ${project.monitoring ? 'active-pulse' : ''}`} title="Monitorización IA" onClick={() => updateProject(project.id, { monitoring: !project.monitoring })}>
                                            <Cpu size={16} />
                                        </button>
                                        <button className="btn-icon-premium danger" title="Eliminar" onClick={() => handleDeleteProject(project.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="project-body" onClick={() => selectProject(project.id)} style={{ cursor: 'pointer' }}>
                                    <div className="project-title-area">
                                        <h3 className="project-name">{project.name}</h3>
                                        <code className="project-path-tag">{project.path}</code>
                                    </div>

                                    <div className="project-stack-viz">
                                        <p className="section-label-tiny">ADN TECNOLÓGICO</p>
                                        <div className="stack-container">
                                            {(project.stack || project.metadata?.stack || []).slice(0, 3).map(tech => (
                                                <span key={tech} className="badge-premium">{tech}</span>
                                            ))}
                                            {(!(project.stack || project.metadata?.stack) || (project.stack || project.metadata?.stack).length === 0) && (
                                                <span className="badge-premium">General Stack</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="project-stats-grid">
                                    <div className="stat-item" title="Archivos detectados">
                                        <Files size={14} className="stat-icon" />
                                        <div className="stat-content">
                                            <span className="stat-val">{project.codeStats?.totalFiles || project.metadata?.fileCount || 0}</span>
                                            <span className="stat-lbl">Archivos</span>
                                        </div>
                                    </div>
                                    <div className={`stat-item ${(project.codeStats?.hasGit || project.metadata?.hasGit) ? 'active' : ''}`} title="Git Repositorio">
                                        <GitBranch size={14} className="stat-icon" />
                                        <div className="stat-content">
                                            <span className="stat-val">{(project.codeStats?.hasGit || project.metadata?.hasGit) ? 'Git' : 'Local'}</span>
                                            <span className="stat-lbl">Control</span>
                                        </div>
                                    </div>
                                    <div className="stat-item" title="Última Apertura">
                                        <Clock size={14} className="stat-icon" />
                                        <div className="stat-content">
                                            <span className="stat-val">
                                                {project.lastOpened ? new Date(project.lastOpened).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '---'}
                                            </span>
                                            <span className="stat-lbl">Acceso</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="btn-premium-full" onClick={() => handleOpenAntigravity(project)}>
                                    <Zap size={16} />
                                    <span>Abrir en Antigravity</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Premium Drag Overlay ── */}
                {isAdding && (
                    <div className="drag-overlay">
                        <div className="drag-content">
                            <UploadCloud size={64} className="drag-icon-pulse" />
                            <h2>Suelta el proyecto industrial</h2>
                            <p>Antigravity iniciará la indexación semántica inmediata</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sync Progress Overlay (Fase 25) ── */}
            {syncStatus && (
                <div className="sync-overlay">
                    <div className="sync-card">
                        <div className="sync-icon">
                            <Zap size={32} className={syncStatus.percent < 100 ? 'pulse' : ''} />
                        </div>
                        <h3>Sincronizando Proyecto</h3>
                        <p className="sync-step">{syncStatus.step}</p>
                        
                        <div className="progress-container">
                            <div 
                                className="progress-bar" 
                                style={{ width: `${syncStatus.percent}%` }}
                            ></div>
                        </div>
                        <span className="sync-percent">{syncStatus.percent}%</span>
                        
                        {syncStatus.percent === 100 && (
                            <p className="sync-done">¡Todo listo!</p>
                        )}
                    </div>
                </div>
            )}

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
