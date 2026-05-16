// src/components/Sidebar.jsx — Navigation with React Router NavLinks
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
    { to: '/', icon: '📊', label: 'Knowledge Vault' },
    { to: '/projects', icon: '📁', label: 'Proyectos' },
    { to: '/notas-sueltas', icon: '📝', label: 'Notas Sueltas' },
    { to: '/search', icon: '🔍', label: 'Búsqueda RAG' },
    { to: '/aihub', icon: '🤖', label: 'AI Hub' },
    { to: '/graphify', icon: '⚡', label: 'Graphify' },
];

export default function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                NoahPro<span>.studio</span>
            </div>

            {NAV_ITEMS.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                </NavLink>
            ))}

            <div style={{ flex: 1 }} />

            {user && (
                <div className="sidebar-user">
                    <div className="sidebar-user-info">
                        <span className="sidebar-user-name">{user.name}</span>
                        <span className="sidebar-user-plan">{user.plan}</span>
                    </div>
                    <button onClick={logout} className="sidebar-logout" title="Cerrar sesión">⏻</button>
                </div>
            )}

            <div className="sidebar-version">
                DevAssist Cloud v1.0
            </div>
        </aside>
    );
}
