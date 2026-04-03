const OpenAI = require('openai');
const fs = require('fs');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Procesa un lote (par de imágenes) de DiDi y extrae los datos.
 */
async function parseDidiReport(imagePaths) {
  const contentArray = [{ type: "text", text: "Extrae los datos combinados de estas imágenes de DiDi pertenecientes al mismo viaje:" }];

  for (const path of imagePaths) {
    if (path) {
      const base64Image = fs.readFileSync(path).toString('base64');
      contentArray.push({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${base64Image}` },
      });
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Eres el Auditor Maestro de Didi Audit AI. 
        Tu objetivo es extraer datos de capturas de pantalla de DiDi México con precisión absoluta.
        
        Debes devolver UNICAMENTE un objeto JSON con esta estructura exacta:
        {
          "pasajero": "Nombre",
          "distancia_didi_km": 0.0,
          "ganancia_bruta": 0.0,
          "ganancia_antes_impuesto": 0.0,
          "tarifa_servicio": 0.0,
          "cuota_solicitud": 0.0,
          "monto_adicional_gasolina": 0.0,
          "impuesto_total": 0.0,
          "ganancia_neta_final": 0.0,
          "metodo_pago": "Efectivo/Tarjeta",
          "roi_km": 0.0,
          "calificacion_seleccion": "Súper Élite/Excelente/Eficiente/Meta/Aceptable/Bajo/Ineficiente"
        }

        Reglas de Negocio (TABLA DE ACEPTACION MAZATLAN):
        - Distancia 1.0 a 3.7 km: Pago Mínimo $30.00.
        - Distancia >= 4.0 km: Aplicar REGLA DEL $8/KM (KM * 8 = Pago Mínimo).
        - Ejemplos de Validación: 4km=$32, 5km=$40, 6km=$48, 7km=$56, 8km=$64, 10km=$80, 15km=$120.
        - Calificación:
          - Súper Élite: ROI > $18/km
          - Excelente: Cumple tabla o ROI > $12/km
          - Meta: Cumple la Regla del $8/km
          - Ineficiente: Por debajo de la Regla del $8/km
        `
      },
      {
        role: "user",
        content: contentArray,
      },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { parseDidiReport };
