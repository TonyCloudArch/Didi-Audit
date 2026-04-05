import React from 'react';

const Settings = () => {
  return (
    <div className="mobile-container">
      <div className="header">
        <h1>AJUSTES</h1>
      </div>
      <div className="card">
        <div className="card-title">Configuración del Vehículo</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Dodge Attitude 2019 • 195k km</p>
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-secondary" style={{ textAlign: 'left' }}>🔧 Editar Información del Auto</button>
          <button className="btn btn-secondary" style={{ textAlign: 'left' }}>🔒 Gestión de Cuenta</button>
          <button className="btn btn-secondary" style={{ textAlign: 'left' }}>📊 Exportar Datos (Excel)</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: '10px', backgroundColor: '#1a1a1a' }}>
        <div className="card-title">Estado del Sistema</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '10px' }}>
          <span>Servidor:</span>
          <span style={{ color: 'var(--success-green)' }}>EN LÍNEA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginTop: '10px' }}>
          <span>Base de Datos:</span>
          <span style={{ color: 'var(--success-green)' }}>SINCRONIZADA</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
