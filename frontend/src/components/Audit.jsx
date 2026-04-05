import React, { useState } from 'react';
import { Camera } from 'lucide-react';

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
        setProgress(`¡Éxito! ${data.count} viajes registrados en el Historial.`);
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

export default Audit;
