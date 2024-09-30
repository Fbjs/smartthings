const mysql = require('mysql');
const axios = require('axios');
require('dotenv').config();

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

// Función para generar el prompt en español con ChatGPT
const generarPrompt = async (descripcion) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente de inteligencia artificial que genera prompts para imágenes realistas basadas en la descripción de una persona. El prompt debe ser simple, en español y describir una situación que se alinee con una de las preferencias de la persona.'
                    },
                    {
                        role: 'user',
                        content: `Genera un prompt en español para una imagen realista de una persona basada en la siguiente descripción: ${descripcion}`
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
        console.error('Error al generar el prompt con ChatGPT:', error.response ? error.response.data : error.message);
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
                        content: 'Eres un asistente de redes sociales que genera textos para publicaciones en Instagram. Sin emoticon. El texto debe estar alineado con el prompt de la imagen y ser adecuado para una publicación en español'
                    },
                    {
                        role: 'user',
                        content: `Genera un texto en español para una publicación de Instagram, sin iconos, basado en el siguiente prompt de la imagen: ${prompt}`
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

// Función para generar una imagen en DALL-E
const generarImagenDesdePrompt = async (prompt) => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: 'dall-e-2',
                prompt: prompt,
                quality: 'standard',
                n: 1,
                size: "1024x1024"
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Retornar la URL de la imagen generada
        return response.data.data[0].url;
    } catch (error) {
        console.error('Error generando la imagen:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Función principal para obtener personas, generar imágenes, textos y almacenar en la base de datos
const generarImagenesParaPersonas = async () => {
    // Obtener todas las personas de la base de datos
    db.query('SELECT id, descripcion FROM personas', async (err, personas) => {
        if (err) {
            console.error('Error al obtener personas:', err);
            return;
        }

        if (personas.length > 0) {
            // Por cada persona, generar un prompt, una imagen y un texto
            for (const persona of personas) {
                const { id, descripcion } = persona;

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

                // Generar imagen desde el prompt usando DALL-E
                const imagenUrl = await generarImagenDesdePrompt(prompt);

                if (imagenUrl) {
                    // Guardar el prompt, la imagen y el texto de la publicación en la base de datos
                    const query = `INSERT INTO imagenes_personas (persona_id, prompt, imagen_url, texto_publicacion, subida_instagram) VALUES (?, ?, ?, ?, ?)`;

                    db.query(query, [id, prompt, imagenUrl, textoPublicacion, 0], (err, result) => {
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
