import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Fuel, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({ currentDisposition: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0, ingresoEfectivo: 0, ingresoTarjeta: 0 });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('sv'));
  const [activeShift, setActiveShift] = useState(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftInputs, setShiftInputs] = useState({ odometer: '', cash: '' });
  const [denoms, setDenoms] = useState({ m1:0, m2:0, m5:0, m10:0, b20:0, b50:0, b100:0, b200:0, b500:0 });
  const dailyGoal = 500.00;

  const totalDenoms = (denoms.m1*1) + (denoms.m2*2) + (denoms.m5*5) + (denoms.m10*10) + (denoms.b20*20) + (denoms.b50*50) + (denoms.b100*100) + (denoms.b200*200) + (denoms.b500*500);

  const checkShift = () => {
    fetch('http://localhost:3001/api/shifts/active')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveShift(d.activeShift); });
  };

  useEffect(() => {
    setLoading(true);
    checkShift();
    setStats({ currentDisposition: 0, utilidadReal: 0, gastoGasolina: 0, roi: 0, totalKmDidi: 0, ingresoEfectivo: 0, ingresoTarjeta: 0 });
    fetch(`http://localhost:3001/api/dashboard?date=${date}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats({
          currentDisposition: Number(d.currentDisposition || 0),
          utilidadReal: Number(d.utilidadReal || 0),
          gastoGasolina: Number(d.gastoGasolina || 0),
          roi: Number(d.roi || 0),
          totalKmDidi: Number(d.total_km || 0),
          ingresoEfectivo: Number(d.ingresoEfectivo || 0),
          ingresoTarjeta: Number(d.ingresoTarjeta || 0)
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [date]);

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
      setDenoms({ m1:0, m2:0, m5:0, m10:0, b20:0, b50:0, b100:0, b200:0, b500:0 });
      checkShift();
    }
  };

  const { currentDisposition, utilidadReal, gastoGasolina, roi, totalKmDidi, ingresoEfectivo, ingresoTarjeta } = stats;

  return (
    <div className="mobile-container">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Mazatlán Audit Pro</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            {activeShift 
              ? `🟡 TURNO ABIERTO (ODO: ${activeShift.initial_odometer})` 
              : '⚪️ TURNO CERRADO'}
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: 'white', padding: '6px', borderRadius: '6px', fontSize: '11px', outline: 'none' }}
        />
      </div>

      <div className="card" style={{ padding: '12px', borderLeft: activeShift ? '4px solid var(--didi-orange)' : '4px solid #444', background: activeShift ? 'rgba(255,100,0,0.05)' : 'var(--card-bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{activeShift ? 'CIERRE DE TURNO' : 'INICIO DE TURNO'}</div>
          </div>
          <button 
            onClick={() => setShowShiftModal(true)}
            className={`btn ${activeShift ? 'btn-secondary' : 'btn-primary'}`} 
            style={{ fontSize: '11px', padding: '8px 16px', borderRadius: '20px' }}
          >
            {activeShift ? '🚩 Finalizar' : '🚀 Iniciar'}
          </button>
        </div>
      </div>

      {showShiftModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', textAlign: 'center' }}>{activeShift ? 'CIERRE DE JORNADA' : 'INICIO DE JORNADA'}</h3>
            
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>ODÓMETRO TOTAL</div>
              <input 
                type="number" 
                value={shiftInputs.odometer} 
                onChange={e => setShiftInputs({...shiftInputs, odometer: e.target.value})}
                placeholder="Ej: 195471" 
                style={{ width: '100%', padding: '8px', backgroundColor: '#111', border: '1px solid #333', color: 'white', borderRadius: '6px' }} 
              />
            </div>

            <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center' }}>CONTADOR DE EFECTIVO (DENOMINACIONES)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[1, 2, 5, 10].map(v => (
                  <div key={`m${v}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#1a1a1a', padding: '5px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', width: '25px', fontWeight: 'bold' }}>${v}</div>
                    <input type="number" value={denoms[`m${v}`]} onChange={e => setDenoms({...denoms, [`m${v}`]: Number(e.target.value)})} style={{ width: '100%', border: 'none', background: 'none', color: 'white', fontSize: '12px', textAlign: 'right' }} placeholder="0" />
                  </div>
                ))}
                {[20, 50, 100, 200, 500].map(v => (
                  <div key={`b${v}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#222', padding: '5px', borderRadius: '4px', border: '1px solid #333' }}>
                    <div style={{ fontSize: '10px', width: '25px', fontWeight: 'bold', color: 'var(--success-green)' }}>${v}</div>
                    <input type="number" value={denoms[`b${v}`]} onChange={e => setDenoms({...denoms, [`b${v}`]: Number(e.target.value)})} style={{ width: '100%', border: 'none', background: 'none', color: 'white', fontSize: '12px', textAlign: 'right' }} placeholder="0" />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div className="card" style={{ padding: '10px', borderTop: '2px solid var(--success-green)' }}>
          <div className="card-title" style={{ fontSize: '9px' }}>COBRADO EN EFECTIVO</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>${ingresoEfectivo.toFixed(2)}</div>
        </div>
        <div className="card" style={{ padding: '10px', borderTop: '2px solid #3498db' }}>
          <div className="card-title" style={{ fontSize: '9px' }}>DEPÓSITO TARJETA</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#3498db' }}>${ingresoTarjeta.toFixed(2)}</div>
        </div>
      </div>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
        <Link to="/audit" className="btn btn-primary" style={{ flexDirection: 'column', height: '100px', fontSize: '14px' }}>
          <Camera size={32} />
          Lector Mágico
        </Link>
        <Link to="/cubo" className="btn btn-secondary" style={{ flexDirection: 'column', height: '100px', fontSize: '14px' }}>
          <Fuel size={32} />
          Cargas de Gasolina
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
