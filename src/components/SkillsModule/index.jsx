import React, { useState, useEffect } from 'react';
import { 
    Search, 
    Download, 
    ExternalLink, 
    FileText, 
    Star, 
    Zap, 
    RefreshCcw, 
    Trash2,
    CheckCircle,
    FolderOpen,
    Sparkles
} from 'lucide-react';
import './SkillsModule.css';

const SkillsModule = () => {
    const [activeTab, setActiveTab] = useState('explorer'); // explorer | suggestions
    const [skills, setSkills] = useState([]);
    const [suggestedSkills, setSuggestedSkills] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState(null);

    useEffect(() => {
        loadData();
        const cleanup = window.electronAPI.skills.onNavigateToSuggestions(() => {
            setActiveTab('suggestions');
        });
        return cleanup;
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const all = await window.electronAPI.skills.load();
            setSkills(all);
            const sug = await window.electronAPI.skills.getSuggested();
            setSuggestedSkills(sug);
        } catch (err) {
            console.error('Error loading skills:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScan = async () => {
        setIsLoading(true);
        try {
            await window.electronAPI.skills.triggerScan();
            await loadData();
        } catch (err) {
            alert('Error escaneando ClawHub: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar esta skill de la base de datos?')) {
            await window.electronAPI.skills.delete(id);
            loadData();
        }
    };

    const handleOpenFolder = (id) => {
        window.electronAPI.skills.openFolder(id);
    };

    const filteredSkills = (activeTab === 'explorer' ? skills : suggestedSkills).filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="skills-module">
            <header className="module-header">
                <div className="header-left">
                    <h2><Sparkles size={24} className="accent-color" /> ClawHub Intelligence</h2>
                    <p>Descubre y analiza nuevas capacidades para tus asistentes.</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar skills..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn-primary" onClick={handleScan} disabled={isLoading}>
                        <RefreshCcw size={18} className={isLoading ? 'spin' : ''} />
                        Escaneo de Hoy
                    </button>
                </div>
            </header>

            <div className="tabs-nav">
                <button 
                    className={activeTab === 'explorer' ? 'active' : ''} 
                    onClick={() => setActiveTab('explorer')}
                >
                    Explorador
                </button>
                <button 
                    className={activeTab === 'suggestions' ? 'active' : ''} 
                    onClick={() => setActiveTab('suggestions')}
                >
                    Sugerencias TESS ({suggestedSkills.length})
                </button>
            </div>

            <main className="skills-content">
                <div className="skills-grid">
                    {filteredSkills.length === 0 ? (
                        <div className="empty-state">
                            <Zap size={48} />
                            <p>No se han encontrado skills. Inicia un escaneo para descubrir nuevas herramientas.</p>
                        </div>
                    ) : (
                        filteredSkills.map(skill => (
                            <div 
                                key={skill.id} 
                                className={`skill-card ${selectedSkill?.id === skill.id ? 'selected' : ''}`}
                                onClick={() => setSelectedSkill(skill)}
                            >
                                <div className="skill-card-badge">
                                    {skill.isSuggested ? <Sparkles size={12} /> : null}
                                </div>
                                <div className="skill-card-info">
                                    <h3>{skill.name}</h3>
                                    <span className="skill-author">por {skill.author}</span>
                                    <p>{skill.description}</p>
                                </div>
                                <div className="skill-card-stats">
                                    <span><Download size={14} /> {skill.downloads}</span>
                                    <span><Star size={14} /> {skill.stars}</span>
                                </div>
                                {skill.installed === 1 && <div className="installed-tag"><CheckCircle size={14} /> Descargado</div>}
                            </div>
                        ))
                    )}
                </div>

                <aside className="skill-detail">
                    {selectedSkill ? (
                        <div className="detail-panel">
                            <div className="detail-header">
                                <h3>{selectedSkill.name} <span className="version">v{selectedSkill.version}</span></h3>
                                <div className="action-row">
                                    <button className="btn-icon" title="Abrir en DevAssist" onClick={() => handleOpenFolder(selectedSkill.id)}>
                                        <FolderOpen size={18} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDelete(selectedSkill.id)}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="detail-meta">
                                <p><strong>Autor:</strong> {selectedSkill.author}</p>
                                <p><strong>ClawHub:</strong> <a href={selectedSkill.remoteUrl} target="_blank" rel="noreferrer">Ver perfil <ExternalLink size={12} /></a></p>
                            </div>

                            {selectedSkill.fullReport ? (
                                <div className="ai-report">
                                    <div className="report-header">
                                        <h4><FileText size={16} /> Informe del CTO (Español)</h4>
                                        <span className="report-date">{new Date(selectedSkill.suggestedAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="report-content">
                                        {selectedSkill.fullReport.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                    <div className="antigravity-integration">
                                        <p>Esta skill ha sido pre-descargada. Puedes pedirle a **Antigravity** que la integre en tus tareas actuales.</p>
                                        <button className="btn-antigravity" onClick={() => window.electronAPI.projects.openAntigravity(process.env.DATA_DIR)}>
                                            <Sparkles size={18} /> Usar con Antigravity
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="no-report">
                                    <p>Selecciona una sugerencia de TESS para ver el análisis de impacto.</p>
                                    <button className="btn-secondary" onClick={handleScan}>Generar Informe con IA</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="detail-placeholder">
                            <Sparkles size={64} opacity={0.2} />
                            <p>Selecciona una skill para ver el análisis detallado y opciones de implementación.</p>
                        </div>
                    )}
                </aside>
            </main>
        </div>
    );
};

export default SkillsModule;
