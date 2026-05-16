// src/App.jsx — Root component with React Router
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import FichaDetailPage from './pages/FichaDetailPage';
import AIHubPage from './pages/AIHubPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import NotasSueltasPage from './pages/NotasSueltasPage';
import GraphifyPage from './pages/GraphifyPage';
import GitHubPage from './pages/GitHubPage';
import LoginPage from './pages/LoginPage';
import TessChatWidget from './components/TessChatWidget';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="loading"><div className="spinner" /></div>;
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) return <div className="loading"><div className="spinner" /></div>;

    // Show login page without sidebar
    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <>
            <div className="app">
                <Sidebar />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/fichas/:id" element={<FichaDetailPage />} />
                        <Route path="/projects" element={<ProjectsPage />} />
                        <Route path="/projects/:id" element={<ProjectDetailPage />} />
                        <Route path="/notas-sueltas" element={<NotasSueltasPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/aihub" element={<AIHubPage />} />
                        <Route path="/github" element={<GitHubPage />} />
                        <Route path="/graphify" element={<GraphifyPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
            <TessChatWidget />
        </>
    );
}
