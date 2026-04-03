# 🚀 Guía de Despliegue: Didi Audit AI

Este sistema está diseñado para correr en un VPS de Hostinger mediante **Docker**. Sigue estos pasos para la puesta en marcha:

## 1. Configuración de Variables (.env)
Crea un archivo `.env` en la raíz del proyecto:
```bash
OPENAI_API_KEY=tu_key_aqui
DB_HOST=db
DB_USER=audit_user
DB_PASSWORD=audit_user_pass
DB_NAME=didi_audit
PORT=3001
```

## 2. Lanzamiento del Sistema
Desde la terminal, ejecuta:
```bash
docker-compose up -d --build
```
Esto iniciará:
- **Base de Datos (MySQL)**: Puerto 3306.
- **Backend (API + IA)**: Puerto 3001.
- **Frontend (PWA)**: Puerto 5173.

## 3. Acceso y PWA
1. Abre el navegador en tu celular: `http://ip-de-tu-vps:5173`.
2. Dale a **"Añadir a la pantalla de inicio"**.
3. ¡Listo! Ya tienes el Auditor Maestro en tu iPhone/Android.

## 4. Ingeniería Financiera (Lógica Tony)
- **Cierre de Turno**: Obligatorio para comparar el efectivo real vs lo que dice DiDi.
- **Kilómetros Muertos**: Si recorres más KM personales que de trabajo, el dashboard te alertará en **ROJO**.
- **Punto de Equilibrio**: El sistema prioriza recuperar la gasolina inyectada hoy.

---
> [!IMPORTANT]
> No olvides resetear el **Trip A** de tu Attitude antes de empezar. Cada gota de gasolina cuenta para tu meta de los $4,000.  Mazatlán es tuyo. 🏎️💨
