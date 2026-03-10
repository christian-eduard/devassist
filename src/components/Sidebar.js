import {
    Zap,
    Book,
    FileText,
    Bot,
    Settings,
    MessageSquare,
    Sun,
    Moon,
    Home,
    Cpu,
    Bell
} from 'lucide-react';
import './Sidebar.css';
import VoiceVisualizer from './VoiceVisualizer';

const Sidebar = ({
    activeModule,
    onNavigate,
    clawbotActive,
    onClawbotClick,
    theme,
    onToggleTheme,
    systemStatus,
    isListening,
    isThinking,
    isSpeaking,
    onToggleListen,
    audioStream,
    notificationCount,
    onToggleNC
}) => {
    const items = [
        { id: 'projects', label: 'Proyectos', icon: <Zap size={18} /> },
        { id: 'fichas', label: 'Vault', icon: <Book size={18} /> },
        { id: 'notes', label: 'Notas', icon: <FileText size={18} /> },
        { id: 'aihub', label: 'AI Hub', icon: <Bot size={18} /> },
        { id: 'office', label: 'Sede Central', icon: <Home size={18} /> },
        { id: 'clawbot', label: 'Clawbot', icon: <MessageSquare size={18} /> },
        { id: 'capabilities', label: 'Capacidades', icon: <Cpu size={18} /> },
        { id: 'logs', label: 'Logs', icon: <FileText size={18} /> },
        { id: 'settings', label: 'Ajustes', icon: <Settings size={18} /> },
    ];

    const isHealthy = systemStatus?.gateway === 'online' && systemStatus?.ai === 'online';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-icon">DA</span>
                <span className="logo-text">DevAssist</span>
                <div className="sidebar-nc-trigger" onClick={onToggleNC}>
                    <Bell size={18} className={notificationCount > 0 ? 'has-notifications' : ''} />
                    {notificationCount > 0 && <span className="nc-badge">{notificationCount}</span>}
                </div>
                <div className={`system-pulse ${isHealthy ? 'healthy' : 'error'}`} title="Estado del Sistema VECTRON" />
            </div>

            <nav className="sidebar-nav">
                {items.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
                        onClick={() => onNavigate(item.id)}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="vectron-orb-container">
                <div
                    className={`orb-wrapper ${isListening ? 'listening' : ''} ${isThinking ? 'thinking' : ''} ${isSpeaking ? 'speaking' : ''}`}
                    onClick={onToggleListen}
                    title={isListening ? "VECTRON está escuchando..." : (isThinking ? "VECTRON está pensando..." : (isSpeaking ? "VECTRON está hablando..." : "Activar Escucha Neural"))}
                >
                    <div className="orb-rings"></div>
                    <div className="orb-rings"></div>
                    <div className="vectron-orb"></div>
                </div>
                <span className="orb-label">
                    {isListening ? 'VECTRON LISTENING' : (isThinking ? 'VECTRON THINKING' : (isSpeaking ? 'VECTRON SPEAKING' : 'VECTRON STANDBY'))}
                </span>
                <VoiceVisualizer isListening={isListening} stream={audioStream} />
            </div>

            <div className="sidebar-footer">
                <button className="theme-toggle" onClick={onToggleTheme} title="Cambiar tema">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="clawbot-status" onClick={onClawbotClick}>
                    <div className={`status-dot ${clawbotActive ? 'active' : 'inactive'}`} title={clawbotActive ? 'Clawbot activo' : 'Clawbot inactivo'} />
                    <span className="status-label">Clawbot</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
