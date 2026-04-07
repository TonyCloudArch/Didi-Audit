import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, Fuel, AlertCircle, TrendingUp, TrendingDown, Target, Zap, ChevronLeft, ChevronRight, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// 🛰️ Fix de Iconos Leaflet (Standard)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 🧭 Auto-ajuste de vista del Radar
const MapResizer = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [points, map]);
  return null;
};

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = searchParams.get('date') || new Date().toLocaleDateString('sv');
  const dateInputRef = useRef(null);

  const [stats, setStats] = useState({ currentDisposition: 0, ingresoBruto: 0, cuotaDidi: 0, incentivos: 0, impuestos: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0, ingresoEfectivo: 0, ingresoTarjeta: 0, km_muertos: 0, km_didi: 0, km_privado: 0, km_personal: 0, shift_status: null });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(initialDate);
  const [activeShift, setActiveShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftInputs, setShiftInputs] = useState({ odometer: '', cash: '' });
  const [denoms, setDenoms] = useState({ m1: 0, m2: 0, m5: 0, m10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 });
  const dailyGoal = 500.00;
  const [showRestDayModal, setShowRestDayModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncOdo, setSyncOdo] = useState('');
  const [gpsRoute, setGpsRoute] = useState([]); // [[lat, lng], ...]
  const [lastPos, setLastPos] = useState(null);

  const totalDenoms = (denoms.m1 * 1) + (denoms.m2 * 2) + (denoms.m5 * 5) + (denoms.m10 * 10) + (denoms.b20 * 20) + (denoms.b50 * 50) + (denoms.b100 * 100) + (denoms.b200 * 200) + (denoms.b500 * 500);

  const changeDate = (offset) => {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    const newDate = d.toISOString().split('T')[0];
    setDate(newDate);
    setSearchParams({ date: newDate });
  };

  const formatDateLabel = (dtString) => {
    const d = new Date(dtString + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase();
  };

  const checkShift = () => {
    fetch('http://localhost:3001/api/shifts/active')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveShift(d.activeShift); });
  };

  const fetchDashboardData = () => {
    setLoading(true);
    checkShift();
    setStats({ currentDisposition: 0, ingresoBruto: 0, cuotaDidi: 0, incentivos: 0, impuestos: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0, ingresoEfectivo: 0, ingresoTarjeta: 0, km_muertos: 0, km_didi: 0, km_privado: 0, km_personal: 0, isRestDay: false });
    fetch(`http://localhost:3001/api/dashboard?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setStats({
            currentDisposition: Number(d.currentDisposition || 0),
            ingresoBruto: Number(d.ingresoBruto || 0),
            cuotaDidi: Number(d.cuotaDidi || 0),
            incentivos: Number(d.incentivos || 0),
            impuestos: Number(d.impuestos || 0),
            utilidadReal: Number(d.utilidadReal || 0),
            gastoGasolina: Number(d.gastoGasolina || 0),
            roi: Number(d.roi || 0),
            totalKmDidi: Number(d.total_km || 0),
            ingresoEfectivo: Number(d.ingresoEfectivo || 0),
            ingresoTarjeta: Number(d.ingresoTarjeta || 0),
            km_muertos: Number(d.km_muertos || 0),
            km_didi: Number(d.km_didi || 0),
            km_privado: Number(d.km_privado || 0),
            km_personal: Number(d.km_personal || 0),
            isRestDay: Number(d.shift_initial_odometer) === -1,
            shift_status: d.shift_status
          });
          localStorage.setItem('shared_audit_date', date); // 🏁 Sincronizar fecha global
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchGpsData = () => {
    fetch(`http://localhost:3001/api/gps/route?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.route) {
          setGpsRoute(d.route);
          setLastPos(d.lastPos);
        }
      })
      .catch(e => console.error("GPS fetch error:", e));
  };

  useEffect(() => {
    fetchDashboardData();
    fetchGpsData();
  }, [date]);

  useEffect(() => {
    let interval;
    if (activeShift && date === new Date().toLocaleDateString('sv')) {
      interval = setInterval(fetchGpsData, 30000); // Radar refresh cada 30s
    }
    return () => clearInterval(interval);
  }, [date, activeShift]);

  const handleShiftAction = async () => {
    const isOpening = !activeShift;
    const url = isOpening ? 'http://localhost:3001/api/shifts/open' : 'http://localhost:3001/api/shifts/close';
    const body = isOpening
      ? { initial_odometer: Number(shiftInputs.odometer), initial_cash: totalDenoms || Number(shiftInputs.cash), denominations: { ...denoms, total: totalDenoms } }
      : { shift_id: activeShift.id, final_odometer: Number(shiftInputs.odometer), final_cash_counted: totalDenoms || Number(shiftInputs.cash), denominations: { ...denoms, total: totalDenoms } };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      setShowShiftModal(false);
      setShiftInputs({ odometer: '', cash: '' });
      setDenoms({ m1: 0, m2: 0, m5: 0, m10: 0, b20: 0, b50: 0, b100: 0, b200: 0, b500: 0 });
      fetchDashboardData();
    }
  };

  const handleSyncOdometer = async () => {
    if (!syncOdo || !activeShift) return;
    const response = await fetch('http://localhost:3001/api/shifts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: activeShift.id, current_odometer: Number(syncOdo) })
    });
    if (response.ok) {
      setShowSyncModal(false);
      setSyncOdo('');
      fetchDashboardData();
    } else {
      alert("Error al sincronizar");
    }
  };

  const handleMarkRestDayConfirm = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/shifts/rest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      const data = await response.json();
      if (data.success) {
        setShowRestDayModal(false);
        fetchDashboardData();
      } else {
        alert(data.error || "Error al registrar descanso");
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };



  const { currentDisposition, ingresoBruto, cuotaDidi, incentivos, impuestos, utilidadReal, gastoGasolina, roi, totalKmDidi, ingresoEfectivo, ingresoTarjeta, km_muertos, km_didi, km_privado, km_personal, isRestDay } = stats;
  const isToday = date === new Date().toLocaleDateString('sv');
  const isFuture = date > new Date().toLocaleDateString('sv');
  const isPast = date < new Date().toLocaleDateString('sv');

  return (
    <div className="mobile-container">
      <div className="header" style={{ display: 'grid', gridTemplateColumns: '150px 1fr 150px', alignItems: 'center', padding: '15px', borderBottom: '1px solid #222', gap: '5px' }}>
        <button
          onClick={() => !isRestDay && !isFuture && setShowShiftModal(true)}
          className="btn"
          style={{
            fontSize: '13px',
            width: '150px',
            height: '42px',
            borderRadius: '0px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: (isRestDay || isFuture || isPast) ? (isPast && activeShift ? 'var(--brand-purple)' : '#111') : (stats.shift_status === 'CLOSED' ? '#222' : (activeShift ? 'var(--brand-purple)' : 'var(--success-green)')),
            color: (isRestDay || isFuture || isPast) ? (isPast && activeShift ? '#fff' : '#444') : (stats.shift_status === 'CLOSED' ? '#666' : (activeShift ? '#fff' : '#000')),
            fontWeight: '900',
            border: (isRestDay || isFuture || (isPast && !activeShift)) ? '1px dashed #333' : 'none',
            cursor: (isRestDay || isFuture || (stats.shift_status === 'CLOSED' && !activeShift)) ? 'not-allowed' : 'pointer',
            letterSpacing: '0.5px'
          }}
          disabled={isRestDay || isFuture || (stats.shift_status === 'CLOSED' && !activeShift)}
        >
          {isRestDay ? 'DESCANSO' : isFuture ? 'INACTIVO' : (stats.shift_status === 'CLOSED' && !activeShift ? 'CERRADO' : (activeShift ? `FINALIZAR` : 'INICIAR'))}
        </button>

        <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'white', fontSize: '38px', fontWeight: '900', lineHeight: 1 }}>${currentDisposition.toFixed(0)}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', backgroundColor: '#1a1a1a', padding: '1px', height: '42px', borderRadius: '0px', border: '1px solid #333', width: '150px' }}>
          <button onClick={() => changeDate(-1)} style={{ background: 'none', border: 'none', color: '#888', height: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronLeft size={20} />
          </button>

          <div
            onClick={() => dateInputRef.current && dateInputRef.current.showPicker()}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 3, justifyContent: 'center', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '14px', fontWeight: '900', color: 'white', letterSpacing: '0.5px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              {formatDateLabel(date).replace('-', ' ')}
            </span>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => {
                const newDate = e.target.value;
                setDate(newDate);
                setSearchParams({ date: newDate });
              }}
              style={{ position: 'absolute', top: 0, left: 0, width: '0', height: '0', opacity: 0, pointerEvents: 'none' }}
            />
          </div>

          <button onClick={() => changeDate(1)} style={{ background: 'none', border: 'none', color: '#888', height: '100%', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>


      {/* 🧠 Inteligencia Financiera (ROI Diario) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <Zap size={30} style={{ marginBottom: '15px', color: 'var(--didi-orange)', opacity: 0.5 }} />
          <div style={{ fontSize: '10px', letterSpacing: '1px' }}>AUDITANDO CAPITAL...</div>
        </div>
      ) : (
        <>

          <div className="card" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            alignItems: 'center',
            padding: '10px',
            marginBottom: '6px',
            opacity: isFuture ? 0.3 : 1
          }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid #222' }}>
              <div className="card-title">EFICIENCIA</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: isFuture ? '#444' : (roi >= 20 ? '#FFD700' : (roi >= 12 ? '#00e5ff' : (roi >= 8 ? 'var(--success-green)' : (roi >= 6 ? 'var(--didi-orange)' : 'var(--error-red)'))))
              }}>
                ${roi.toFixed(2)}<span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '2px', fontWeight: 'normal' }}>/km</span>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div className="card-title">UTILIDAD REAL</div>
              <div style={{
                fontSize: '24px',
                fontWeight: '900',
                color: 'var(--success-green)'
              }}>
                ${(utilidadReal - ((gastoGasolina / (totalKmDidi > 0 ? (totalKmDidi - km_personal) : 1)) * km_personal)).toFixed(2)}
              </div>
            </div>
          </div>


          <div className="card" style={{ marginTop: '0', opacity: (date > new Date().toLocaleDateString('sv')) ? 0.3 : 1, padding: '10px', marginBottom: '6px' }}>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '0px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min((utilidadReal / dailyGoal) * 100, 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #ffffff 0%, var(--success-green) 100%)',
                transition: 'width 0.5s ease',
                boxShadow: utilidadReal >= dailyGoal ? '0 0 10px var(--success-green)' : 'none'
              }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(date > new Date().toLocaleDateString('sv'))
                  ? 'Aún no se puede registrar progreso en el futuro.'
                  : utilidadReal >= dailyGoal
                    ? <span style={{ color: 'var(--success-green)' }}>✅ ¡META LOGRADA!</span>
                    : `Faltan $${(dailyGoal - (utilidadReal - ((gastoGasolina / (totalKmDidi > 0 ? (totalKmDidi - km_personal) : 1)) * km_personal))).toFixed(2)}`}
              </div>
              <div style={{ fontSize: '11px', color: utilidadReal >= dailyGoal ? 'var(--success-green)' : 'var(--text-muted)', opacity: 0.8 }}>META: ${dailyGoal} MXN</div>
            </div>
          </div>

          {/* 🎭 La Auditoría Maestra Financiera */}
          <h3 style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Cascada Financiera de Rentabilidad</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '2px', marginBottom: '6px', opacity: (date > new Date().toLocaleDateString('sv')) ? 0.3 : 1 }}>

            {/* ROW 1: Espejismos y Bonos */}
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">TOTAL INGRESO (FICTICIO)</div>
              <div style={{ fontSize: '18px' }}>${ingresoBruto.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">INCENTIVOS Y BONOS</div>
              <div style={{ fontSize: '18px' }}>+${incentivos.toFixed(2)}</div>
            </div>

            {/* ROW 2: Liquidez Cruda (Lo que hay en la mano/cartera) */}
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">COBRADO EN EFECTIVO</div>
              <div style={{ fontSize: '16px' }}>${ingresoEfectivo.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">DEPÓSITO TARJETA</div>
              <div style={{ fontSize: '16px' }}>${ingresoTarjeta.toFixed(2)}</div>
            </div>

            {/* ROW 3: Evasiones y Costos Adheridos (Las "Mordidas" operativas) */}
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">TAJADA DE LA APP (DIDI)</div>
              <div style={{ fontSize: '18px', color: 'var(--error-red)' }}>-${Math.abs(cuotaDidi || 0).toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">IMPUESTOS DICTADOS</div>
              <div style={{ fontSize: '18px', color: 'var(--error-red)' }}>-${Math.abs(impuestos || 0).toFixed(2)}</div>
            </div>

            {/* ⛽️ IMPACTO DE COMBUSTIBLE PROPORCIONAL */}
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">GASOLINA (NEGOCIO)</div>
              <div style={{ fontSize: '18px', color: 'var(--error-red)' }}>-${gastoGasolina.toFixed(2)}</div>
            </div>
            <div className="card" style={{ padding: '8px', textAlign: 'center', marginBottom: '0' }}>
              <div className="card-title">GASOLINA PERSONAL</div>
              <div style={{ fontSize: '18px', color: 'var(--error-red)' }}>-${((gastoGasolina / (totalKmDidi > 0 ? (totalKmDidi - km_personal) : 1)) * km_personal).toFixed(2)}</div>
            </div>
          </div>

          {/* 🧭 Eficiencia Logística del Vehículo (Combustible quemado) */}
          <div className="card" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', gap: '6px', opacity: (date > new Date().toLocaleDateString('sv')) ? 0.3 : 1, padding: '10px', marginBottom: '6px' }}>
            <div className="card-title" style={{ fontSize: '9px', textAlign: 'center', marginBottom: '2px' }}>KILÓMETROS TOTALES: {totalKmDidi.toFixed(1)}</div>
            <div style={{ display: 'flex', height: '10px', borderRadius: '0px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ width: `${totalKmDidi > 0 ? (km_didi / totalKmDidi) * 100 : 0}%`, backgroundColor: 'var(--brand-purple)' }} title="DiDi"></div>
              <div style={{ width: `${totalKmDidi > 0 ? (km_privado / totalKmDidi) * 100 : 0}%`, backgroundColor: '#3498db' }} title="Privado"></div>
              <div style={{ width: `${totalKmDidi > 0 ? (km_personal / totalKmDidi) * 100 : 0}%`, backgroundColor: '#888' }} title="Personal"></div>
              <div style={{ width: `${totalKmDidi > 0 ? (km_muertos / totalKmDidi) * 100 : 0}%`, backgroundColor: 'var(--error-red)' }} title="Muertos"></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '0px', backgroundColor: 'var(--brand-purple)' }}></div>
                <span>DIDI</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '0px', backgroundColor: '#3498db' }}></div>
                <span>PRIV</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '0px', backgroundColor: '#888' }}></div>
                <span>PERS</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '0px', backgroundColor: 'var(--error-red)' }}></div>
                <span>MUERTOS</span>
              </div>
            </div>
          </div>

          {/* 🗺️ RADAR TÁCTICO GPS (LUGAR PERFECTO) */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', height: '320px', border: '1px solid #1a1a1a', position: 'relative' }}>

            <MapContainer
              center={[23.2329, -106.4062]} // Mazatlán Center
              zoom={13}
              style={{ height: '100%', width: '100%', backgroundColor: '#000' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                style={{ filter: 'grayscale(1) invert(1) opacity(0.7)' }}
              />
              {gpsRoute.length > 0 && (
                <>
                  <Polyline positions={gpsRoute} color="var(--brand-purple)" weight={4} opacity={0.8} />
                  <MapResizer points={gpsRoute} />
                  {lastPos && (
                    <Marker position={lastPos}></Marker>
                  )}
                </>
              )}
              {gpsRoute.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100, color: '#444', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                  SIN DATOS GPS DISPONIBLES<br />(ESPERANDO INICIO DE MOTOR)
                </div>
              )}
            </MapContainer>
          </div>

          {/* Rest day control */}
          {!isRestDay && !(date > new Date().toLocaleDateString('sv')) && stats.shift_status !== 'CLOSED' && (ingresoBruto === 0 && gastoGasolina === 0 && (!activeShift || (date < new Date().toLocaleDateString('sv')))) && (
            <button className="btn" style={{ marginTop: '10px', width: '100%', borderColor: '#444', backgroundColor: 'transparent', color: '#888', borderStyle: 'dashed' }} onClick={() => setShowRestDayModal(true)}>
              💤 Marcar como Día Descansado
            </button>
          )}
        </>
      )}

      {showShiftModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', textAlign: 'center' }}>{activeShift ? 'CIERRE DE JORNADA' : 'INICIO DE JORNADA'}</h3>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>ODÓMETRO TOTAL</div>
              <input
                type="number"
                value={shiftInputs.odometer}
                onChange={e => setShiftInputs({ ...shiftInputs, odometer: e.target.value })}
                placeholder="Ej: 195471"
                style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }}
              />
            </div>
            <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>CONTADOR DE EFECTIVO</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[1, 2, 5, 10, 20, 50, 100, 200, 500].map(v => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#1a1a1a', padding: '5px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', width: '25px', fontWeight: 'bold' }}>${v}</div>
                    <input
                      type="number"
                      value={denoms[v < 20 ? `m${v}` : `b${v}`] === 0 ? '' : denoms[v < 20 ? `m${v}` : `b${v}`]}
                      onChange={e => setDenoms({ ...denoms, [v < 20 ? `m${v}` : `b${v}`]: Number(e.target.value) })}
                      style={{ width: '100%', border: 'none', background: 'none', color: 'white', fontSize: '12px', textAlign: 'right' }}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '10px', backgroundColor: 'var(--success-green)', color: 'black', padding: '8px', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                TOTAL EFECTIVO: ${totalDenoms.toFixed(2)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowShiftModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleShiftAction} style={{ flex: 1 }}>Guardar Registro</button>
            </div>
          </div>
        </div>
      )}

      {showRestDayModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', textAlign: 'center', color: '#888' }}>CORTE DE ACTIVIDAD</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-main)', textAlign: 'center' }}>
              ¿Confirmas que el día <strong>{date}</strong> será marcado oficialmente como DÍA DESCANSADO?
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowRestDayModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn" onClick={handleMarkRestDayConfirm} style={{ flex: 1, backgroundColor: '#3498db', color: 'white', fontWeight: 'bold' }}>Sí, aplicar descanso</button>
            </div>
          </div>
        </div>
      )}
      {/* ⚡ Modal Sincronizar Odómetro (En Vivo) */}
      {showSyncModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '14px', textAlign: 'center' }}>SINCRONIZAR AVANCE REAL</h3>
            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>Escribe tu odómetro actual para calcular tu ROI real en este momento.</p>
            <input
              type="number"
              value={syncOdo}
              onChange={e => setSyncOdo(e.target.value)}
              placeholder="Ej: 195750"
              autoFocus
              style={{ width: '100%', padding: '12px', background: '#111', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '18px', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSyncModal(false)} style={{ flex: 1 }}>Cerrar</button>
              <button className="btn btn-primary" onClick={handleSyncOdometer} style={{ flex: 1 }}>Actualizar IQ</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
