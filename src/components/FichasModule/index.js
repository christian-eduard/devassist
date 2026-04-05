import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search,
    Database,
    Film,
    Lightbulb,
    Settings,
    Rocket,
    Check,
    Plus,
    Trash2,
    ExternalLink,
    FileText,
    ExternalLink as LinkIcon,
    X,
    Play,
    Globe,
    Sparkles,
    Book,
    AlertCircle,
    Github
} from 'lucide-react';
import './FichasModule.css';

const FichasModule = ({ showToast, addNotification }) => {
    const [fichas, setFichas] = useState([]);
    const [selectedFicha, setSelectedFicha] = useState(null);
    const [previewFicha, setPreviewFicha] = useState(null); // Nuevo estado para previsualización
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const [automationStatus, setAutomationStatus] = useState(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [processLogs, setProcessLogs] = useState([]);
    const [showProcessConsole, setShowProcessConsole] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [researchResult, setResearchResult] = useState(null);
    const [isResearchingPoint, setIsResearchingPoint] = useState(false);
    const activeProcessId = useRef(null);

    useEffect(() => {
        if (window.electronAPI?.fichas?.onProcessProgress) {
            const unsub = window.electronAPI.fichas.onProcessProgress((msg) => {
                setProcessLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-20));
                showToast(msg, msg.startsWith('Error') ? 'error' : 'info');
                
                if (activeProcessId.current && addNotification) {
                    addNotification({
                        id: activeProcessId.current,
                        title: 'Procesando Enlace',
                        message: msg,
                        type: msg.startsWith('Error') ? 'error' : 'system'
                    });
                }
            });
            return unsub;
        }
    }, [showToast, addNotification]);

    // ── Load fichas ──
    const loadFichas = useCallback(async () => {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.fichas.load();
        // Sort by date
        const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setFichas(sorted);
        if (sorted.length > 0 && !selectedFicha) {
            setSelectedFicha(sorted[0]);
        }
    }, [selectedFicha]);

    useEffect(() => {
        loadFichas();

        // ── Listen for new videos from watcher/system ──
        const unsubscribe = window.electronAPI.fichas.onNewVideoDetected((data) => {
            showToast(`Nuevo video detectado: ${data.fileName}`, 'info');
        });


        return () => {
            unsubscribe();
        };
    }, [loadFichas, showToast]);

    // ── Handlers ──
    const handleUploadVideo = async () => {
        const videoPath = await window.electronAPI.fichas.selectVideo();
        if (!videoPath) return;

        setIsAnalyzing(true);
        showToast('Iniciando análisis con Gemini...', 'info');
        if (addNotification) {
            addNotification({
                title: 'Analizando Video Local',
                message: `Extrayendo conocimiento con Gemini...`,
                type: 'info',
                module: 'fichas'
            });
        }

        try {
            const id = Date.now().toString();
            const copyResult = await window.electronAPI.fichas.copyVideo(videoPath, id);

            if (!copyResult.ok) throw new Error(copyResult.error);

            const analysisResult = await window.electronAPI.fichas.analyzeGemini(copyResult.videoName);

            if (!analysisResult.ok) throw new Error(analysisResult.error);

            const newFicha = {
                id,
                ...analysisResult.data,
                fuente: 'Subida manual',
                videoName: copyResult.videoName,
                videoPath: copyResult.destPath,
                createdAt: new Date().toISOString(),
                revisada: false,
                color: '7c6af7',
            };

            await window.electronAPI.fichas.save(newFicha);
            await loadFichas();
            setSelectedFicha(newFicha);
            showToast('Análisis completado', 'success');
            if (addNotification) {
                addNotification({
                    title: 'Ficha Creada',
                    message: `${newFicha.titulo} guardada en el vault.`,
                    type: 'success',
                    module: 'fichas'
                });
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
            if (addNotification) {
                addNotification({
                    title: 'Error de Análisis',
                    message: err.message,
                    type: 'error',
                    module: 'fichas'
                });
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUrlProcess = async (url) => {
        if (!url) return;
        const isUrl = url.trim().startsWith('http') || url.includes('.');
        if (!isUrl) {
            showToast('¡Vaya! Parece que nos hemos equivocado con el enlace.', 'error');
            setProcessLogs(prev => [...prev, 'ERROR: El texto introducido no es un enlace válido.']);
            addNotification({
                title: 'Error de entrada',
                message: 'Para que funcione, copia el enlace directamente de la barra de direcciones o del botón "Compartir" de TikTok/YouTube.',
                type: 'error'
            });
            return;
        }
        
        setShowProcessConsole(true);
        setProcessLogs([`[${new Date().toLocaleTimeString()}] Iniciando pipeline para: ${url}`]);
        setIsAnalyzing(true);
        const processNotificationId = `proc-${Date.now()}`;
        activeProcessId.current = processNotificationId;
        
        showToast('Iniciando proceso de enlace...', 'info');
        
        if (addNotification) {
            addNotification({
                id: processNotificationId,
                title: 'Procesando Enlace',
                message: `Descargando: ${url.substring(0, 40)}...`,
                type: 'system',
                module: 'fichas'
            });
        }

        try {
            const processResult = await window.electronAPI.fichas.processTikTokUrl(url);

            if (!processResult.ok) throw new Error(processResult.error);

            // Backend already saves the ficha to the database
            await loadFichas();
            // Try to find the newly created one to select it
            const createdFicha = processResult.id ? processResult : processResult.ficha || processResult;
            setSelectedFicha(createdFicha);
            
            showToast('Análisis de enlace completado', 'success');
            if (addNotification) {
                setTimeout(() => {
                    addNotification({
                        id: `success-${Date.now()}`,
                        title: 'Análisis Finalizado',
                        message: `Ficha generada: ${createdFicha.title || createdFicha.titulo || 'Nueva Ficha'}`,
                        type: 'success',
                        module: 'fichas'
                    });
                }, 500);
            }
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
            if (addNotification) {
                addNotification({
                    id: processNotificationId,
                    title: 'Error de Procesamiento',
                    message: err.message,
                    type: 'error',
                    module: 'fichas'
                });
            }
        } finally {
            setIsAnalyzing(false);
            activeProcessId.current = null;
        }
    };

    const handleProjectSuggestions = async () => {
        if (!selectedFicha) return;
        showToast('Buscando proyectos relacionados...', 'info');

        try {
            // Get all projects to send names to Gemini
            const projects = await window.electronAPI.projects.load();
            const projectNames = projects.map(p => p.name).join(', ');

            const prompt = `Dada esta ficha técnica: "${selectedFicha.titulo} - ${selectedFicha.concepto}".
      Y esta lista de proyectos: [${projectNames}].
      Indica cuáles 2-3 proyectos son más relevantes. Responde solo con un array JSON de nombres de proyectos: ["p1", "p2"].`;

            // Use Gemini to suggest (reusing analyze-gemini logic or similar)
            // For Sprint 2, we just call Gemini with a custom prompt via a new IPC or reusing
            const result = await window.electronAPI.ai.testGemini(); // Placeholder or real call
            // In a real scenario, I'd have a specific IPC for "ai:prompt"

            showToast('Sugerencias cargadas', 'success');
        } catch (err) {
            showToast('Error al sugerir proyectos', 'error');
        }
    };

    const handleDeleteFicha = async (id) => {
        if (window.confirm('¿Eliminar esta ficha de conocimiento?')) {
            await window.electronAPI.fichas.delete(id);
            loadFichas();
            if (selectedFicha?.id === id) {
                setSelectedFicha(null);
            }
            showToast('Ficha eliminada', 'info');
        }
    };

    const toggleRevisada = async (ficha) => {
        const updated = { ...ficha, revisada: !ficha.revisada };
        await window.electronAPI.fichas.save(updated);
        loadFichas();
        setSelectedFicha(updated);
    };

    const [isGeneratingResearch, setIsGeneratingResearch] = useState(false);

    const handleGenerateDeepResearch = async () => {
        if (!selectedFicha) return;
        setIsGeneratingResearch(true);
        showToast('Iniciando Inteligencia Artificial (Deep Research)...', 'info');
        try {
            const result = await window.electronAPI.fichas.generateDeepResearch(selectedFicha.id);
            if (result.ok) {
                showToast('Investigación experta generada y guardada.', 'success');
                loadFichas();
                setSelectedFicha({ ...selectedFicha, investigacion_profunda: result.investigacion_profunda });
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            showToast('Error al investigar: ' + err.message, 'error');
        } finally {
            setIsGeneratingResearch(false);
        }
    };

    const handleResearchPoint = async (point) => {
        // Si ya tiene resultado, lo mostramos directamente
        if (point.resultado) {
            setResearchResult({
                tema: point.tema,
                pregunta: point.pregunta,
                content: point.resultado
            });
            return;
        }

        setIsResearchingPoint(true);
        showToast(`Investigando: ${point.tema}...`, 'info');
        try {
            const response = await window.electronAPI.fichas.researchPoint(point);
            if (response.ok) {
                // Guardamos el resultado en la ficha de forma persistente
                const updatedPoints = selectedFicha.puntos_exploracion.map(p =>
                    p.tema === point.tema ? { ...p, resultado: response.result } : p
                );
                const updatedFicha = { ...selectedFicha, puntos_exploracion: updatedPoints };

                await window.electronAPI.fichas.save(updatedFicha);
                setSelectedFicha(updatedFicha);
                // No llamamos a loadFichas() inmediatamente para no perder el scroll o estado local innecesariamente
                // pero sí actualizamos la lista en segundo plano si es necesario
                const allData = await window.electronAPI.fichas.load();
                setFichas(allData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

                setResearchResult({
                    tema: point.tema,
                    pregunta: point.pregunta,
                    content: response.result
                });
                showToast('Investigación guardada en el vault', 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showToast('Error en investigación: ' + err.message, 'error');
        } finally {
            setIsResearchingPoint(false);
        }
    };

    // ── Filters ──
    const allTags = React.useMemo(() => {
        const counts = {};
        fichas.forEach(f => {
            (f.tags || []).forEach(t => {
                counts[t] = (counts[t] || 0) + 1;
            });
        });
        return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    }, [fichas]);

    const filteredFichas = fichas.filter(f => {
        const title = f.titulo || f.title || '';
        const concept = f.concepto || f.concept || '';
        const tags = Array.isArray(f.tags) ? f.tags : [];

        const matchesSearch =
            title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesTag = !activeTag || tags.includes(activeTag);

        return matchesSearch && matchesTag;
    });

    const fichasConVideo = fichas.filter(f => f.videoName);

    return (
        <div className="fichas-module">
            {/* ── Research Result Modal ── */}
            {researchResult && (
                <div className="video-modal-overlay">
                    <div className="video-modal-content" style={{ maxHeight: '80vh', maxWidth: '800px' }}>
                        <header className="modal-header">
                            <div>
                                <span className="tag-source" style={{ background: 'var(--accent-2)', marginBottom: '4px', display: 'inline-block' }}>Investigación Deep</span>
                                <h2 style={{ fontSize: '1.2rem' }}>{researchResult.tema}</h2>
                            </div>
                            <button className="close-modal" onClick={() => setResearchResult(null)}><X size={32} /></button>
                        </header>
                        <div className="tab-content" style={{ padding: '30px', overflowY: 'auto' }}>
                            <p style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginBottom: '20px', fontStyle: 'italic' }}>Pregunta: {researchResult.pregunta}</p>
                            <div className="research-content" style={{ fontSize: '0.95rem', lineHeight: '1.7' }}>
                                {researchResult.content.split('\n').map((line, i) => (
                                    <p key={i} style={{
                                        fontWeight: line.startsWith('**') ? '800' : '400',
                                        color: line.startsWith('**') ? 'var(--accent)' : 'inherit',
                                        marginTop: line.startsWith('**') ? '15px' : '0'
                                    }}>
                                        {line.replace(/\*\*/g, '')}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Video Modal ── */}
            {showVideoModal && selectedFicha && (
                <div className="video-modal-overlay">
                    <div className="video-modal-content">
                        <header className="modal-header">
                            <h2>{selectedFicha.titulo}</h2>
                            <button className="close-modal" onClick={() => setShowVideoModal(false)}><X size={32} /></button>
                        </header>

                        <div className="video-container-large">
                            {selectedFicha.videoName ? (
                                <video
                                    key={selectedFicha.id}
                                    controls
                                    autoPlay
                                    src={`devassist-video://${selectedFicha.videoName}`}
                                >
                                    Tu navegador no soporta el tag de video.
                                </video>
                            ) : (
                                <div className="empty-state">No hay video disponible</div>
                            )}
                        </div>

                        <div className="carousel-section">
                            <h3 className="carousel-title">Otras fichas con video</h3>
                            <div className="video-carousel">
                                {fichasConVideo.map(f => (
                                    <div
                                        key={f.id}
                                        className={`carousel-item ${selectedFicha.id === f.id ? 'active' : ''}`}
                                        onClick={() => setSelectedFicha(f)}
                                    >
                                        <h4 className="carousel-item-title">{f.titulo}</h4>
                                        <div className="carousel-item-meta">
                                            <span>{f.fuente}</span>
                                            <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewFicha && (
                <div className="video-modal-overlay" onClick={() => setPreviewFicha(null)}>
                    <div className="video-modal-content preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', height: 'auto', minHeight: '300px' }}>
                        <header className="modal-header">
                            <div>
                                <span className="tag-source" style={{ background: 'var(--accent)', marginBottom: '4px', display: 'inline-block' }}>Resumen Express</span>
                                <h2 style={{ fontSize: '1.2rem' }}>{previewFicha.titulo}</h2>
                            </div>
                            <button className="close-modal" onClick={() => setPreviewFicha(null)}><X size={32} /></button>
                        </header>
                        <div className="tab-content" style={{ padding: '30px' }}>
                            <div className="preview-concept">
                                <Sparkles size={24} style={{ color: 'var(--accent)', marginBottom: '15px' }} />
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#fff' }}>{previewFicha.concepto}</p>
                            </div>
                            <div className="preview-footer" style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline" onClick={() => setPreviewFicha(null)}>Cerrar</button>
                                <button className="btn btn-primary" onClick={() => { setSelectedFicha(previewFicha); setPreviewFicha(null); }}>Ver ficha completa</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fichas-list-panel">
                <header className="module-header-mini">
                    <div className="header-top">
                        <h1>Knowledge Vault</h1>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-sm btn-primary" onClick={handleUploadVideo} disabled={isAnalyzing}>
                                {isAnalyzing ? <span className="spinner"></span> : <><Plus size={14} /> Local</>}
                            </button>
                            <button className="btn btn-sm btn-outline" onClick={() => setShowUrlInput(!showUrlInput)} disabled={isAnalyzing}>
                                <Globe size={14} /> Enlace
                            </button>
                        </div>
                    </div>

                    {showUrlInput && (
                        <div className="url-input-container" style={{ display: 'flex', gap: '8px', marginBottom: '15px', width: '100%' }}>
                            <input
                                type="text"
                                className="input sm url-input-field"
                                style={{ flex: 1, padding: '8px', borderRadius: '6px' }}
                                placeholder="Pega el enlace de video (ej. TikTok)..."
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                            />
                            <button className="btn btn-sm btn-primary" onClick={() => {
                                setShowUrlInput(false);
                                handleUrlProcess(urlInput);
                                setUrlInput('');
                            }}>
                                Procesar
                            </button>
                        </div>
                    )}

                    {showProcessConsole && (
                        <div className="process-console-mini" style={{ 
                            background: '#050510', 
                            border: '1px solid var(--accent)', 
                            borderRadius: '8px', 
                            padding: '12px', 
                            marginBottom: '15px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            color: '#00ff99',
                            maxHeight: '150px',
                            overflowY: 'auto'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(0,255,153,0.2)', paddingBottom: '4px' }}>
                                <span style={{ fontWeight: 'bold' }}>CONSOLA DE PROCESO LIVE</span>
                                <X size={12} style={{ cursor: 'pointer' }} onClick={() => setShowProcessConsole(false)} />
                            </div>
                            {processLogs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '2px', wordBreak: 'break-all' }}>{log}</div>
                            ))}
                        </div>
                    )}

                    {/* ── Notification Dashboard (Centro de Prioridades) ── */}
                    {fichas.length > 0 && (
                        <div className="notification-dashboard">
                            <div className="stat-card urgent" onClick={() => setActiveTag(null)}>
                                <span className="stat-value">{fichas.filter(f => f.prioridad <= 2 && !f.revisada).length}</span>
                                <span className="stat-label">Urgentes</span>
                            </div>
                            <div className="stat-card pending" onClick={() => setActiveTag(null)}>
                                <span className="stat-value">{fichas.filter(f => !f.revisada).length}</span>
                                <span className="stat-label">Pendientes</span>
                            </div>
                        </div>
                    )}

                    <div className="search-input">
                        <Search className="search-icon" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar en el vault..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {allTags.length > 0 && (
                        <div className="tags-cloud">
                            <span
                                className={`tag ${!activeTag ? 'active' : ''}`}
                                onClick={() => setActiveTag(null)}
                            >
                                Todos
                            </span>
                            {allTags.slice(0, 4).map(tag => (
                                <span
                                    key={tag}
                                    className={`tag ${activeTag === tag ? 'active' : ''}`}
                                    onClick={() => setActiveTag(tag)}
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div className="fichas-list">
                    {filteredFichas.length === 0 ? (
                        <div className="empty-state">
                            <p>No hay fichas</p>
                        </div>
                    ) : (
                        filteredFichas.map(f => (
                            <div
                                key={f.id}
                                className={`ficha-item ${selectedFicha?.id === f.id ? 'active' : ''} ${!f.revisada ? 'unreviewed' : ''} priority-${f.prioridad || 3}`}
                                onClick={() => {
                                    setSelectedFicha(f);
                                    if (window.electronAPI?.fichas?.markOpened) {
                                        window.electronAPI.fichas.markOpened(f.id);
                                    }
                                }}
                            >
                                <div className="ficha-item-header">
                                    <span className="ficha-date">
                                        {new Date(f.createdAt).toLocaleDateString()} — {new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {f.source_channel && (
                                        <span className={`channel-badge ${f.source_channel}`}>
                                            {f.source_channel === 'whatsapp' ? 'WA' : f.source_channel === 'telegram' ? 'TG' : 'APP'}
                                        </span>
                                    )}
                                    {f.categoria && <span className="ficha-category-badge">{f.categoria}</span>}
                                </div>
                                <h4 className="ficha-title">{f.titulo}</h4>
                                <div className="ficha-tags-mini">
                                    <span className="tag-mini">{f.nivel}</span>
                                    <div className="ficha-item-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button 
                                            className="btn-preview-mini" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewFicha(f);
                                            }}
                                            title="Vista rápida"
                                            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
                                        >
                                            <Sparkles size={12} />
                                        </button>
                                        {f.prioridad <= 2 && <AlertCircle size={12} color="#ff4d4d" />}
                                        {f.videoName && <Film size={12} style={{ opacity: 0.5 }} />}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="ficha-detail-panel">
                {automationStatus ? (
                    <div className="empty-state automation-overlay">
                        <div className="spinner"></div>
                        <Sparkles size={48} className="pulse" />
                        <h3>{automationStatus.msg}</h3>
                        <p className="url-hint">{automationStatus.url}</p>
                    </div>
                ) : isAnalyzing ? (
                    <div className="empty-state">
                        <div className="spinner"></div>
                        <Rocket size={48} className="pulse" style={{ color: 'var(--accent)' }} />
                        <h3>Descodificando conocimiento...</h3>
                        <p>Analizando video, transcribiendo y buscando integraciones técnicas.</p>
                    </div>
                ) : selectedFicha ? (
                    <div className="ficha-detail">
                        <header className="detail-header">
                            <div className="detail-info">
                                <div className="detail-meta">
                                    {selectedFicha.categoria && <span className="tag-source">{selectedFicha.categoria}</span>}
                                    <span className="tag-type">Nivel {selectedFicha.nivel || 'Intermedio'}</span>
                                    <span className="detail-date">{new Date(selectedFicha.createdAt).toLocaleDateString()} — {selectedFicha.idioma?.toUpperCase()}</span>
                                    {selectedFicha.source_channel && (
                                        <span className={`channel-tag ${selectedFicha.source_channel}`}>
                                            Canal: {selectedFicha.source_channel.toUpperCase()}
                                        </span>
                                    )}
                                    {selectedFicha.last_opened_at && (
                                        <span className="detail-date" style={{ color: 'var(--accent-2)', opacity: 0.8 }}>
                                            • Abierta: {new Date(selectedFicha.last_opened_at).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                                <h1 className="detail-title">{selectedFicha.titulo}</h1>
                            </div>
                            <div className="detail-actions">
                                <button
                                    className={`btn btn-sm ${selectedFicha.revisada ? '' : 'btn-primary'}`}
                                    onClick={() => toggleRevisada(selectedFicha)}
                                >
                                    {selectedFicha.revisada ? <><Check size={14} /> Revisada</> : 'Marcar revisada'}
                                </button>
                                <button className="btn-icon" onClick={() => window.electronAPI.config.openUrl(selectedFicha.url_video)} title="Ver original">
                                    <Globe size={18} />
                                </button>
                                <button className="btn-icon danger" onClick={() => handleDeleteFicha(selectedFicha.id)} title="Eliminar">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </header>

                        <div className="detail-tabs">
                            <button className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
                                <Sparkles size={14} /> Concepto
                            </button>
                            <button className={`tab-btn ${activeTab === 'research' ? 'active' : ''}`} onClick={() => setActiveTab('research')}>
                                <Globe size={14} /> Análisis Deep
                            </button>
                            <button className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`} onClick={() => setActiveTab('transcript')}>
                                <FileText size={14} /> Transcripción
                            </button>
                            <button className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>
                                <Settings size={14} /> Stack
                            </button>
                            {selectedFicha.manual_uso && (
                                <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                                    <Book size={14} /> Guía
                                </button>
                            )}
                        </div>

                        {/* ── Tab: General ── */}
                        {activeTab === 'general' && (
                            <div className="tab-content">
                                {selectedFicha.videoName && (
                                    <button className="btn-video-large" onClick={() => setShowVideoModal(true)}>
                                        <Play size={20} fill="currentColor" /> Ver Video de TikTok
                                    </button>
                                )}

                                <section className="detail-section">
                                    <h3 className="section-title"><Database size={14} /> Resumen de Valor</h3>
                                    <p className="concept-text">{selectedFicha.concepto}</p>
                                </section>

                                {selectedFicha.puntos_exploracion && selectedFicha.puntos_exploracion.length > 0 && (
                                    <section className="detail-section">
                                        <h3 className="section-title"><Lightbulb size={14} /> Exploración Estratégica</h3>
                                        <div className="exploration-grid">
                                            {selectedFicha.puntos_exploracion.map((p, i) => (
                                                <div key={i} className="exploration-card">
                                                    <span className="explore-topic">{p.tema}</span>
                                                    <p className="explore-question">{p.pregunta}</p>
                                                    <button
                                                        className={`btn-explore ${p.resultado ? 'has-result' : ''}`}
                                                        onClick={() => handleResearchPoint(p)}
                                                        disabled={isResearchingPoint}
                                                        style={p.resultado ? { background: 'rgba(124, 106, 247, 0.2)', border: '1px solid var(--accent)' } : {}}
                                                    >
                                                        {isResearchingPoint ? 'Procesando...' : (p.resultado ? 'Ver Resultados' : 'Investigar')} <Sparkles size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                <section className="detail-section highlight">
                                    <h3 className="section-title"><Rocket size={14} /> Aplicación en Mis Proyectos</h3>
                                    {selectedFicha.aplicaciones_proyectos && selectedFicha.aplicaciones_proyectos.length > 0 ? (
                                        <div className="project-matches">
                                            {selectedFicha.aplicaciones_proyectos.map((m, i) => (
                                                <div key={i} className="project-match-card">
                                                    <div className="match-header">
                                                        <span className="match-name">{m.proyecto}</span>
                                                        <span className="match-relevance">
                                                            Puntuación: {m.relevancia}
                                                        </span>
                                                    </div>
                                                    <p className="match-suggestion">{m.sugerencia}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="applicability-text">Sin aplicaciones directas detectadas en los proyectos actuales.</p>
                                    )}
                                </section>
                            </div>
                        )}

                        {/* ── Tab: Investigación (Análisis Deep) ── */}
                        {activeTab === 'research' && (
                            <div className="tab-content">
                                {selectedFicha.investigacion_profunda ? (
                                    <section className="detail-section">
                                        <h3 className="section-title"><Globe size={14} /> Informe Técnico CTO</h3>
                                        <div className="transcription-box research-box">
                                            <div className="research-content">
                                                {selectedFicha.investigacion_profunda.split('\n').map((line, i) => (
                                                    <p key={i} style={{
                                                        fontWeight: line.startsWith('**') ? '800' : '400',
                                                        color: line.startsWith('**') ? 'var(--accent)' : 'inherit',
                                                        fontSize: line.startsWith('**') ? '16px' : '14px',
                                                        marginTop: line.startsWith('**') ? '15px' : '0',
                                                        lineHeight: '1.6'
                                                    }}>
                                                        {line.replace(/\*\*/g, '')}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-outline"
                                            style={{ marginTop: '20px', width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                                            onClick={handleGenerateDeepResearch}
                                            disabled={isGeneratingResearch}
                                        >
                                            <Sparkles size={14} style={{ marginRight: '8px' }} />
                                            {isGeneratingResearch ? 'Analizando infraestructura a fondo...' : 'Regenerar Informe CTO Técnico'}
                                        </button>
                                    </section>
                                ) : (
                                    <div className="empty-state" style={{ flexDirection: 'column', gap: '20px' }}>
                                        <p>No hay investigación técnica disponible para esta ficha.</p>
                                        <button
                                            className="btn btn-primary btn-large"
                                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                                            onClick={handleGenerateDeepResearch}
                                            disabled={isGeneratingResearch}
                                        >
                                            <Globe size={18} />
                                            {isGeneratingResearch ? 'Tomando control absoluto (Analizando)...' : 'Analizar a Nivel Experto (Deep Search)'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Transcripción ── */}
                        {activeTab === 'transcript' && (
                            <div className="tab-content">
                                <section className="detail-section">
                                    <h3 className="section-title"><FileText size={14} /> Transcripción RAW</h3>
                                    <div className="transcription-box">
                                        {selectedFicha.transcripcion ? selectedFicha.transcripcion.split('\n')
                                            .filter(l => l.trim().length > 0)
                                            .map((line, i) => {
                                                let isOriginal = false;
                                                let isTranslation = false;
                                                let content = line;

                                                if (line.includes('#ORIGINAL#')) {
                                                    isOriginal = true;
                                                    content = line.replace('#ORIGINAL#', '').trim();
                                                } else if (line.includes('#TRADUCCION#')) {
                                                    isTranslation = true;
                                                    content = line.replace('#TRADUCCION#', '').trim();
                                                } else {
                                                    // Legacy fallback: alternar por index si no existen las etiquetas nuevas
                                                    if (i % 2 === 0) isOriginal = true;
                                                    else isTranslation = true;
                                                }

                                                return (
                                                    <div key={i} style={{
                                                        marginBottom: '16px',
                                                        padding: '12px 16px',
                                                        borderRadius: '8px',
                                                        backgroundColor: isOriginal ? 'rgba(124, 106, 247, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                                                        borderLeft: isOriginal ? '3px solid var(--accent)' : '3px solid rgba(255, 255, 255, 0.15)',
                                                        color: isOriginal ? 'var(--text-1)' : 'rgba(255, 255, 255, 0.5)',
                                                        fontSize: isOriginal ? '14px' : '13px',
                                                        fontStyle: isTranslation ? 'italic' : 'normal',
                                                        lineHeight: '1.6'
                                                    }}>
                                                        {content}
                                                    </div>
                                                );
                                            }) : 'Sin transcripción'}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ── Tab: Stack (Herramientas) ── */}
                        {activeTab === 'tools' && (
                            <div className="tab-content">
                                {selectedFicha.herramientas && selectedFicha.herramientas.length > 0 ? (
                                    <div className="tools-grid">
                                        {selectedFicha.herramientas.map((h, i) => (
                                            <div key={i} className="tool-card">
                                                <div className="tool-card-header">
                                                    <span className="tool-name">{h.nombre}</span>
                                                    <span className="tag-mini">{h.tipo || 'Tool'}</span>
                                                </div>
                                                <p className="tool-desc">{h.descripcion}</p>
                                                <div className="tool-footer">
                                                    <span className="tool-price">{h.precio || '—'}</span>
                                                    {h.url_oficial && (
                                                        <button
                                                            className="btn-explore"
                                                            onClick={() => window.electronAPI.config.openUrl(h.url_oficial)}
                                                        >
                                                            {h.url_oficial.includes('github.com') ? <><Github size={14} /> Repo</> : <><LinkIcon size={12} /> Sitio</>}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state">No se detectaron herramientas específicas.</div>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Guide (Manual) ── */}
                        {activeTab === 'manual' && selectedFicha.manual_uso && (
                            <div className="tab-content">
                                <div className="manual-container">
                                    <div className="manual-content">
                                        {selectedFicha.manual_uso.split('\n').map((line, i) => (
                                            <div key={i} className={line.startsWith('#') ? 'manual-title' : 'manual-line'}>
                                                {line.startsWith('###') ? <h4>{line.replace(/###/g, '')}</h4> :
                                                    line.startsWith('##') ? <h3>{line.replace(/##/g, '')}</h3> :
                                                        line.startsWith('#') ? <h2>{line.replace(/#/g, '')}</h2> :
                                                            <p>{line}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="empty-state">
                        <Database size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <h3>Conocimiento Centralizado</h3>
                        <p>Selecciona una investigación en el panel izquierdo para desplegar el stack técnico y las guías de integración.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FichasModule;
