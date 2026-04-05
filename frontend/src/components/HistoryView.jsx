import React, { useState, useEffect } from 'react';
import { AlertCircle, Fuel, CreditCard } from 'lucide-react';

const HistoryView = () => {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date().toLocaleDateString('sv'));
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);
  const [privateMode, setPrivateMode] = useState(false);
  const [privEntry, setPrivEntry] = useState({ pago: '', distancia: '', descripcion: '' });

  const fetchHistory = async () => {
    setLoading(true);
    setEntries([]);
    try {
      const url = date ? `http://localhost:3001/api/history?date=${date}` : `http://localhost:3001/api/history?period=${period}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        const allEntries = [...data.entries].sort((a, b) => {
          const dateA = a.tipo === 'didi' ? a.fecha_hora_viaje : a.fecha;
          const dateB = b.tipo === 'didi' ? b.fecha_hora_viaje : b.fecha;
          return new Date(dateB) - new Date(dateA);
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

  const totalIncomeAll = entries.reduce((acc, curr) => acc + parseFloat(curr.tipo === 'privado' ? curr.pago : curr.ganancias_desp_imp), 0);
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
            color: avgEfficiencyAll >= 20 ? '#FFD700' : (avgEfficiencyAll >= 12 ? '#00e5ff' : (avgEfficiencyAll >= 8 ? 'var(--success-green)' : 'var(--error-red)')),
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
            setDate(e.target.value);
            setPeriod('');
          }}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => { setPeriod('day'); setDate(new Date().toLocaleDateString('sv')); }} className={`btn ${period === 'day' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '8px', fontSize: '12px' }}>Hoy</button>
        <button onClick={() => setPrivateMode(!privateMode)} className="btn btn-secondary" style={{ padding: '8px', fontSize: '12px', border: '1px solid var(--didi-orange)', color: 'var(--didi-orange)' }}>
          {privateMode ? '✖️ Cancelar' : '➕ Viaje Privado'}
        </button>
      </div>

      {privateMode && (
        <div className="card" style={{ marginBottom: '20px', border: '1px solid var(--didi-orange)', animation: 'slideDown 0.3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PAGO RECEIVED</label>
              <input type="number" value={privEntry.pago} onChange={e => setPrivEntry({...privEntry, pago: e.target.value})} placeholder="$0.00" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white' }} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>KM RECORRIDOS</label>
              <input type="number" value={privEntry.distancia} onChange={e => setPrivEntry({...privEntry, distancia: e.target.value})} placeholder="0.0" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white' }} />
            </div>
          </div>
          <input type="text" value={privEntry.descripcion} onChange={e => setPrivEntry({...privEntry, descripcion: e.target.value})} placeholder="Descripción (Ej: Fuera de App Centro)" style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '6px', color: 'white', marginBottom: '10px' }} />
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
            const isPrivate = entry.tipo === 'privado';
            const isGolden = !isPrivate && entry.calificacion_seleccion === 'Boleto Dorado';
            const isSuperElite = !isPrivate && entry.calificacion_seleccion === 'Súper Élite';
            const isBad = !isPrivate && entry.calificacion_seleccion === 'Ineficiente';
            const isExpanded = expandedIds.includes(entry.id + (entry.tipo || ''));
            
            const statusColor = isPrivate ? '#3498db' : (isGolden ? '#FFD700' : (isSuperElite ? '#00e5ff' : (isBad ? 'var(--error-red)' : 'var(--success-green)')));

            return (
              <div key={entry.id + (entry.tipo || '')} onClick={() => toggleExpand(entry.id + (entry.tipo || ''))} className="card" style={{
                cursor: 'pointer',
                borderLeft: `4px solid ${statusColor}`,
                transition: 'all 0.3s ease',
                padding: isExpanded ? '20px' : '15px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '5px' }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>{isPrivate ? 'PRIVADO' : 'PAGO'}</div>
                    <div style={{ fontSize: '15px', color: isPrivate ? '#3498db' : 'var(--text-muted)' }}>
                      ${parseFloat(isPrivate ? entry.pago : entry.ganancias_desp_imp).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>DISTANCIA</div>
                    <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                      {entry.distancia} km
                    </div>
                  </div>
                  {!isPrivate && (
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>EFICIENCIA</div>
                      <div style={{ fontSize: '15px', color: statusColor, fontWeight: isGolden ? '900' : 'normal' }}>
                        ${parseFloat(entry.roi_km).toFixed(2)}
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '1px' }}>GANANCIA</div>
                    <div style={{ fontSize: '15px', color: 'var(--success-green)' }}>
                      ${parseFloat(isPrivate ? entry.pago : entry.ganancia_real).toFixed(2)}
                    </div>
                  </div>
                </div>

                {isExpanded && isPrivate && (
                   <div style={{ marginTop: '15px', borderTop: '1px solid #333', paddingTop: '15px' }}>
                      <div style={{ fontSize: '12px', color: '#eee' }}>{entry.descripcion}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>Registrado el {new Date(entry.fecha).toLocaleDateString()}</div>
                   </div>
                )}

                {isExpanded && !isPrivate && (
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
                        <span>Utilidad Neta (Meta)</span>
                        <span style={{ color: 'var(--success-green)' }}>${parseFloat(entry.ganancias_desp_imp).toFixed(2)}</span>
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
                        {entry.metodo_pago} {entry.metodo_pago === 'En efectivo' ? `($${parseFloat(entry.efectivo_received || entry.efectivo_recibido).toFixed(2)})` : ''}
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

export default HistoryView;
