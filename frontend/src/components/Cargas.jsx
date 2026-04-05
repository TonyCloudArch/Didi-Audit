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
        if (data.receipts.length > 0) setLatestCost(Number(data.receipts[0].costo_real_km));
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
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: latestCost > 2.0 ? '4px solid var(--error-red)' : '4px solid var(--success-green)' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COSTO POR KM</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: latestCost > 2.0 ? 'var(--error-red)' : 'var(--success-green)' }}>${latestCost.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {latestCost > 2.0 ? <TrendingUp size={32} color="var(--error-red)" /> : <TrendingDown size={32} color="var(--success-green)" />}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>aplicado a nuevos viajes</div>
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>Registrar Nueva Carga</div>

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

        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {files.map((file, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '8px 12px', borderRadius: '6px', border: '1px solid #333' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Fuel size={14} color="var(--success-green)" />
                  <span style={{ fontSize: '11px', color: '#eee', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                </div>
                <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--error-red)', cursor: 'pointer', padding: '4px' }}>
                  <AlertCircle size={16} />
                </button>
              </div>
            ))}
            <button onClick={() => setFiles([])} className="btn btn-secondary" style={{ fontSize: '10px', padding: '5px' }}>Limpiar Selección</button>
          </div>
        )}

        {progress && <p style={{ color: 'var(--didi-orange)', fontSize: '12px', textAlign: 'center' }}>{progress}</p>}

        <button className="btn btn-primary" disabled={files.length === 0 || loading} onClick={handleUpload}>
          {loading ? 'Procesando con IA...' : '⛽ Registrar Carga'}
        </button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--text-muted)' }}>HISTORIAL DE CARGAS</div>
        {receipts.map(r => (
          <div key={r.id} className="card" style={{ marginBottom: '10px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--didi-orange)' }}>{new Date(r.fecha).toLocaleDateString()}</span>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>${parseFloat(r.total_pagado).toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ALCANZA PARA</div>
                <div style={{ fontSize: '14px' }}>{Math.round(r.litros * r.rendimiento_km_l || 0)} km</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>COSTO POR KM</div>
                <div style={{ fontSize: '14px', color: 'var(--success-green)' }}>${parseFloat(r.costo_real_km).toFixed(2)}</div>
              </div>
            </div>
            <div style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>{r.gasolinera} • {parseFloat(r.precio_litro).toFixed(2)}/L</span>
              <span>Rend: {parseFloat(r.rendimiento_km_l).toFixed(2)} km/L</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cargas;
