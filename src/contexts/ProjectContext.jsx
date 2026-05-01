import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ProjectContext = createContext();

/**
 * ProjectProvider — Estado global de proyectos (Fase 33 Refactor)
 * 
 * Responsabilidades:
 *   - Mantener lista de proyectos sincronizada con la BD
 *   - Gestionar el proyecto seleccionado activo
 *   - Proveer acciones (add, remove, update, deepScan) a toda la app
 *   - Escuchar eventos de scanner y refresco desde el proceso principal
 * 
 * NO hace:
 *   - No renderiza UI
 *   - No accede directamente a IPC (usa window.electronAPI)
 */
export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);
    const [loading, setLoading] = useState(false);

    // ── Cargar lista de proyectos desde la BD ──
    const refreshProjects = useCallback(async () => {
        if (!window.electronAPI?.projects) return;
        setLoading(true);
        try {
            const data = await window.electronAPI.projects.load();
            setProjects(data || []);

            // IMPORTANTE: NO reemplazamos selectedProject con datos de la lista.
            // La lista puede tener datos menos completos que el proyecto cargado
            // con getById (que incluye fileTree, flowData, etc.).
            // Solo actualizamos si el proyecto ya no existe en la lista.
            setSelectedProject(prev => {
                if (!prev) return null;
                const stillExists = (data || []).some(p => p.id === prev.id);
                if (!stillExists) return null;
                // Preservar el selectedProject actual que tiene datos completos
                return prev;
            });
        } catch (err) {
            console.error('[ProjectContext] Error al cargar:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Seleccionar proyecto (carga completa desde BD) ──
    const selectProject = useCallback(async (id) => {
        if (!id) {
            setSelectedProject(null);
            return;
        }
        try {
            setLoading(true);
            const p = await window.electronAPI.projects.getById(id);
            if (p) {
                setSelectedProject(p);
            } else {
                console.error('[ProjectContext] Proyecto no encontrado:', id);
                setSelectedProject(null);
            }
        } catch (err) {
            console.error('[ProjectContext] Error selection:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Añadir proyecto ──
    const addProjectFolder = useCallback(async (folderPath) => {
        if (!folderPath || !window.electronAPI?.projects) return;
        setSyncStatus({ step: 'Iniciando registro...', percent: 0 });
        try {
            const newProject = await window.electronAPI.projects.add(folderPath);
            await refreshProjects();
            return newProject;
        } catch (err) {
            console.error('[ProjectContext] Error adding:', err);
            setSyncStatus(null);
        }
    }, [refreshProjects]);

    // ── Escaneo profundo manual ──
    const runDeepScan = useCallback(async (id) => {
        if (!id) return { success: false, error: 'ID no proporcionado' };
        setLoading(true);
        setSyncStatus({ step: 'Iniciando escaneo profundo...', percent: 5 });
        try {
            const res = await window.electronAPI.projects.deepScan(id);
            if (res && res.success) {
                // Actualizar selectedProject con los datos completos del escaneo
                if (res.project) {
                    setSelectedProject(res.project);
                }
                await refreshProjects();
                setSyncStatus({ step: '¡Análisis Completado!', percent: 100 });
                setTimeout(() => setSyncStatus(null), 2000);
                return { success: true };
            }
            setSyncStatus(null);
            return { success: false, error: res?.error || 'Error desconocido' };
        } catch (err) {
            console.error('[ProjectContext] Deep scan error:', err);
            setSyncStatus(null);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [refreshProjects]);

    // ── Eliminar proyecto ──
    const removeProject = useCallback(async (id) => {
        await window.electronAPI.projects.remove(id);
        if (selectedProject?.id === id) setSelectedProject(null);
        await refreshProjects();
    }, [selectedProject, refreshProjects]);

    // ── Actualizar proyecto ──
    const updateProject = useCallback(async (id, data) => {
        if (!window.electronAPI?.projects) return;
        await window.electronAPI.projects.update(id, data);
        await refreshProjects();
    }, [refreshProjects]);

    // ── Suscripciones a eventos del proceso principal ──
    useEffect(() => {
        if (!window.electronAPI?.projects?.onScannerProgress) return;

        const unsubScanner = window.electronAPI.projects.onScannerProgress((data) => {
            setSyncStatus(data);
            if (data && data.percent === 100) {
                setTimeout(() => {
                    setSyncStatus(null);
                    refreshProjects();
                }, 2000);
            }
        });

        const unsubRefresh = window.electronAPI.projects.onRefresh
            ? window.electronAPI.projects.onRefresh(() => {
                refreshProjects();
                // Si hay un proyecto seleccionado, recargarlo para obtener datos frescos
                if (selectedProject?.id) {
                    selectProject(selectedProject.id);
                }
            })
            : null;

        return () => {
            if (typeof unsubScanner === 'function') unsubScanner();
            if (typeof unsubRefresh === 'function') unsubRefresh();
        };
    }, [refreshProjects, selectProject, selectedProject?.id]);

    // ── Carga inicial ──
    useEffect(() => {
        refreshProjects();
    }, [refreshProjects]);

    // ── Valor del contexto (memoizado) ──
    const value = useMemo(() => ({
        projects,
        selectedProject,
        selectProject,
        refreshProjects,
        addProjectFolder,
        removeProject,
        updateProject,
        runDeepScan,
        syncStatus,
        loading,
    }), [projects, selectedProject, selectProject, refreshProjects, addProjectFolder, removeProject, updateProject, runDeepScan, syncStatus, loading]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject debe usarse dentro de un ProjectProvider');
    }
    return context;
};
