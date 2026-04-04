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
          "tarifa_dinamica": "No aplica / Ej: 1.2x",
          "monto_adicional_por_gasolina": 0.0,
          "tarifa_base_total": 0.0,
          "impuesto": 0.0,
          "impuesto_tipo": "Ej: Impuesto al Valor Agregado",
          "ganancias_desp_imp": 0.0,
          "is_valid_didi_ride": true
        }

        Instrucciones Especiales:
        - "is_valid_didi_ride": Si las imágenes NO corresponden a un resumen de viaje de DiDi México, pon este valor en false.
        - "tarifa_dinamica": Busca menciones de multiplicadores o si explícitamente dice que incluye tarifa dinámica. Si no hay, pon "No aplica".
        - "impuesto_tipo": Extrae el texto descriptivo del impuesto si aparece (Ej: IVA, ISR, etc.).
        - "tarifa_base_total": Es el monto "Tarifa total" que aparece dentro del desglose de Tarifa del viaje.
        - Tu única misión es extraer los datos tal cual aparecen en las etiquetas de DiDi. 
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

/**
 * Procesa fotos de un ticket de gasolinera + odómetro y extrae los datos.
 */
async function parseFuelReceipt(imagePaths) {
  const contentArray = [{ type: "text", text: "Extrae los datos de este ticket de gasolinera y/o pantalla de odómetro:" }];

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
        content: `Eres el Auditor de Combustible de Didi Audit AI, especializado en leer tickets de gasolineras mexicanas y pantallas de odómetro de autos.
        
        Debes devolver UNICAMENTE un objeto JSON con esta estructura exacta:
        {
          "fecha": "Ej: 03/04/2026 16:02:23",
          "gasolinera": "Nombre completo de la gasolinera",
          "producto": "Ej: Pemex Magna / Premium / Diesel",
          "litros": 0.000,
          "precio_litro": 0.0000,
          "importe_sin_iva": 0.00,
          "importe_iva": 0.00,
          "total_pagado": 0.00,
          "forma_pago": "Efectivo / Tarjeta",
          "km_odometro_actual": 0,
          "is_valid_fuel_ticket": true
        }

        Instrucciones Especiales:
        - "is_valid_fuel_ticket": Si no hay un ticket de gasolinera o pantalla de odómetro válida, pon este valor en false.
        - "litros": Busca el campo "Cantidad" en el ticket.
        - "precio_litro": Busca el campo "Inicio" o "Precio" en el ticket.
        - "total_pagado": Es el "Importe con impuestos" o total final.
        - "km_odometro_actual": Si hay una imagen de pantalla de odómetro con 6 dígitos (NO el trip counter parcial), extrae ese número. Si no hay imagen de odómetro, pon 0.
        - Si el odómetro muestra "km" debajo de un número de 6 dígitos, ese es el odómetro total.
        - Tu única misión es extraer los datos tal cual aparecen. No calcules nada.
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

module.exports = { parseDidiReport, parseFuelReceipt };
