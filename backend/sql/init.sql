CREATE DATABASE IF NOT EXISTS didi_audit;
USE didi_audit;

-- 🛠️ Tabla de Turnos (Corte de Caja)
CREATE TABLE IF NOT EXISTS shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    initial_odometer INT NOT NULL,
    final_odometer INT,
    initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Fondo de caja inicial
    final_cash_counted DECIMAL(10,2), -- El conductor cuenta esto físicamente
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    settlement_difference DECIMAL(10,2), -- Diferencia entre lo esperado y lo contado
    profit_indicator ENUM('GREEN', 'RED')
);

-- 🚖 Tabla de Ingresos (DiDi y Privados)
CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT,
    pasajero VARCHAR(255),
    distancia_didi_km DECIMAL(6,2),
    ganancia_bruta DECIMAL(10,2),
    ganancia_antes_impuesto DECIMAL(10,2),
    tarifa_servicio DECIMAL(10,2),
    cuota_solicitud DECIMAL(10,2),
    monto_adicional_gasolina DECIMAL(10,2),
    impuesto_total DECIMAL(10,2),
    ganancia_neta_final DECIMAL(10,2),
    metodo_pago VARCHAR(50),
    roi_km DECIMAL(6,2),
    calificacion_seleccion VARCHAR(50),
    raw_data_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- ⛽ Tabla de Gastos (Combustible, Aceite, Mantenimiento)
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT,
    type ENUM('FUEL', 'OIL', 'MAINTENANCE', 'REFILL', 'OTHER') DEFAULT 'FUEL',
    amount DECIMAL(10,2) NOT NULL,
    liters DECIMAL(6,3), -- Para cálculo de L/100km
    price_per_liter DECIMAL(6,2),
    odometer INT, -- KM al momento del gasto
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- 📊 Configuración de Benchmarks (Attitude 2019 - Desgaste Real)
CREATE TABLE IF NOT EXISTS config (
    `key` VARCHAR(50) PRIMARY KEY,
    `value` VARCHAR(255)
);

INSERT INTO config (`key`, `value`) VALUES 
('target_km_l_min', '14.0'),
('target_km_l_max', '16.0'),
('target_l_100km', '7.1'), -- Basado en 14km/l
('daily_goal_disposition', '572.00'), -- Meta para llegar a $4,000 semanales
('initial_odometer_base', '195258'),
('oil_check_interval_km', '500');
