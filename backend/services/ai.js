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
        
        Debes analizar las imágenes y determinar el tipo de información:
        - "viaje": Resumen estándar de DiDi México (Origen/Destino).
        - "gasolina": Ticket de combustible o foto de odómetro.
        - "recompensa": Bonos, metas de viajes (Ej: "Viaja más, gana más").
        - "cancelacion": Tarifa de cancelación pagada al conductor.
        
        Devuelve UNICAMENTE un objeto JSON con esta estructura:
        {
          "documentos": [
            {
              "tipo_documento": "viaje" | "gasolina" | "recompensa" | "cancelacion" | "desconocido",
              
              // Si es un VIAJE o CANCELACIÓN:
              "pasajero_nombre": "Nombre del pasajero",
              "distancia": 0.0,
              "duracion": "Ej: 14m 24s",
              "fecha_hora_viaje": "Ej: 31/03/2026, 11:33:18 am",
              "origen_direccion": "Dirección completa punto verde",
              "destino_direccion": "Dirección completa punto naranja",
              "tipo_vehiculo": "Ej: Express",
              "metodo_pago": "Efectivo/Tarjeta",
              "efectivo_recibido": 0.0, // Monto literal bajo "Efectivo recibido"
              "pagado_por_el_pasajero": 0.0, // El total que pagó el usuario
              "tarifa_de_servicio": 0.0, // El monto negativo bajo "Tarifa de servicio"
              "cuota_de_solicitud": 0.0, // El monto negativo bajo "Cuota de solicitud"
              "monto_adicional_por_gasolina": 0.0, // El monto bajo "Monto adicional por gasolina"
              "tus_ganancias": 0.0, // Es el monto de "Ganancias antes imp." o "Tus ganancias"
              "otras_deducciones_app": 0.0, // Montos negativos como "Tarifa previa pendiente", "Otras tarifas", etc.
              "impuesto": 0.0, // El monto bajo "Impuesto" o "Impuesto al Valor Agregado" (negativo)
              "ganancias_desp_imp": 0.0, // Es el monto de "Ganancias desp. imp."
              
              // Si es una RECOMPENSA (Bono/Meta):
              "concepto_especial": "Ej: Recompensa por meta de 15 viajes",
              "monto_recompensa": 0.0,
              
              "is_valid": true
            }
          ]
        }

        Instrucciones Especiales:
        - "tarifa_de_servicio" y "cuota_de_solicitud": Estos suelen ser números negativos (ej: -9.34). Extráelos con su signo si es posible.
        - "impuesto": Extrae el monto negativo de IVA o impuestos locales.
        - "efectivo_recibido": Es vital si el método es "En efectivo".
        - "monto_adicional_por_gasolina": Solo si aparece explícitamente en el desglose.


        Instrucciones Especiales:
        - Si detectas que las imágenes corresponden a DOS documentos distintos (ej: una recompensa y un viaje, o dos bonos distintos), crea dos objetos en el array "documentos".
        - Si ambas imágenes son del mismo viaje (detalle ganancias + mapa), crea UN solo objeto con los datos consolidados.
        - "tipo_documento": Identifica con precisión si es un viaje completado, cancelación pagada, bono de meta o ticket de gasolina.
        - "recompensa": Si ves "Viaja más, gana más", usa este tipo y extrae el monto total como tus_ganancias y monto_recompensa. BUSCA CUALQUIER FECHA en la imagen para "fecha_hora_viaje" (ej: "4 de abr", "Hoy", etc).
        - "cancelacion": Si ves "Tar. cancel. dinám.", extrae el monto en tus_ganancias.
        - "gasolina": BUSCA LA FECHA REAL DEL TICKET (ej: 04/04/2026). Es vital para la auditoría.
        - "is_valid": Solo false si la imagen no tiene nada que ver con lo anterior.
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
