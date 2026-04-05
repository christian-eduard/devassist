import {
    Zap,
    Book,
    FileText,
    Bot,
    Settings,
    Sun,
    Moon,
    Cpu,
    Bell,
    Brain,
    Users2
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({
    activeModule,
    onNavigate,
    theme,
    onToggleTheme,
    systemStatus,
    notificationCount,
    onToggleNC
}) => {
    const items = [
        { id: 'projects', label: 'Proyectos', icon: <Zap size={18} /> },
        { id: 'fichas', label: 'Neurex', icon: <Brain size={18} /> },
        { id: 'agents', label: 'Agentes', icon: <Users2 size={18} /> },
        { id: 'notes', label: 'Notas', icon: <FileText size={18} /> },
        { id: 'aihub', label: 'AI Hub', icon: <Bot size={18} /> },
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
                <div className={`system-pulse ${isHealthy ? 'healthy' : 'error'}`} title="Estado del Sistema" />
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


            <div className="sidebar-footer">
                <button className="theme-toggle" onClick={onToggleTheme} title="Cambiar tema">
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
