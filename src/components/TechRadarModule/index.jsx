import React, { useState, useEffect } from 'react';
import { Target, Zap, Search, AlertCircle, TrendingUp, ShieldCheck, RefreshCw } from 'lucide-react';
import './TechRadarModule.css';

const TechRadarModule = ({ showToast }) => {
    const [radarData, setRadarData] = useState({ adopt: [], trial: [], assess: [], hold: [] });
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const loadRadar = async () => {
            try {
                const res = await window.electronAPI.radar.getAll();
                if (res.success) setRadarData(res.radar);
            } catch (err) {
                console.error('Error loading radar:', err);
                showToast('Error al cargar Tech Radar', 'error');
            }
            setLoading(false);
        };
        loadRadar();
    }, [showToast]);

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const res = await window.electronAPI.radar.triggerScan();
            if (res.success) {
                showToast(`Escaneo completado. ${res.results.length} tecnologías analizadas.`, 'success');
                // Recargar datos
                const updated = await window.electronAPI.radar.getAll();
                if (updated.success) setRadarData(updated.radar);
            }
        } catch (err) {
            showToast('Error en escaneo de radar', 'error');
        }
        setIsScanning(false);
    };

    if (loading) return <div className="spinner"></div>;

    const quadrants = [
        { id: 'adopt', label: 'Adopt', icon: <ShieldCheck size={20} color="#22c55e" />, desc: 'Tecnologías core y estables.' },
        { id: 'trial', label: 'Trial', icon: <TrendingUp size={20} color="#3b82f6" />, desc: 'En fase de prueba real en proyectos.' },
        { id: 'assess', label: 'Assess', icon: <Search size={20} color="#a855f7" />, desc: 'Investigación técnica activa.' },
        { id: 'hold', label: 'Hold', icon: <AlertCircle size={20} color="#ef4444" />, desc: 'Obsolescencia o precaución.' }
    ];

    return (
        <div className="radar-module">
            <header className="module-header">
                <div>
                    <h1>Tech Radar</h1>
                    <p>Mapeo estratégico del stack tecnológico y vigilancia de obsolescencia</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <button 
                        className={`btn ${isScanning ? 'disabled' : 'btn-primary'}`} 
                        onClick={handleScan}
                        disabled={isScanning}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
                        {isScanning ? 'Escaneando...' : 'Escanear Radar'}
                    </button>
                    <div className="radar-legend">
                        {quadrants.map(q => (
                            <div key={q.id} className="legend-item">
                                {q.icon} <span>{q.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <div className="radar-grid">
                {quadrants.map(q => (
                    <div key={q.id} className={`radar-quadrant ${q.id}`}>
                        <div className="quadrant-header">
                            {q.icon}
                            <h3>{q.label}</h3>
                        </div>
                        <p className="quadrant-desc">{q.desc}</p>
                        <div className="tech-list">
                            {radarData[q.id].length > 0 ? radarData[q.id].map((tech, i) => (
                                <div key={tech.fichaId + i} className="tech-card">
                                    <div className="tech-name">{tech.name}</div>
                                    <div className="tech-meta">
                                        Obs: <span style={{ color: tech.obsolescence > 7 ? '#ef4444' : 'inherit' }}>{tech.obsolescence}/10</span>
                                    </div>
                                </div>
                            )) : <div className="empty-quadrant">Vórtice vacío</div>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TechRadarModule;
