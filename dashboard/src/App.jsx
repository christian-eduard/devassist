// src/App.jsx — Root component with routing
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import FichaDetailPage from './pages/FichaDetailPage';
import AIHubPage from './pages/AIHubPage';
import ProjectsPage from './pages/ProjectsPage';
import TessChatWidget from './components/TessChatWidget';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedFichaId, setSelectedFichaId] = useState(null);

  function navigate(page, fichaId = null) {
    setCurrentPage(page);
    setSelectedFichaId(fichaId);
  }

  let content;
  if (currentPage === 'detail' && selectedFichaId) {
    content = <FichaDetailPage fichaId={selectedFichaId} onBack={() => navigate('dashboard')} />;
  } else if (currentPage === 'search') {
    content = <SearchPage />;
  } else if (currentPage === 'aihub') {
    content = <AIHubPage />;
  } else if (currentPage === 'projects') {
    content = <ProjectsPage />;
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
