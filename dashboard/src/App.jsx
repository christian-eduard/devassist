// src/App.jsx — Root component with routing
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import FichaDetailPage from './pages/FichaDetailPage';
import AIHubPage from './pages/AIHubPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import GraphifyPage from './pages/GraphifyPage';
import TessChatWidget from './components/TessChatWidget';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedFichaId, setSelectedFichaId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  function navigate(page, fichaId = null) {
    setCurrentPage(page);
    setSelectedFichaId(fichaId);
    if (page !== 'projectDetail') setSelectedProjectId(null);
  }

  let content;
  if (currentPage === 'detail' && selectedFichaId) {
    content = <FichaDetailPage fichaId={selectedFichaId} onBack={() => navigate('dashboard')} />;
  } else if (currentPage === 'search') {
    content = <SearchPage />;
  } else if (currentPage === 'aihub') {
    content = <AIHubPage />;
  } else if (currentPage === 'projects') {
    content = <ProjectsPage onSelectProject={(id) => { setSelectedProjectId(id); setCurrentPage('projectDetail'); }} />;
  } else if (currentPage === 'projectDetail' && selectedProjectId) {
    content = <ProjectDetailPage projectId={selectedProjectId} onBack={() => navigate('projects')} />;
  } else if (currentPage === 'graphify') {
    content = <GraphifyPage />;
  } else {
    content = <DashboardPage onSelectFicha={(id) => navigate('detail', id)} />;
  }

  return (
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={navigate} />
      <main className="main-content">{content}</main>
      <TessChatWidget />
    </div>
  );
}
