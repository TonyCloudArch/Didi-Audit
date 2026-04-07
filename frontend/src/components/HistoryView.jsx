import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Fuel, CreditCard, Camera, Info } from 'lucide-react';

const HistoryView = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || new Date().toLocaleDateString('sv');

  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(initialDate);
  const [period, setPeriod] = useState(searchParams.get('date') ? '' : 'day');
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);
  const [privateMode, setPrivateMode] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalInputs, setPersonalInputs] = useState({ km: '', desc: '' });
  const [privEntry, setPrivEntry] = useState({ pago: '', distancia: '', descripcion: '' });

  const [sortBy, setSortBy] = useState('time'); // time, roi, distance, profit

  const fetchHistory = async () => {
    setLoading(true);
    setEntries([]);
    try {
      const url = date ? `http://localhost:3001/api/history?date=${date}` : `http://localhost:3001/api/history?period=${period}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        let allEntries = [...data.entries];

        // Sorting Logic
        allEntries.sort((a, b) => {
          if (sortBy === 'time') {
            const dateA = a.tipo === 'didi' ? a.fecha_hora_viaje : a.fecha;
            const dateB = b.tipo === 'didi' ? b.fecha_hora_viaje : b.fecha;
            return new Date(dateB) - new Date(dateA);
          }
          if (sortBy === 'roi') return b.roi_km - a.roi_km;
          if (sortBy === 'distance') return b.distancia - a.distancia;
          if (sortBy === 'profit') return (b.tipo === 'privado' ? b.pago : b.ganancia_real) - (a.tipo === 'privado' ? a.pago : a.ganancia_real);
          if (sortBy === 'duration') {
            const parseDur = (s) => {
              if (!s) return 0;
              const minutes = s.match(/(\d+)m/) ? parseInt(s.match(/(\d+)m/)[1]) : 0;
              const seconds = s.match(/(\d+)s/) ? parseInt(s.match(/(\d+)s/)[1]) : 0;
              return (minutes * 60) + seconds;
            };
            return parseDur(b.duracion) - parseDur(a.duracion);
          }
          return 0;
        });

        setEntries(allEntries);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
    if (date) {
      localStorage.setItem('shared_audit_date', date); // 🏁 Sincronizar de vuelta al Dashboard
    }
    if (date === new Date().toLocaleDateString('sv')) {
      setPeriod('day');
    } else if (date) {
      setPeriod('');
    }
  }, [period, date, sortBy]);

  const toggleExpand = (id) => {
    if (expandedIds.includes(id)) {
      setExpandedIds(expandedIds.filter(item => item !== id));
    } else {
      setExpandedIds([...expandedIds, id]);
    }
  };

  const handlePrivateSubmit = async () => {
    if (!privEntry.pago || !privEntry.distancia) return;
    try {
      const res = await fetch('http://localhost:3001/api/private_trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...privEntry, date })
      });
      if (res.ok) {
        setPrivateMode(false);
        setPrivEntry({ pago: '', distancia: '', descripcion: '' });
        fetchHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegisterPersonal = async () => {
    if (!personalInputs.km || !personalInputs.desc) return;
    const res = await fetch('http://localhost:3001/api/personal_movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, distancia: Number(personalInputs.km), descripcion: personalInputs.desc })
    });
    if (res.ok) {
      setShowPersonalModal(false);
      setPersonalInputs({ km: '', desc: '' });
      fetchHistory();
    }
  };

  const totalIncomeAll = entries.reduce((acc, curr) => acc + parseFloat(curr.tipo === 'privado' ? curr.pago : (curr.tipo === 'personal' ? 0 : curr.ganancias_desp_imp)), 0);
  const totalKmAll = entries.reduce((acc, curr) => acc + parseFloat(curr.distancia), 0);
  const avgEfficiencyAll = totalKmAll > 0 ? (totalIncomeAll / totalKmAll) : 0;

  return (
    <div className="mobile-container">
      <div className="header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        position: 'relative' // Para centrar el absoluto
      }}>
        <h1 style={{ margin: 0 }}>VIAJES</h1>

        {entries.length > 0 && (
          <div style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            fontWeight: 900,
            color: avgEfficiencyAll >= 20 ? '#FFD700' : (avgEfficiencyAll >= 12 ? '#00e5ff' : (avgEfficiencyAll >= 8 ? 'var(--success-green)' : (avgEfficiencyAll >= 6 ? 'var(--didi-orange)' : 'var(--error-red)'))),
            textShadow: avgEfficiencyAll >= 20 ? '0 0 15px rgba(255,215,0,0.5)' : 'none'
          }}>
            {avgEfficiencyAll >= 20 && <span style={{ marginRight: '6px' }}>🎫</span>}
            ${avgEfficiencyAll.toFixed(2)}
          </div>
        )}

        <input
          type="date"
          value={date}
          onChange={(e) => {
            const newDate = e.target.value;
            setDate(newDate);
            setSearchParams({ date: newDate });
          }}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
        <button onClick={() => setSortBy('time')} className={`btn ${sortBy === 'time' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '10px', width: 'auto', flexShrink: 0 }}>ORDENAR</button>
        <div style={{ width: '1px', backgroundColor: '#333', height: '30px', flexShrink: 0 }}></div>
        <button onClick={() => setSortBy('roi')} className={`btn ${sortBy === 'roi' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '10px', width: 'auto', flexShrink: 0 }}>EFICIENCIA</button>
        <button onClick={() => setSortBy('profit')} className={`btn ${sortBy === 'profit' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '10px', width: 'auto', flexShrink: 0 }}>GANANCIA</button>
        <button onClick={() => setSortBy('distance')} className={`btn ${sortBy === 'distance' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '10px', width: 'auto', flexShrink: 0 }}>DISTANCIA</button>
        <button onClick={() => setSortBy('duration')} className={`btn ${sortBy === 'duration' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px 12px', fontSize: '10px', width: 'auto', flexShrink: 0 }}>DURACION</button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <Link to={`/audit?date=${date}`} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '50px', fontSize: '14px', marginBottom: '10px' }}>
          <Camera size={20} />
          Lector Mágico (Auditoría IA)
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button onClick={() => setPrivateMode(!privateMode)} className="btn btn-secondary" style={{ padding: '8px', fontSize: '11px', border: '1px solid #3498db', color: '#3498db' }}>
            {privateMode ? '✖️ Cancelar' : '➕ Viaje Privado'}
          </button>
          <button onClick={() => setShowPersonalModal(true)} className="btn btn-secondary" style={{ padding: '8px', fontSize: '11px', border: '1px solid #9b59b6', color: '#9b59b6' }}>
            ➕ Mov. Personal
          </button>
        </div>
      </div>

      {privateMode && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--didi-orange)', animation: 'slideDown 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PAGO RECEIVED</label>
              <input type="number" value={privEntry.pago} onChange={e => setPrivEntry({ ...privEntry, pago: e.target.value })} placeholder="$0.00" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>KM RECORRIDOS</label>
              <input type="number" value={privEntry.distancia} onChange={e => setPrivEntry({ ...privEntry, distancia: e.target.value })} placeholder="0.0" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white' }} />
            </div>
          </div>
          <input type="text" value={privEntry.descripcion} onChange={e => setPrivEntry({ ...privEntry, descripcion: e.target.value })} placeholder="Descripción (Ej: Fuera de App Centro)" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white', marginBottom: '10px' }} />
          <button onClick={handlePrivateSubmit} className="btn btn-primary" style={{ width: '100%' }}>Guardar Viaje Privado</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Auditando registros...</div>
      ) : (
        (period === 'week' || period === 'month') ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Consolidado {(period === 'week' ? 'semanal' : 'mensual')} próximamente. ✨
            <br /><small style={{ fontSize: '10px' }}>Estamos preparando las tarjetas de rentabilidad acumulada.</small>
          </div>
        ) : entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>No hay viajes registrados en este periodo.</div>
        ) : (
          entries.map((entry) => {
            const isRecompensa = entry.tipo === 'recompensa';
            const isCancelacion = entry.tipo === 'cancelacion';
            const isPrivate = entry.tipo === 'privado';
            const isPersonal = entry.tipo === 'personal';
            const isGolden = !isPrivate && !isPersonal && entry.calificacion_seleccion === 'Boleto Dorado';
            const isSuperElite = !isPrivate && !isPersonal && entry.calificacion_seleccion === 'Súper Élite';
            const isPobre = !isPrivate && !isPersonal && entry.calificacion_seleccion === 'Pobre';
            const isFatal = !isPrivate && !isPersonal && entry.calificacion_seleccion === 'Fatal';
            const isExpanded = expandedIds.includes(entry.id + (entry.tipo || ''));

            const statusColor = isPersonal ? '#9b59b6' : (isPrivate ? '#3498db' : (isRecompensa ? 'var(--success-green)' : (isCancelacion ? 'var(--didi-orange)' : (isGolden ? '#FFD700' : (isSuperElite ? '#00e5ff' : (isPobre ? 'var(--didi-orange)' : (isFatal ? 'var(--error-red)' : 'var(--success-green)')))))));

            return (
              <div key={entry.id + (entry.tipo || '')} onClick={() => toggleExpand(entry.id + (entry.tipo || ''))} className="card" style={{
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: isExpanded ? '20px' : '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1px' }}>
                  <div style={{ width: '20%', textAlign: 'left' }}>
                    <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>PAGO</div>
                    <div style={{ fontSize: '14px', color: isPersonal ? '#444' : 'var(--text-muted)', fontWeight: 'normal' }}>
                      {isPersonal ? '$0.00' : `$${parseFloat(isPrivate ? entry.pago : entry.ganancias_desp_imp).toFixed(2)}`}
                    </div>
                  </div>
                  <div style={{ width: '20%', textAlign: 'center' }}>
                    <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{isPersonal ? 'TIPO' : (isRecompensa ? 'TIPO' : 'DURACION')}</div>
                    <div style={{ fontSize: '14px', color: (isRecompensa || isPersonal) ? statusColor : 'var(--text-muted)' }}>
                      {isPersonal ? 'PERSONAL' : (isRecompensa ? 'BONO' : (entry.duracion ? entry.duracion.replace('32s', 'm').replace(' ', '') : '--'))}
                    </div>
                  </div>
                  <div style={{ width: '20%', textAlign: 'center' }}>
                    <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{isCancelacion ? 'CANC.' : 'DISTANCIA'}</div>
                    <div style={{ fontSize: '14px', color: isCancelacion ? 'var(--didi-orange)' : 'var(--text-muted)' }}>
                      {entry.distancia}
                    </div>
                  </div>
                  <div style={{ width: '20%', textAlign: 'center' }}>
                    <div style={{ fontSize: '7.5px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>EFICIENCIA</div>
                    <div style={{ fontSize: '14px', color: isPersonal ? '#444' : statusColor, fontWeight: 'normal' }}>
                      {isPersonal ? '--' : `$${parseFloat(entry.roi_km || 0).toFixed(1)}`}
                    </div>
                  </div>
                  <div style={{ width: '20%', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', color: isPersonal ? '#444' : 'white', fontWeight: 'bold' }}>
                      {isPersonal ? '--' : `$${Math.round(entry.ganancia_real || (isPrivate ? entry.pago : 0))}`}
                    </div>
                  </div>
                </div>

                {isExpanded && (isPrivate || isPersonal) && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                    <div style={{ fontSize: '14px', color: isPersonal ? '#9b59b6' : '#eee', fontWeight: 'bold' }}>{entry.descripcion}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Registrado el {new Date(isPersonal ? entry.fecha : entry.fecha).toLocaleDateString()}</div>
                  </div>
                )}

                {isExpanded && !isPrivate && !isPersonal && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <AlertCircle size={16} color="var(--didi-orange)" />
                      <div style={{ fontSize: '12px' }}>
                        <strong>{entry.duracion}</strong> • Realizado el {entry.fecha_hora_viaje}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Pagado por el Pasajero</span>
                        <span>${parseFloat(entry.pagado_por_el_pasajero).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Comisión DiDi Estimada</span>
                        <span style={{ color: 'var(--error-red)' }}>-${Math.abs(parseFloat(entry.tarifa_de_servicio || 0) + parseFloat(entry.cuota_de_solicitud || 0) + parseFloat(entry.tarifa_base_total || 0)).toFixed(2)}</span>
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
                        <span style={{ color: 'var(--text-muted)' }}>{entry.impuesto_tipo || 'Impuesto (IVA/Local)'}</span>
                        <span style={{ color: 'var(--error-red)' }}>-${Math.abs(parseFloat(entry.impuesto || 0)).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid #333', paddingTop: '10px', marginTop: '5px', fontWeight: 'bold' }}>
                        <span>Utilidad Neta (Fin)</span>
                        <span style={{ color: 'var(--success-green)' }}>${parseFloat(entry.ganancias_desp_imp).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--error-red)' }}>
                        <span style={{ opacity: 0.8 }}>Gasolina Estimada (Ruta)</span>
                        <span>-${(parseFloat(entry.distancia) * 2.27).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#FFF', fontWeight: '900', borderTop: '2px solid #555', paddingTop: '10px', marginTop: '5px' }}>
                        <span>GANANCIA POR EL VIAJE</span>
                        <span>${parseFloat(entry.ganancia_real).toFixed(2)}</span>
                      </div>
                    </div>

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
                        {entry.metodo_pago} {entry.metodo_pago.toLowerCase().includes('efectivo') ? `($${parseFloat(entry.efectivo_recibido || entry.pagado_por_el_pasajero || 0).toFixed(2)})` : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )
      )}

      {/* 🏠 Modal Movimiento Personal */}
      {showPersonalModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '14px', textAlign: 'center', color: '#9b59b6' }}>REGISTRAR MOVIMIENTO PERSONAL</h3>
            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>Estos KM se restarán del negocio para proteger tu IQ.</p>
            
            <div>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>DISTANCIA RECORRIDA (KM)</div>
              <input 
                type="number" 
                value={personalInputs.km} 
                onChange={e => setPersonalInputs({ ...personalInputs, km: e.target.value })}
                placeholder="Ej: 14"
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '6px' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>CONCEPTO (NOMBRE Y APELLIDO)</div>
              <input 
                type="text" 
                value={personalInputs.desc} 
                onChange={e => setPersonalInputs({ ...personalInputs, desc: e.target.value })}
                placeholder="Ej: Gym / Inglés Esposa"
                style={{ width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '6px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowPersonalModal(false)} style={{ flex: 1 }}>Cerrar</button>
              <button className="btn" onClick={handleRegisterPersonal} style={{ flex: 1, backgroundColor: '#9b59b6', color: 'white' }}>Guardar Movimiento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
