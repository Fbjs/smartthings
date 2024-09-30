const axios = require('axios');
const fs = require('fs'); // Importa el módulo de filesystem para guardar la imagen

const generateImage = async (prompt) => {
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

        // Guarda la imagen en un archivo PNG
        fs.writeFileSync('generated_image.png', buffer);
        console.log("Imagen generada y guardada como 'generated_image.png'");
    } catch (error) {
        console.error("Error generando imagen: ", error.response ? error.response.data : error.message);
    }
};

generateImage("A portrait of a person with brown hair, wearing glasses, smiling");
