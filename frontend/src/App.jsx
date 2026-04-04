import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Camera, History, Settings, AlertCircle, CreditCard, Fuel, TrendingUp, TrendingDown } from 'lucide-react';

// 📊 Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({ currentDisposition: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0 });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('sv'));
  const dailyGoal = 500.00;

  useEffect(() => {
    setLoading(true);
    // 🧹 Limpieza de seguridad: resetear stats para que no se queden datos del día anterior
    setStats({ currentDisposition: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0 });
    fetch(`http://localhost:3001/api/dashboard?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats({ 
          currentDisposition: Number(d.currentDisposition || 0), 
          utilidadReal: Number(d.utilidadReal || 0),
          gastoGasolina: Number(d.gastoGasolina || 0),
          roi: Number(d.roi || 0), 
          totalKmDidi: Number(d.totalKmDidi || 0) 
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

  const { currentDisposition, utilidadReal, gastoGasolina, roi, totalKmDidi } = stats;

  return (
    <div className="mobile-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Mazatlán Audit Pro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Dodge Attitude 2019 • 195k km</p>
        </div>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

      {/* 🏁 Meta Diaria (Cubo de Disposición) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div className="card" style={{ marginBottom: '10px', padding: '10px' }}>
          <div className="card-title" style={{ fontSize: '10px' }}>TOTAL DIDI</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>${currentDisposition.toFixed(2)}</div>
        </div>
        <div className="card" style={{ marginBottom: '10px', padding: '10px', borderColor: 'var(--error-red)', borderLeft: '4px solid var(--error-red)' }}>
          <div className="card-title" style={{ fontSize: '10px', color: 'var(--error-red)' }}>GASOLINA</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--error-red)' }}>-${gastoGasolina.toFixed(2)}</div>
        </div>
        <div className="card" style={{ marginBottom: '10px', padding: '10px', borderColor: 'var(--success-green)', borderLeft: '4px solid var(--success-green)' }}>
          <div className="card-title" style={{ fontSize: '10px', color: 'var(--success-green)' }}>UTILIDAD</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success-green)' }}>${utilidadReal.toFixed(2)}</div>
        </div>
      </div>

      {/* 📊 Progreso de Meta (Utilidad Real) */}
      <div className="card" style={{ marginTop: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">Cubo de Disposición (Meta Hoy)</div>
          <div style={{ fontSize: '12px', color: 'var(--didi-orange)' }}>${dailyGoal} MXN</div>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', marginTop: '8px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((utilidadReal / dailyGoal) * 100, 100)}%`, height: '100%', backgroundColor: 'var(--didi-orange)', transition: 'width 0.5s ease' }}></div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
          {utilidadReal >= dailyGoal 
            ? '✅ ¡META LOGRADA! Todo lo que entre ahora es ganancia pura.' 
            : `Faltan $${(dailyGoal - utilidadReal).toFixed(2)} para la meta de hoy.`}
        </p>
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
        <Link to="/cubo" className="btn btn-secondary" style={{ flexDirection: 'column', height: '100px', fontSize: '14px' }}>
          <Fuel size={32} />
          Cubo Fierro
        </Link>
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
  const [date, setDate] = useState(new Date().toLocaleDateString('sv'));
  const [period, setPeriod] = useState('day'); 
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setEntries([]); // 🧹 Limpiar antes de cargar para evitar ver datos viejos
      try {
        const url = date ? `http://localhost:3001/api/history?date=${date}` : `http://localhost:3001/api/history?period=${period}`;
        const res = await fetch(url);
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
    
    // Auto-detección de 'Hoy' para el color del botón
    if (date === new Date().toLocaleDateString('sv')) {
      setPeriod('day');
    } else if (date) {
      setPeriod('');
    }
  }, [period, date]);

  const toggleExpand = (id) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(item => item !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  return (
    <div className="mobile-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1>VIAJES</h1>
        <input 
          type="date" 
          value={date} 
          onChange={(e) => {
            setDate(e.target.value);
            setPeriod(''); // Al elegir fecha manual, limpiamos el periodo predefinido
          }}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

      {/* 📅 Filtros Rápidos */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => { setPeriod('day'); setDate(new Date().toLocaleDateString('sv')); }} className={`btn ${period === 'day' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Hoy</button>
        <button onClick={() => { setPeriod('week'); setDate(''); }} className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Semana</button>
        <button onClick={() => { setPeriod('month'); setDate(''); }} className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Mes</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Auditando registros...</div>
      ) : (
        (period === 'week' || period === 'month') ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Consolidado {(period === 'week' ? 'semanal' : 'mensual')} próximamente. ✨
            <br/><small style={{ fontSize: '10px' }}>Estamos preparando las tarjetas de rentabilidad acumulada.</small>
          </div>
        ) : entries.length === 0 ? (
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

// ⛽️ Cubo Fierro Component
const CuboFierro = () => {
  const [files, setFiles] = useState([]);
  const [kmAnterior, setKmAnterior] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [latestCost, setLatestCost] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/fuel/history');
      const data = await res.json();
      if (data.success) {
        setReceipts(data.receipts);
        if (data.receipts.length > 0) setLatestCost(Number(data.receipts[0].costo_real_km));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleUpload = async () => {
    if (files.length === 0 || !kmAnterior) return;
    setLoading(true);
    setProgress('Procesando ticket con IA...');
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    formData.append('km_odometro_anterior', kmAnterior);
    try {
      const res = await fetch('http://localhost:3001/api/upload/fuel', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setProgress('✅ Ticket registrado. Costo actualizado automáticamente.');
        setFiles([]);
        setKmAnterior('');
        fetchHistory();
      } else {
        setProgress(`Error: ${data.error}`);
      }
    } catch (e) {
      setProgress('Error de conexión.');
    }
    setLoading(false);
  };

  return (
    <div className="mobile-container">
      <div className="header" style={{ textAlign: 'center' }}>
        <h1>CUBO FIERRO</h1>
      </div>

      {/* 📊 Indicador de Costo Actual */}
      {latestCost && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: latestCost > 2.0 ? '4px solid var(--error-red)' : '4px solid var(--success-green)' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COSTO GASOLINA ACTUAL</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: latestCost > 2.0 ? 'var(--error-red)' : 'var(--success-green)' }}>${latestCost.toFixed(4)}/km</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {latestCost > 2.0 
              ? <TrendingUp size={32} color="var(--error-red)" />
              : <TrendingDown size={32} color="var(--success-green)" />}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>aplicado a nuevos viajes</div>
          </div>
        </div>
      )}

      {/* 📸 Cargador de Ticket */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Registrar Nueva Carga</div>

        <div style={{ position: 'relative', height: '120px', border: '2px dashed #444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {files.length > 0 ? (
            <div style={{ textAlign: 'center' }}>
              <Fuel size={32} color="var(--success-green)" />
              <div style={{ fontSize: '12px', marginTop: '8px' }}>{files.length} foto(s) lista(s)</div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Fuel size={32} color="var(--didi-orange)" />
              <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>Ticket + Odómetro (máx 5 fotos)</div>
            </div>
          )}
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(prev => [...prev, ...Array.from(e.target.files)])} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
        </div>

        {/* 📸 Lista de Archivos Seleccionados con opción de BORRAR */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {files.map((file, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Fuel size={14} color="var(--success-green)" />
                  <span style={{ fontSize: '11px', color: '#eee', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                </div>
                <button 
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', color: 'var(--error-red)', cursor: 'pointer', padding: '4px' }}
                >
                  <AlertCircle size={16} />
                </button>
              </div>
            ))}
            <button 
              onClick={() => setFiles([])} 
              style={{ fontSize: '10px', color: 'var(--error-red)', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Limpiar todo
            </button>
          </div>
        )}

        <div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '6px' }}>ODÓMETRO ANTERIOR (km apertura o última carga)</div>
          <input
            type="number"
            value={kmAnterior}
            onChange={(e) => setKmAnterior(e.target.value)}
            placeholder="Ej: 195471"
            style={{ width: '100%', padding: '10px', backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '8px', color: 'white', fontSize: '16px', boxSizing: 'border-box' }}
          />
        </div>

        {progress && <p style={{ color: 'var(--didi-orange)', fontSize: '12px', textAlign: 'center' }}>{progress}</p>}

        <button className="btn btn-primary" disabled={files.length === 0 || !kmAnterior || loading} onClick={handleUpload}>
          {loading ? 'Procesando con IA...' : '⛽ Registrar Carga'}
        </button>
      </div>

      {/* 📜 Historial de Cargas */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '10px' }}>HISTORIAL DE CARGAS</div>
        {receipts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Sin registros aún. ¡Sube tu primer ticket!</div>
        ) : (
          receipts.map((r, i) => {
            const prevCost = i < receipts.length - 1 ? Number(receipts[i + 1].costo_real_km) : null;
            const isUp = prevCost && Number(r.costo_real_km) > prevCost;
            return (
              <div key={r.id} className="card" style={{ borderLeft: isUp ? '4px solid var(--error-red)' : '4px solid var(--success-green)', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{r.gasolinera}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{r.fecha} • {r.producto}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: isUp ? 'var(--error-red)' : 'var(--success-green)' }}>${Number(r.costo_real_km).toFixed(4)}/km</div>
                    {prevCost && <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{isUp ? '▲' : '▼'} vs anterior</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #333' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LITROS</div>
                    <div style={{ fontSize: '13px' }}>{Number(r.litros).toFixed(2)} L</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>PRECIO/L</div>
                    <div style={{ fontSize: '13px' }}>${Number(r.precio_litro).toFixed(4)}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>KM RECORRIDOS</div>
                    <div style={{ fontSize: '13px' }}>{r.km_recorridos} km</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>TOTAL</div>
                    <div style={{ fontSize: '13px' }}>${Number(r.total_pagado).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
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
        <Route path="/cubo" element={<CuboFierro />} />
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
          <span>Viajes</span>
        </Link>
        <Link to="/cubo" className={`nav-item ${location.pathname === '/cubo' ? 'active' : ''}`}>
          <Fuel size={24} />
          <span>Cubo</span>
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
