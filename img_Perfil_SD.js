const mysql = require('mysql');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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
    generarFotosPerfil();
});

// Función para traducir la descripción en español a un prompt en inglés
const generarPromptEnIngles = async (descripcion) => {
    const apiKey = process.env.OPENAI_API_KEY; // Reemplaza con tu clave de API de OpenAI

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an assistant that translates descriptions in Spanish to prompts in English for generating realistic profile images.'
                    },
                    {
                        role: 'user',
                        content: `Translate the following description into an English prompt for generating a realistic profile image: ${descripcion}`
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

        // Extraer el prompt generado en inglés
        const prompt = response.data.choices[0].message.content.trim();
        return prompt;
    } catch (error) {
        console.error('Error al generar el prompt en inglés:', error.response ? error.response.data : error.message);
        return null;
    }
};

// Función para generar una imagen desde el prompt en inglés
const generateProfileImage = async (prompt, nombre) => {
    const apiKey = process.env.STABILITY_API_KEY; // Reemplaza con tu clave de API de Stability AI
    const url = 'https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image'; // Usamos v1.6 para imágenes realistas

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
        'Accept': 'application/json'
    };

    try {
        const response = await axios.post(url, data, { headers });
        const base64Image = response.data.artifacts[0].base64; // Extraemos la imagen en base64
        const buffer = Buffer.from(base64Image, 'base64'); // Convertimos base64 a buffer

        // Crear la carpeta 'perfiles_img' si no existe
        const dir = './perfiles_img';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        // Obtener fecha y hora actuales para el nombre del archivo
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0]; // Formato: YYYYMMDDHHMMSS

        // Generar el nombre del archivo con el nombre de usuario y fecha/hora
        const fileName = `${nombre}_${timestamp}.png`;

        // Construir la ruta completa del archivo dentro de la carpeta 'perfiles_img'
        const filePath = path.join(dir, fileName);

        // Guardar la imagen en el archivo con el nombre generado
        fs.writeFileSync(filePath, buffer);
        console.log(`Foto de perfil generada y guardada como '${filePath}'`);

        return filePath; // Retorna la ruta de la imagen generada
    } catch (error) {
        console.error("Error generando la imagen de perfil: ", error.response ? error.response.data : error.message);
        return null;
    }
};

// Función principal para obtener perfiles, generar imágenes y almacenar en la base de datos
const generarFotosPerfil = async () => {
    // Consulta para obtener las descripciones y nombres
    db.query('SELECT id, nombre, descripcion, usuario FROM personas where foto_perfil_url is null', async (err, perfiles) => {
        if (err) {
            console.error('Error al obtener perfiles:', err);
            return;
        }

        if (perfiles.length > 0) {
            // Por cada perfil, generar una imagen y almacenarla
            for (const perfil of perfiles) {
                const { id, nombre, descripcion, usuario } = perfil;

                console.log(`Generando foto de perfil para ${nombre}...`);

                // Generar el prompt en inglés desde la descripción
                const prompt = await generarPromptEnIngles(descripcion);
                if (!prompt) {
                    console.error('Error al generar el prompt en inglés');
                    continue;
                }

                console.log(`Prompt en inglés para ${nombre}: ${prompt}`);

                // Generar imagen de perfil desde el prompt en inglés
                const imagenPath = await generateProfileImage(prompt, usuario);

                if (imagenPath) {
                    // Actualizar la base de datos con la ruta de la imagen
                    const query = `UPDATE personas SET foto_perfil_url = ? WHERE id = ?`;

                    db.query(query, [imagenPath, id], (err, result) => {
                        if (err) {
                            console.error('Error al actualizar la foto de perfil en la base de datos:', err);
                        } else {
                            console.log(`Foto de perfil para ${nombre} guardada en la base de datos.`);
                        }
                    });
                }
            }
        } else {
            console.log('No se encontraron perfiles en la base de datos.');
        }
    });
};
