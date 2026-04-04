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
          "pasajero_nombre": "Nombre del pasajero",
          "distancia": 0.0,
          "duracion": "Ej: 14m 24s",
          "fecha_hora_viaje": "Ej: 31/03/2026, 11:33:18 am",
          "origen_direccion": "Dirección completa punto verde",
          "destino_direccion": "Dirección completa punto naranja",
          "tipo_vehiculo": "Ej: Express",
          "metodo_pago": "Efectivo/Tarjeta",
          "efectivo_recibido": 0.0,
          "pagado_por_el_pasajero": 0.0,
          "tus_ganancias": 0.0,
          "ganancias_antes_imp": 0.0,
          "tarifa_del_viaje": 0.0,
          "tarifa_de_servicio": 0.0,
          "cuota_de_solicitud": 0.0,
          "monto_adicional_por_gasolina": 0.0,
          "impuesto": 0.0,
          "ganancias_desp_imp": 0.0
        }

        Instrucciones Especiales:
        - Tu única misión es extraer los datos tal cual aparecen en las etiquetas de DiDi. 
        - No intentes hacer cálculos de ROI o rentabilidad.
        - Si el nombre del pasajero no está claro, usa "App DiDi".
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
