const mysql = require('mysql');
const axios = require('axios');
const fs = require('fs'); // Para manejar los archivos de imagen localmente
require('dotenv').config();
const path = require('path'); // Para manejar rutas de archivos
// Configuración de OpenAI
const apiKey = process.env.OPENAI_API_KEY;

// Configuración de la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Conexión a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
    generarImagenesParaPersonas();
});

const generarPrompt = async (descripcion) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant that generates prompts for realistic images based on a person\'s description. The prompt must be simple, in English, and describe a situation that aligns with one of the person\'s preferences.'
                    },
                    {
                        role: 'user',
                        content: `Generate an English prompt for a realistic image of a person based on the following description: ${descripcion}`
                    }
                ],
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Parseamos el prompt generado
        const prompt = response.data.choices[0].message.content.trim();
        return prompt;
    } catch (error) {
        console.error('Error generating prompt with ChatGPT:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Función para generar el texto de la publicación en español relacionado con el prompt
const generarTextoPublicacion = async (prompt) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente de redes sociales que genera textos para publicaciones en Instagram. Sin iconos ni emoticones. El texto debe estar alineado con el prompt de la imagen y ser adecuado para una publicación en español'
                    },
                    {
                        role: 'user',
                        content: `Genera un texto en español para una publicación de Instagram, sin iconos ni emoticones, basado en el siguiente prompt de la imagen: ${prompt}`
                    }
                ],
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Parseamos el texto generado
        const textoPublicacion = response.data.choices[0].message.content.trim();
        return textoPublicacion;
    } catch (error) {
        console.error('Error al generar el texto de la publicación con ChatGPT:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Función para generar la imagen con la función `generateImage` local
const generateImage = async (prompt, usuario) => {
    const apiKey = 'sk-mgUdVpBxf6uH0h8WuY3AkGhuF0t0jV9vAn1BVVS22JIs9C3P'; // Reemplaza con tu clave de API
    const url = 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image'; // Cambia a v1.6

    const data = {
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        clip_guidance_preset: "FAST_BLUE",
        height: 512,
        width: 512,
        samples: 1,
        steps: 50
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json' // Asegúrate de especificar que aceptas JSON
    };

    try {
        const response = await axios.post(url, data, { headers });
        const base64Image = response.data.artifacts[0].base64; // Extrae la imagen en base64
        const buffer = Buffer.from(base64Image, 'base64'); // Convierte base64 a buffer

        // Crear la carpeta 'img' si no existe
        const dir = './img';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Obtener fecha y hora actuales para el nombre del archivo
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0]; // Formato: YYYYMMDDHHMMSS

        // Generar el nombre del archivo con el usuario, fecha y hora
        const fileName = `${usuario}_${timestamp}.png`;

        // Construir la ruta completa del archivo dentro de la carpeta 'img'
        const filePath = path.join(dir, fileName);

        // Guardar la imagen en el archivo con el nombre generado
        fs.writeFileSync(filePath, buffer);
        console.log(`Imagen generada y guardada como '${filePath}'`);

        return filePath; // Retorna la ruta de la imagen generada
    } catch (error) {
        console.error("Error generando imagen: ", error.response ? error.response.data : error.message);
        return null;
    }
};


// Función principal para obtener personas, generar imágenes, textos y almacenar en la base de datos
const generarImagenesParaPersonas = async () => {
    // Obtener todas las personas de la base de datos
    db.query('SELECT id, descripcion, usuario FROM personas', async (err, personas) => {
        if (err) {
            console.error('Error al obtener personas:', err);
            return;
        }

        if (personas.length > 0) {
            // Por cada persona, generar un prompt, una imagen y un texto
            for (const persona of personas) {
                const { id, descripcion, usuario } = persona;

                // Generar el prompt en español con ChatGPT
                const prompt = await generarPrompt(descripcion);
                if (!prompt) {
                    console.error('Error al generar el prompt con ChatGPT');
                    continue;
                }

                // Generar el texto de la publicación en español relacionado con el prompt
                const textoPublicacion = await generarTextoPublicacion(prompt);
                if (!textoPublicacion) {
                    console.error('Error al generar el texto de la publicación con ChatGPT');
                    continue;
                }

                console.log('Generando imagen con prompt:', prompt);

                // Generar imagen desde el prompt usando la función `generateImage`
                const imagenPath = await generateImage(prompt, usuario);

                if (imagenPath) {
                    // Guardar el prompt, la imagen y el texto de la publicación en la base de datos
                    const query = `INSERT INTO imagenes_personas (persona_id, prompt, imagen_url, texto_publicacion, subida_instagram) VALUES (?, ?, ?, ?, ?)`;

                    db.query(query, [id, prompt, imagenPath, textoPublicacion, 0], (err, result) => {
                        if (err) {
                            console.error('Error al guardar la imagen y texto en la base de datos:', err);
                        } else {
                            console.log('Imagen y texto guardados en la base de datos para persona con ID:', id);
                        }
                    });
                }
            }
        } else {
            console.log('No se encontraron personas en la base de datos.');
        }
    });
};
