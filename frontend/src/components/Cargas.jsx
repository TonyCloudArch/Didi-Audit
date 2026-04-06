import React, { useState, useEffect } from 'react';
import { Fuel, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const Cargas = () => {
  const [files, setFiles] = useState([]);
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
        const firstValid = data.receipts.find(rec => parseFloat(rec.costo_real_km) > 0);
        setLatestCost(firstValid ? Number(firstValid.costo_real_km) : 2.27);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress('Procesando ticket con IA...');
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    try {
      const res = await fetch('http://localhost:3001/api/upload/fuel', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProgress('✅ Ticket registrado. Costo actualizado automáticamente.');
        setFiles([]);
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
        <h1>CARGAS DE GASOLINA</h1>
      </div>

      {latestCost && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: latestCost > 2.5 ? '4px solid var(--error-red)' : '4px solid var(--success-green)' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COSTO POR KM</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: latestCost > 2.5 ? 'var(--error-red)' : 'var(--success-green)' }}>${latestCost.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {latestCost > 2.5 ? <TrendingUp size={32} color="var(--error-red)" /> : <TrendingDown size={32} color="var(--success-green)" />}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>aplicado a nuevos viajes</div>
          </div>
        </div>
      )}

      {/* HISTORIAL SECCIÓN ÚNICAMENTE */}

      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-muted)' }}>HISTORIAL DE CARGAS</div>
        {receipts.map((r, index) => {
          // Lógica de Continuidad: Si este registro es 0 (ej. carga en día de descanso),
          // buscamos el último rendimiento válido en el historial para no "romper" la vista.
          const displayCost = parseFloat(r.costo_real_km) > 0 
            ? parseFloat(r.costo_real_km) 
            : (receipts.slice(index).find(rec => parseFloat(rec.costo_real_km) > 0)?.costo_real_km || 2.27);
          
          const displayRend = parseFloat(r.rendimiento_km_l) > 0
            ? parseFloat(r.rendimiento_km_l)
            : (receipts.slice(index).find(rec => parseFloat(rec.rendimiento_km_l) > 0)?.rendimiento_km_l || 10.56);

          return (
            <div key={r.id} className="card" style={{ marginBottom: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--didi-orange)' }}>{new Date(r.fecha).toLocaleDateString()}</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>${parseFloat(r.total_pagado).toFixed(2)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ALCANZA PARA</div>
                  <div style={{ fontSize: '14px' }}>{Math.round(r.litros * displayRend)} km</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>COSTO POR KM</div>
                  <div style={{ fontSize: '14px', color: 'var(--success-green)' }}>${Number(displayCost).toFixed(2)}</div>
                </div>
              </div>
              <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>{r.gasolinera} • {parseFloat(r.precio_litro).toFixed(2)}/L</span>
                <span>Rend: {Number(displayRend).toFixed(2)} km/L</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Cargas;
