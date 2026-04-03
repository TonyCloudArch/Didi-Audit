# 🧪 Pruebas Locales: Didi Audit AI Mazatlán

Para probar el sistema en tu Mac antes de subirlo al VPS de Hostinger:

## 1. Requerimientos
- **Docker Desktop** (Opcional, pero recomendado para la base de datos).
- **Node.js** instalado.
- **OpenAI API Key**.

## 2. Iniciar Base de Datos Local
Si tienes Docker corriendo, puedes usar el `docker-compose.yml` que te creé:
```bash
docker-compose up -d db
```

## 3. Iniciar Backend
```bash
cd backend
# Asegúrate de tener el .env con tu OPENAI_API_KEY
npm start
```

## 4. Iniciar Frontend
```bash
cd frontend
npm run dev
```
Abre: `http://localhost:5173`

## 5. Auditoría de Prueba
Sube una captura de DiDi de tus logs anteriores. El sistema debería:
1. Extraer el nombre del pasajero (Brenda, Oscar, etc).
2. Calcular el ROI real ($/km).
3. Etiquetar como "EXCELENTE" o "BAJO" según la Regla del $8/km.
