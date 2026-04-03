import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Camera, History, User, Settings, Play, Square, AlertCircle, TrendingUp, CreditCard, Fuel } from 'lucide-react';

// 📊 Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({ currentDisposition: 0, roi: 0, odometerDiff: 0 });
  const [loading, setLoading] = useState(true);
  const dailyGoal = 572.00;

  useEffect(() => {
    fetch('http://localhost:3001/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if(d.success) setStats({ currentDisposition: Number(d.currentDisposition), roi: Number(d.roi), odometerDiff: Number(d.odometerDiff) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { currentDisposition, roi, odometerDiff } = stats;

  return (
    <div className="mobile-container">
      <div className="header">
        <h1>Mazatlán Audit Pro</h1>
        <p style={{color: 'var(--text-muted)', fontSize: '12px'}}>Dodge Attitude 2019 • 195k km</p>
      </div>

      {/* 🏁 Meta Diaria (Cubo de Disposición) */}
      <div className="card">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div className="card-title">Cubo de Disposición (Meta Hoy)</div>
          <div style={{fontSize: '12px', color: 'var(--didi-orange)'}}>${dailyGoal} MXN</div>
        </div>
        <div className="card-value">${currentDisposition.toFixed(2)}</div>
        <div style={{width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '12px', overflow: 'hidden'}}>
          <div style={{width: `${(currentDisposition/dailyGoal)*100}%`, height: '100%', backgroundColor: 'var(--didi-orange)', transition: 'width 0.5s ease'}}></div>
        </div>
        <p style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px'}}>Faltan ${(dailyGoal - currentDisposition).toFixed(2)} para los estudios/perros.</p>
      </div>

      {/* 🚀 Selección IQ (ROI) */}
      <div className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <div className="card-title">Selección IQ (ROI Real)</div>
          <div className={`card-value ${roi >= 10 ? 'indicator-green' : 'indicator-red'}`}>
            ${roi.toFixed(2)}/km
          </div>
        </div>
        <div style={{textAlign: 'right'}}>
          <span style={{backgroundColor: 'rgba(0, 209, 102, 0.1)', color: 'var(--success-green)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'}}>
            EXCELENTE
          </span>
        </div>
      </div>

      {/* ⚠️ Anomalías (KM Muertos) */}
      <div className="card" style={{borderColor: odometerDiff > 20 ? 'var(--error-red)' : 'transparent', borderWidth: '1px', borderStyle: 'solid'}}>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <AlertCircle size={20} color={odometerDiff > 20 ? 'var(--error-red)' : 'var(--text-muted)'} />
          <div>
            <div className="card-title" style={{marginBottom: '0'}}>Anomalía de Movilidad</div>
            <div style={{fontSize: '18px', fontWeight: 'bold'}}>{Number(odometerDiff).toFixed(1)} km Muertos</div>
          </div>
        </div>
        <p style={{fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px'}}>
          Estos KM no pagaron "Cubo de Vida". Revisa traslados personales.
        </p>
      </div>

      {/* 🔘 Acciones Rápidas */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px'}}>
        <Link to="/audit" className="btn btn-primary" style={{flexDirection: 'column', height: '100px', fontSize: '14px'}}>
          <Camera size={32} />
          Lector Mágico
        </Link>
        <button className="btn btn-secondary" style={{flexDirection: 'column', height: '100px', fontSize: '14px'}}>
          <Fuel size={32} />
          Cubo Fierro
        </button>
      </div>
    </div>
  );
};

// 📸 Audit Component
const Audit = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress(`Procesando lote de ${files.length} fotos...`);
    
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    try {
      const res = await fetch('http://localhost:3001/api/upload/batch', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if(data.success) {
        setProgress(`¡Éxito! ${data.viajesProcesados} viajes registrados en el Historial.`);
        setFiles([]);
      } else {
        setProgress('Error en la auditoría.');
      }
    } catch (e) {
      setProgress('Error de conexión.');
    }
    setLoading(false);
  };

  return (
    <div className="mobile-container">
      <div className="header">
        <h1>Lector Mágico (Lote)</h1>
      </div>
      
      <div className="card" style={{height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #444', position: 'relative'}}>
        {files.length > 0 ? (
          <div style={{textAlign: 'center'}}>
            <Camera size={64} color="var(--success-green)" />
            <h2 style={{marginTop: '10px'}}>{files.length} Fotos Listas</h2>
            <p style={{color: 'var(--text-muted)'}}>Revisión de múltiples viajes.</p>
          </div>
        ) : (
          <>
            <Camera size={64} color="var(--didi-orange)" />
            <p style={{color: '#888', marginTop: '16px', textAlign: 'center', padding: '0 20px'}}>Sube hasta 60 capturas de DiDi (Ej: 30 viajes x 2 fotos)</p>
          </>
        )}
        <input 
          type="file" 
          accept="image/*" 
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          style={{position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}} 
        />
      </div>

      {progress && <p style={{color: 'var(--didi-orange)', marginTop: '10px', textAlign: 'center', fontSize: '12px'}}>{progress}</p>}

      <button className="btn btn-primary" style={{marginTop: '20px'}} disabled={files.length === 0 || loading} onClick={handleUpload}>
        {loading ? 'Auditando Datos...' : `Procesar Lote con IA`}
      </button>
      
      {files.length > 0 && (
        <button className="btn btn-secondary" style={{marginTop: '10px'}} onClick={() => { setFiles([]); setProgress(''); }}>
          Limpiar Selección
        </button>
      )}
    </div>
  );
};

// 📜 History Component
const HistoryView = () => {
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState('week'); // day, week, month
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/history?period=${period}`);
        const data = await res.json();
        if (data.success) {
          setEntries(data.entries);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchHistory();
  }, [period]);

  return (
    <div className="mobile-container">
      <div className="header">
        <h1>Auditoría Maestra</h1>
      </div>
      
      {/* 📅 Filtros */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <button onClick={() => setPeriod('day')} className={`btn ${period === 'day' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '8px', fontSize: '12px'}}>Hoy</button>
        <button onClick={() => setPeriod('week')} className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '8px', fontSize: '12px'}}>Semana</button>
        <button onClick={() => setPeriod('month')} className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} style={{padding: '8px', fontSize: '12px'}}>Mes</button>
      </div>

      {loading ? (
        <div style={{textAlign: 'center', padding: '20px'}}>Auditando registros...</div>
      ) : (
        entries.length === 0 ? (
          <div className="card" style={{textAlign: 'center'}}>No hay viajes registrados en este periodo.</div>
        ) : (
          entries.map((entry) => {
            const isBad = entry.calificacion_seleccion === 'Ineficiente' || entry.calificacion_seleccion === 'Bajo';
            return (
              <div key={entry.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: isBad ? '4px solid var(--error-red)' : '4px solid var(--success-green)'}}>
                <div>
                  <div style={{fontWeight: 'bold', fontSize: '14px'}}>{entry.pasajero || 'App DiDi'}</div>
                  <div style={{fontSize: '11px', color: 'var(--text-muted)'}}>{entry.distancia_didi_km} km • ${parseFloat(entry.ganancia_neta_final).toFixed(2)}</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div className={`card-value ${isBad ? 'indicator-red' : 'indicator-green'}`} style={{fontSize: '18px'}}>
                    ${parseFloat(entry.roi_km).toFixed(2)}/km
                  </div>
                  <span style={{fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)'}}>{entry.calificacion_seleccion}</span>
                </div>
              </div>
            );
          })
        )
      )}
    </div>
  );
};

function App() {
  const location = useLocation();

  return (
    <div style={{paddingBottom: '80px'}}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/profile" element={<div className="mobile-container"><h1>Configuración</h1><div className="card">Vehículo: Attitude 2019<br/>Placas: Mazatlán</div></div>} />
      </Routes>

      {/* 🧭 Bottom Navigation DiDi Style */}
      <nav className="bottom-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <LayoutDashboard size={24} />
          <span>Inicio</span>
        </Link>
        <Link to="/audit" className={`nav-item ${location.pathname === '/audit' ? 'active' : ''}`}>
          <Camera size={24} />
          <span>Audit</span>
        </Link>
        <Link to="/history" className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`}>
          <History size={24} />
          <span>Logs</span>
        </Link>
        <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
          <Settings size={24} />
          <span>Ajustes</span>
        </Link>
      </nav>
    </div>
  );
}

export default App;
