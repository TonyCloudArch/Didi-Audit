import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Camera, History, User, Settings, Play, Square, AlertCircle, TrendingUp, CreditCard, Fuel } from 'lucide-react';

// 📊 Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({ currentDisposition: 0, roi: 0, totalKmDidi: 0 });
  const [loading, setLoading] = useState(true);
  const dailyGoal = 572.00;

  useEffect(() => {
    fetch('http://localhost:3001/api/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats({ currentDisposition: Number(d.currentDisposition), roi: Number(d.roi), totalKmDidi: Number(d.totalKmDidi) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { currentDisposition, roi, totalKmDidi } = stats;

  return (
    <div className="mobile-container">
      <div className="header">
        <h1>Mazatlán Audit Pro</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Dodge Attitude 2019 • 195k km</p>
      </div>

      {/* 🏁 Meta Diaria (Cubo de Disposición) */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Cubo de Disposición (Meta Hoy)</div>
          <div style={{ fontSize: '12px', color: 'var(--didi-orange)' }}>${dailyGoal} MXN</div>
        </div>
        <div className="card-value">${currentDisposition.toFixed(2)}</div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '12px', overflow: 'hidden' }}>
          <div style={{ width: `${(currentDisposition / dailyGoal) * 100}%`, height: '100%', backgroundColor: 'var(--didi-orange)', transition: 'width 0.5s ease' }}></div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>Faltan ${(dailyGoal - currentDisposition).toFixed(2)} para los estudios/perros.</p>
      </div>

      {/* 🚀 Selección IQ (ROI) */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="card-title">Selección IQ (ROI Real)</div>
          <div className={`card-value ${roi >= 10 ? 'indicator-green' : 'indicator-red'}`}>
            ${roi.toFixed(2)}/km
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ backgroundColor: roi >= 18 ? 'rgba(0,209,102,0.15)' : roi >= 12 ? 'rgba(0,209,102,0.1)' : 'rgba(255,100,0,0.1)', color: roi >= 12 ? 'var(--success-green)' : 'var(--didi-orange)', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
            {roi >= 18 ? 'SÚPER ÉLITE' : roi >= 12 ? 'EXCELENTE' : roi >= 8 ? 'META' : 'INEFICIENTE'}
          </span>
        </div>
      </div>

      {/* ⚠️ KM DiDi del Día */}
      <div className="card" style={{ borderColor: totalKmDidi > 0 ? 'transparent' : '#333', borderWidth: '1px', borderStyle: 'solid' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <AlertCircle size={20} color={'var(--text-muted)'} />
          <div>
            <div className="card-title" style={{ marginBottom: '0' }}>Km DiDi Recorridos Hoy</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{Number(totalKmDidi).toFixed(1)} km</div>
          </div>
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
          Total de km registrados en viajes de DiDi este día.
        </p>
      </div>

      {/* 🔘 Acciones Rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
        <Link to="/audit" className="btn btn-primary" style={{ flexDirection: 'column', height: '100px', fontSize: '14px' }}>
          <Camera size={32} />
          Lector Mágico
        </Link>
        <button className="btn btn-secondary" style={{ flexDirection: 'column', height: '100px', fontSize: '14px' }}>
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
      if (data.success) {
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

      <div className="card" style={{ height: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #444', position: 'relative' }}>
        {files.length > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <Camera size={64} color="var(--success-green)" />
            <h2 style={{ marginTop: '10px' }}>{files.length} Fotos Listas</h2>
            <p style={{ color: 'var(--text-muted)' }}>Revisión de múltiples viajes.</p>
          </div>
        ) : (
          <>
            <Camera size={64} color="var(--didi-orange)" />
            <p style={{ color: '#888', marginTop: '16px', textAlign: 'center', padding: '0 20px' }}>Sube hasta 60 capturas de DiDi (Ej: 30 viajes x 2 fotos)</p>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
        />
      </div>

      {progress && <p style={{ color: 'var(--didi-orange)', marginTop: '10px', textAlign: 'center', fontSize: '12px' }}>{progress}</p>}

      <button className="btn btn-primary" style={{ marginTop: '20px' }} disabled={files.length === 0 || loading} onClick={handleUpload}>
        {loading ? 'Auditando Datos...' : `Procesar Lote con IA`}
      </button>

      {files.length > 0 && (
        <button className="btn btn-secondary" style={{ marginTop: '10px' }} onClick={() => { setFiles([]); setProgress(''); }}>
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
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/api/history?period=${period}`);
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

  const toggleExpand = (id) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(item => item !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  return (
    <div className="mobile-container">
      <div className="header" style={{ textAlign: 'center' }}>
        <h1>VIAJES</h1>
      </div>

      {/* 📅 Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setPeriod('day')} className={`btn ${period === 'day' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Hoy</button>
        <button onClick={() => setPeriod('week')} className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Semana</button>
        <button onClick={() => setPeriod('month')} className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Mes</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Auditando registros...</div>
      ) : (
        entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>No hay viajes registrados en este periodo.</div>
        ) : (
          entries.map((entry) => {
            const isBad = entry.calificacion_seleccion === 'Ineficiente' || entry.calificacion_seleccion === 'Bajo';
            const isExpanded = expandedIds.includes(entry.id);
            return (
              <div key={entry.id} onClick={() => toggleExpand(entry.id)} className="card" style={{
                cursor: 'pointer',
                borderLeft: isBad ? '4px solid var(--error-red)' : '4px solid var(--success-green)',
                transition: 'all 0.3s ease',
                padding: isExpanded ? '20px' : '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '5px' }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>PAGO</div>
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                      ${parseFloat(entry.ganancias_desp_imp).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>DISTANCIA</div>
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                      {entry.distancia} km
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>EFICIENCIA</div>
                    <div style={{ fontSize: '15px', color: isBad ? 'var(--error-red)' : 'var(--success-green)' }}>
                      ${parseFloat(entry.roi_km).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>GANANCIA</div>
                    <div style={{ fontSize: '15px', color: 'var(--success-green)' }}>
                      ${parseFloat(entry.ganancia_real).toFixed(2)}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* 🕒 Tiempos */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <AlertCircle size={16} color="var(--didi-orange)" />
                      <div style={{ fontSize: '12px' }}>
                        <strong>{entry.duracion}</strong> • Realizado el {entry.fecha_hora_viaje}
                      </div>
                    </div>

                    {/* 💰 Desglose Financiero (Reflejo DiDi) */}
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Pagado por el Pasajero</span>
                        <span>${parseFloat(entry.pagado_por_el_pasajero).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Comisión DiDi Estimada</span>
                        <span style={{ color: 'var(--error-red)' }}>-${(parseFloat(entry.tarifa_de_servicio) + parseFloat(entry.cuota_de_solicitud)).toFixed(2)}</span>
                      </div>
                      {entry.tarifa_dinamica !== 'No aplica' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--didi-orange)' }}>Tarifa Dinámica</span>
                          <span style={{ color: 'var(--didi-orange)' }}>{entry.tarifa_dinamica}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Monto Adicional Gasolina</span>
                        <span style={{ color: 'var(--success-green)' }}>+${parseFloat(entry.monto_adicional_por_gasolina).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{entry.impuesto_tipo || 'Impuesto'}</span>
                        <span style={{ color: 'var(--error-red)' }}>-${parseFloat(entry.impuesto).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', borderTop: '1px solid #333', paddingTop: '8px', fontWeight: 'bold' }}>
                        <span>Utilidad Neta (Cubo)</span>
                        <span style={{ color: 'var(--success-green)' }}>${parseFloat(entry.ganancias_desp_imp).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* 📍 Ruta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-green)', marginTop: '4px' }}></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.origen_direccion}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--didi-orange)', marginTop: '4px' }}></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{entry.destino_direccion}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        <Fuel size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {entry.tipo_vehiculo} • {entry.pasajero_nombre}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' }}>
                        <CreditCard size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {entry.metodo_pago} {entry.metodo_pago === 'En efectivo' ? `($${parseFloat(entry.efectivo_recibido).toFixed(2)})` : ''}
                      </div>
                    </div>
                  </div>
                )}
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
    <div style={{ paddingBottom: '80px' }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/history" element={<HistoryView />} />
        <Route path="/profile" element={<div className="mobile-container"><h1>Configuración</h1><div className="card">Vehículo: Attitude 2019<br />Placas: Mazatlán</div></div>} />
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
