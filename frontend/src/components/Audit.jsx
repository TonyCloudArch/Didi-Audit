import React, { useState } from 'react';
import { Camera } from 'lucide-react';

const Audit = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setProgress(`Digitalizando ${files.length} fotos con IA...`);

    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    try {
      const res = await fetch('http://localhost:3001/api/upload/batch', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setProgress(`¡Éxito! Viajes y/o Tickets registrados en el Historial.`);
        setFiles([]);
      } else {
        setProgress(`Error: ${data.error || 'Fallo en la auditoría'}`);
      }
    } catch (e) {
      setProgress('Error de conexión con el servidor de IA.');
    }
    setLoading(false);
  };

  return (
    <div className="mobile-container">
      <div className="header" style={{ textAlign: 'center' }}>
        <h1>Lector Mágico Universal (IA)</h1>
      </div>

      <div className="card" style={{ height: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #444', position: 'relative' }}>
        {files.length > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <Camera size={64} color="var(--success-green)" />
            <h2 style={{ marginTop: '10px' }}>{files.length} Archivos Listos</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>La IA clasificará automáticamente cada foto.</p>
          </div>
        ) : (
          <>
            <Camera size={64} color="var(--didi-orange)" />
            <p style={{ color: '#888', marginTop: '16px', textAlign: 'center', padding: '0 20px', fontSize: '13px' }}>
              Sube capturas de DiDi, tickets de gas o fotos de odómetro mezcladas.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '10px' }}>
              El sistema detectará automáticamente el tipo de dato.
            </p>
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

      {progress && <p style={{ color: 'var(--didi-orange)', marginTop: '15px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>{progress}</p>}

      <button className="btn btn-primary" style={{ marginTop: '20px', width: '100%', fontWeight: 'bold' }} disabled={files.length === 0 || loading} onClick={handleUpload}>
        {loading ? 'ANALIZANDO CON IA...' : `DIGITALIZAR CONTENIDO`}
      </button>

      {files.length > 0 && (
        <button className="btn btn-secondary" style={{ marginTop: '10px', width: '100%' }} onClick={() => { setFiles([]); setProgress(''); }}>
          Limpiar Selección
        </button>
      )}
    </div>
  );
};

export default Audit;
