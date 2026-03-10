import React, { useState, useEffect } from 'react';
import {
    Cpu,
    Shield,
    Zap,
    MessageSquare,
    Video,
    Volume2,
    Fingerprint,
    Eye,
    Terminal,
    GitBranch,
    Sparkles,
    Clock,
    Layers,
    ArrowRight
} from 'lucide-react';
import './CapabilitiesModule.css';

const CapabilitiesModule = ({ showToast }) => {
    // Estado de capacidades (esto debería venir de config.json en el futuro)
    const [capabilities, setCapabilities] = useState([
        {
            id: 'voice',
            name: 'Sintetizador JARVIS',
            desc: 'Voz asertiva obligatoria para cada respuesta de VECTRON.',
            icon: <Volume2 size={24} />,
            active: true
        },
        {
            id: 'tiktok',
            name: 'Pipeline TikTok',
            desc: 'Detección automática de enlaces y generación de fichas.',
            icon: <Video size={24} />,
            active: true
        },
        {
            id: 'logic',
            name: 'VECTRON Logic',
            desc: 'Personalidad formal-sarcástica y trato de Señor Chris.',
            icon: <Shield size={24} />,
            active: true
        },
        {
            id: 'gateway',
            name: 'Neural Gateway',
            desc: 'Conexión segura via localhost:18789 y túnel OpenClaw.',
            icon: <Fingerprint size={24} />,
            active: true
        }
    ]);

    const [recommendations, setRecommendations] = useState([
        {
            id: 'git_sync',
            name: 'Sincronización Git Neural',
            desc: 'VECTRON detecta cambios locales y sugiere commits descriptivos automáticamente.',
            icon: <GitBranch size={20} />,
            estimatedPower: 'Alta'
        },
        {
            id: 'daily_report',
            name: 'Reporte de Productividad',
            desc: 'VECTRON analiza su actividad diaria y genera un resumen vocal a las 20:00.',
            icon: <Clock size={20} />,
            estimatedPower: 'Media'
        },
        {
            id: 'auto_categorize',
            name: 'Categorización Inteligente',
            desc: 'Clasificación automática de fichas del Vault usando modelos de Visión.',
            icon: <Sparkles size={20} />,
            estimatedPower: 'Máxima'
        }
    ]);

    const toggleCapability = (id) => {
        setCapabilities(prev => prev.map(cap =>
            cap.id === id ? { ...cap, active: !cap.active } : cap
        ));
        const cap = capabilities.find(c => c.id === id);
        showToast(`${cap.name} ${cap.active ? 'desactivada' : 'activada'}`, cap.active ? 'info' : 'success');
    };

    const activateRecommendation = (rec) => {
        showToast(`Activando ${rec.name}... VECTRON está configurando el entorno.`, 'success');
        // Aquí iría la lógica de instalación/configuración
        setTimeout(() => {
            setRecommendations(prev => prev.filter(r => r.id !== rec.id));
            setCapabilities(prev => [...prev, { ...rec, active: true, estimatedPower: undefined }]);
        }, 1500);
    };

    return (
        <div className="capabilities-module scrollable">
            <header className="cap-header">
                <h1><Cpu size={32} /> Capacidades VECTRON</h1>
                <p>Nivel de autorización: **Nivel 5 (Master)**. Todos los sistemas operativos.</p>
            </header>

            <span className="section-label">Capacidades Activas</span>
            <div className="active-caps-grid">
                {capabilities.map(cap => (
                    <div
                        key={cap.id}
                        className={`cap-card ${cap.active ? 'active' : ''}`}
                        onClick={() => toggleCapability(cap.id)}
                    >
                        <div className="switch-container">
                            <div className="luxury-switch">
                                <div className="thumb"></div>
                            </div>
                        </div>
                        <div className="cap-icon">{cap.icon}</div>
                        <h3>{cap.name}</h3>
                        <p>{cap.desc}</p>
                        <div className="status-indicator">
                            <div className="status-dot"></div>
                            <span>{cap.active ? 'OPERATIVO' : 'EN ESPERA'}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="recommendations-section luxury-glow">
                <span className="section-label">Optimización Neural (Sugerencias)</span>
                <div className="rec-list">
                    {recommendations.map(rec => (
                        <div key={rec.id} className="rec-item">
                            <div className="rec-icon">{rec.icon}</div>
                            <div className="rec-content">
                                <h4>{rec.name}</h4>
                                <p>{rec.desc}</p>
                                <span style={{ fontSize: '10px', color: '#444', marginTop: '5px', display: 'block' }}>Impacto: {rec.estimatedPower}</span>
                            </div>
                            <button className="btn-activate" onClick={() => activateRecommendation(rec)}>
                                Activar
                            </button>
                        </div>
                    ))}
                    {recommendations.length === 0 && (
                        <p style={{ color: '#555', textAlign: 'center', padding: '20px' }}>
                            Todos los sistemas recomendados están activos, Señor Chris.
                        </p>
                    )}
                </div>
            </div>

            <footer style={{ marginTop: '50px', padding: '20px', textAlign: 'center', opacity: 0.3 }}>
                <p style={{ fontSize: '12px' }}>VECTRON Protocol v2.5.4 • Secure Session ID: {Math.random().toString(16).slice(2, 10)}</p>
            </footer>
        </div>
    );
};

export default CapabilitiesModule;
