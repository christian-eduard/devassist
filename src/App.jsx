import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ProjectsModule from './components/ProjectsModule';
import FichasModule from './components/FichasModule';
import NotesModule from './components/NotesModule';
import AIHubModule from './components/AIHubModule';
import SettingsModule from './components/SettingsModule';
import LogsModule from './components/LogsModule';
import AgentsModule from './components/AgentsModule';
import TechRadarModule from './components/TechRadarModule';
import SkillsModule from './components/SkillsModule';
import NotificationCenter from './components/NotificationCenter';
import NotificationModal from './components/NotificationModal';
import TessChatWidget from './components/TessChatWidget';
import { ProjectProvider } from './contexts/ProjectContext';

const MODULES = ['projects', 'fichas', 'agents', 'notes', 'aihub', 'radar', 'skills', 'logs', 'settings'];

function App() {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const [activeModule, setActiveModule] = useState('projects');
    const [systemStatus, setSystemStatus] = useState({ gateway: 'disabled', ai: 'online' });
    const [theme, setTheme] = useState(localStorage.getItem('devassist-theme') || 'dark');
    const [notifications, setNotifications] = useState([]);
    const [ncOpen, setNcOpen] = useState(false);
    const [selectedNotify, setSelectedNotify] = useState(null);

    const addNotification = useCallback((n) => {
        setNotifications(prev => {
            const existing = prev.find(item => item.id === n.id);
            if (existing) {
                return [{ ...existing, ...n, timestamp: Date.now(), read: false }, ...prev.filter(item => item.id !== n.id)];
            }
            return [{
                id: n.id || `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                timestamp: Date.now(),
                read: false,
                ...n
            }, ...prev];
        });
    }, []);

    useEffect(() => {
        const persist = async () => {
            if (window.electronAPI?.notifications?.save && notifications.length > 0) {
                await window.electronAPI.notifications.save(notifications);
            }
        };
        persist();
    }, [notifications]);

    useEffect(() => {
        const init = async () => {
            console.info('[App] Iniciando sistema...');
            if (window.electronAPI?.notifications?.load) {
                const list = await window.electronAPI.notifications.load();
                if (list) setNotifications(list);
            }
        };
        init();
    }, []);

    const updateStatus = useCallback(async () => {
        if (!window.electronAPI?.system) return;
        try {
            const status = await window.electronAPI.system.getSystemStatus();
            setSystemStatus(status);
        } catch (err) {
            console.error('Status Error:', err);
        }
    }, []);

    useEffect(() => {
        updateStatus();
        const interval = setInterval(updateStatus, 15000);
        return () => clearInterval(interval);
    }, [updateStatus]);

    useEffect(() => {
        localStorage.setItem('devassist-theme', theme);
        if (theme === 'light') document.body.classList.add('light-mode');
        else document.body.classList.remove('light-mode');
    }, [theme]);
    useEffect(() => {
        const handleWinNotify = (e) => e.detail && addNotification(e.detail);
        window.addEventListener('system:notify', handleWinNotify);

        const unSubs = [];
        if (window.electronAPI?.system) {
            unSubs.push(window.electronAPI.system.onNotify(data => data && addNotification(data)));
        }

        if (window.electronAPI?.skills) {
            unSubs.push(window.electronAPI.skills.onNavigateToSuggestions(() => {
                setActiveModule('skills');
            }));
        }

        return () => {
            window.removeEventListener('system:notify', handleWinNotify);
            unSubs.forEach(u => u());
        };
    }, [addNotification]);

    const renderModule = () => {
        switch (activeModule) {
            case 'projects': return <ProjectsModule showToast={showToast} />;
            case 'fichas': return <FichasModule showToast={showToast} addNotification={addNotification} />;
            case 'notes': return <NotesModule showToast={showToast} />;
            case 'aihub': return <AIHubModule showToast={showToast} />;
            case 'agents': return <AgentsModule showToast={showToast} />;
            case 'radar': return <TechRadarModule showToast={showToast} />;
            case 'skills': return <SkillsModule showToast={showToast} />;
            case 'logs': return <LogsModule showToast={showToast} />;
            case 'settings': return <SettingsModule showToast={showToast} onNavigate={setActiveModule} />;
            default: return <ProjectsModule showToast={showToast} />;
        }
    };

    const [tessOpen, setTessOpen] = useState(false);

    return (
        <ProjectProvider>
            <div className={`app-layout ${theme === 'light' ? 'light-mode' : ''}`}>
                <div className="titlebar-drag" />
                <div className="app-body">
                    <Sidebar
                        activeModule={activeModule}
                        onNavigate={setActiveModule}
                        theme={theme}
                        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        systemStatus={systemStatus}
                        notificationCount={notifications.filter(n => !n.read).length}
                        onToggleNC={() => setNcOpen(!ncOpen)}
                        onToggleTess={() => setTessOpen(prev => !prev)}
                    />
                    <main className="main-content">{renderModule()}</main>

                    {ncOpen && (
                        <NotificationCenter
                            notifications={notifications}
                            onClose={() => setNcOpen(false)}
                            onClearAll={() => {
                               setNotifications([]);
                               if (window.electronAPI.notifications.clear) window.electronAPI.notifications.clear();
                            }}
                            onDelete={id => setNotifications(prev => prev.filter(n => n.id !== id))}
                            onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                            onAction={(id) => {
                                const note = notifications.find(n => n.id === id);
                                setSelectedNotify(note);
                                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
                            }}
                        />
                    )}

                    {selectedNotify && (
                        <NotificationModal 
                            notification={selectedNotify}
                            onClose={() => setSelectedNotify(null)}
                            onSaveNotes={async (id, notes) => {
                                await window.electronAPI.notifications.updateNotes(id, notes);
                                setNotifications(prev => prev.map(n => n.id === id ? { ...n, notes } : n));
                                showToast('Nota guardada correctamente', 'success');
                            }}
                        />
                    )}
                </div>
                {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
                <TessChatWidget open={tessOpen} setOpen={setTessOpen} />
            </div>
        </ProjectProvider>
    );
}

export default App;
