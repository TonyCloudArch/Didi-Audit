CREATE DATABASE IF NOT EXISTS didi_audit;
USE didi_audit;

-- 🛠️ Tabla de Turnos (Corte de Caja)
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    initial_odometer INT NOT NULL,
    final_odometer INT,
    initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    final_cash_counted DECIMAL(10,2),
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    settlement_difference DECIMAL(10,2),
    profit_indicator ENUM('GREEN', 'RED')
);

-- 🚖 Tabla de Ingresos (Nombres EXACTOS de DiDi México)
CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT,
    pasajero_nombre VARCHAR(255),
    distancia DECIMAL(6,2),
    duracion VARCHAR(50),
    fecha_hora_viaje VARCHAR(100),
    origen_direccion TEXT,
    destino_direccion TEXT,
    tipo_vehiculo VARCHAR(50),
    metodo_pago VARCHAR(50),
    efectivo_recibido DECIMAL(10,2),
    pagado_por_el_pasajero DECIMAL(10,2),
    tus_ganancias DECIMAL(10,2), -- Banner arriba
    ganancias_antes_imp DECIMAL(10,2),
    tarifa_del_viaje DECIMAL(10,2),
    tarifa_de_servicio DECIMAL(10,2),
    cuota_de_solicitud DECIMAL(10,2),
    monto_adicional_por_gasolina DECIMAL(10,2),
    impuesto DECIMAL(10,2),
    ganancias_desp_imp DECIMAL(10,2), -- El Neto Fundamental
    roi_km DECIMAL(6,2),
    calificacion_seleccion VARCHAR(50),
    raw_data_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- ⛽ Tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT,
    type ENUM('FUEL', 'OIL', 'MAINTENANCE', 'REFILL', 'OTHER') DEFAULT 'FUEL',
    amount DECIMAL(10,2) NOT NULL,
    liters DECIMAL(6,3),
    price_per_liter DECIMAL(6,2),
    odometer INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- 📊 Configuración
CREATE TABLE IF NOT EXISTS config (
    `key` VARCHAR(50) PRIMARY KEY,
    `value` VARCHAR(255)
);

INSERT INTO config (`key`, `value`) VALUES 
('target_km_l_min', '14.0'),
('target_km_l_max', '16.0'),
('target_l_100km', '7.1'),
('daily_goal_disposition', '572.00'),
('initial_odometer_base', '195258');
