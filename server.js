// Para ejecutar esto necesitas tener Node.js instalado y ejecutar:
// 1. npm init -y
// 2. npm install express cors dotenv @google/generative-ai express-rate-limit

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar CORS para que solo tu dominio frontend pueda hacer peticiones
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*', // En producción, cambia '*' por 'https://tudominio.com'
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Limitar peticiones: Máximo 10 análisis por IP cada 15 minutos para evitar abusos
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { error: 'Demasiadas solicitudes. Por favor, intenta más tarde.' }
});
app.use('/api/', limiter);

// Inicializar Google Gemini con la API Key guardada de forma segura en variables de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/analyze', async (req, res) => {
    try {
        const { prompt, systemInstruction } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Faltan datos de análisis.' });
        }

        // Configurar el modelo
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.0-flash", // Usamos el modelo estable
            systemInstruction: systemInstruction 
        });

        // Generar el contenido
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Devolver el texto al frontend sin revelar la API Key
        res.json({ text: text });

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error procesando la solicitud en el servidor.' });
    }
});

// Modificación para Vercel: Solo escuchar el puerto si NO estamos en Vercel (entorno de producción)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor de análisis balístico corriendo en el puerto ${PORT}`);
        console.log(`Asegúrate de tener un archivo .env con GEMINI_API_KEY=tu_clave_aqui`);
    });
}

// CRÍTICO PARA VERCEL: Exportar la app para que funcione como Serverless Function
module.exports = app;

