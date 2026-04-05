import React, { useState, useEffect } from 'react';
import { AlertCircle, Fuel, CreditCard } from 'lucide-react';

const HistoryView = () => {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState(new Date().toLocaleDateString('sv'));
  const [period, setPeriod] = useState('day');
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setEntries([]);
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
            setPeriod('');
          }}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

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
            <br /><small style={{ fontSize: '10px' }}>Estamos preparando las tarjetas de rentabilidad acumulada.</small>
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
