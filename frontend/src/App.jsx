import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Settings as SettingsIcon, Fuel } from 'lucide-react';

// 📂 Importar Componentes Modulares
import Dashboard from './components/Dashboard';
import Audit from './components/Audit';
import HistoryView from './components/HistoryView';
import Cargas from './components/Cargas';
import Settings from './components/Settings';

const App = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentDate = searchParams.get('date');
  const dateQuery = currentDate ? `?date=${currentDate}` : '';

  return (
    <div style={{ backgroundColor: 'var(--bg-black)', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* 🧭 Navegación Principal */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/cubo" element={<Cargas />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>

      {/* 📱 Barra de Navegación Inferior (Sticky Mobile) */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(20,20,20,0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0 24px 0',
        zIndex: 1000
      }}>
        <Link to={`/${dateQuery}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: location.pathname === '/' ? 'var(--brand-purple)' : 'var(--text-muted)' }}>
          <LayoutDashboard size={24} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>Dashboard</span>
        </Link>
        <Link to={`/history${dateQuery}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: location.pathname === '/history' ? 'var(--brand-purple)' : 'var(--text-muted)' }}>
          <History size={24} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>Viajes</span>
        </Link>
        <Link to={`/cubo${dateQuery}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: location.pathname === '/cubo' ? 'var(--brand-purple)' : 'var(--text-muted)' }}>
          <Fuel size={24} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>Cargas</span>
        </Link>
        <Link to={`/settings${dateQuery}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: location.pathname === '/settings' ? 'var(--brand-purple)' : 'var(--text-muted)' }}>
          <SettingsIcon size={24} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>Ajustes</span>
        </Link>
      </nav>
    </div>
  );
};

export default App;
