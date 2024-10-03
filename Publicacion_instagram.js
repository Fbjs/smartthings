//const puppeteer = require('puppeteer');
const mysql = require('mysql');
const path = require('path');
const axios = require('axios');
const fs = require('fs'); // Para manejar los archivos de imagen localmente

require('dotenv').config();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time);
    });
}

// Función para generar la biografía con GPT
const generarBioConGPT = async (descripcion) => {
    const apiKey = process.env.OPENAI_API_KEY; // Asegúrate de que tu clave esté en el archivo .env

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu eres un asistente que genera biagrafias de presentacion para cuentas de Instagram en maximo 120 caracteres'
                    },
                    {
                        role: 'user',
                        content: `Genera una biografía creativa para Instagram basada en la siguiente descripción: "${descripcion}". Mantén el texto breve (máximo 120 caracteres) e incluye íconos.`,
                    }
                ],
                max_tokens: 120
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const bio = response.data.choices[0].message.content.trim();
        return bio;
    } catch (error) {
        console.error('Error al generar la biografía:', error.response ? error.response.data : error.message);
        return null;
    }
};

const generarPrompt = async (descripcion) => {
    const apiKey = process.env.OPENAI_API_KEY; // Asegúrate de que tu clave esté en el archivo .env

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
    const apiKey = process.env.OPENAI_API_KEY; // Asegúrate de que tu clave esté en el archivo .env

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

const dragAndDrop = async (page, filePath) => {
    const inputElement = await page.$('input[type="file"]');
    await inputElement.uploadFile(filePath);

    // Simular un evento de arrastrar y soltar
    await page.evaluate(() => {
        const event = new DataTransfer();
        const file = new File([filePath], 'myFile.png');
        event.items.add(file);

        const dropZone = document.querySelector('div[aria-label="Arrastra las fotos y los videos aquí"]');
        dropZone.dispatchEvent(new DragEvent('drop', {
            dataTransfer: event,
        }));
    });
};


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
    main();
});

// Función para obtener los datos de las personas
const getPersonas = () => {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM personas WHERE correo_validado = 0', (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
};



const main = async () => {
    
    // Obtener personas con correos validados
    const personas = await getPersonas();
    
    // Iniciar Puppeteer
    //const browser = await puppeteer.launch({ headless: false });
    const browser = await puppeteer.launch({
        headless: false, // Ejecutar el navegador con cabeza visible
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'platform', {
            get: () => 'Win32',
        });
    });

    await page.evaluateOnNewDocument(() => {
        window.navigator.chrome = {
            runtime: {}
        };
    });

    await page.evaluateOnNewDocument(() => {
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                Promise.resolve({ state: 'denied' })
        );
    });
    await delay(getRandomInt(500, 1500));

    console.log('Navegando a Instagram...');
    await page.goto('https://www.instagram.com', { waitUntil: 'networkidle2' });

    for (let persona of personas) {
        try {
            console.log(`Iniciando sesión para ${persona.nombre}...`);
            
            // Navegar a la página de inicio de sesión
            await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

            // Esperar a que los campos de formulario estén disponibles
            await page.waitForSelector('input[name="username"]');
            await page.waitForSelector('input[name="password"]');
            await delay(getRandomInt(500, 1500));

            // Rellenar el formulario
            await page.type('input[name="username"]', persona.email, { delay: 100 }); // Simular tipeo humano
            await page.type('input[name="password"]', persona.password, { delay: 100 });

            // Esperar a que el botón de inicio de sesión esté habilitado
            await page.waitForSelector('button[type="submit"]');
            await page.click('button[type="submit"]');

            // Esperar la navegación después de hacer clic
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
                    
            console.log(`Inicio de sesión exitoso para ${persona.nombre}`);
            
            const guardarInfo = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(button => button.textContent.includes('Guardar información'));
            });

            const ahoraNo = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                return buttons.find(button => button.textContent.includes('Ahora no'));
            });

            if (guardarInfo) {
                console.log(`Guardando la información de inicio de sesión para ${persona.nombre}...`);
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const guardarButton = buttons.find(button => button.textContent.includes('Guardar información'));
                    guardarButton.click();
                });
            } else if (ahoraNo) {
                console.log(`No guardando la información de inicio de sesión para ${persona.nombre} (opción "Ahora no").`);
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                    const ahoraNoButton = buttons.find(button => button.textContent.includes('Ahora no'));
                    ahoraNoButton.click();
                });
            } else {
                //console.log('No se encontraron opciones para "Guardar información" o "Ahora no".');
            }

            // Navegar a la página del perfil del usuario
            console.log(`Navegando al perfil de ${persona.usuario}...`);
            await page.goto(`https://www.instagram.com/${persona.usuario}/`, { waitUntil: 'networkidle2' });

            // Aquí puedes extraer datos adicionales del perfil, como seguidores, posts, etc.
            console.log(`Perfil de ${persona.usuario} cargado exitosamente`);

            await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'networkidle2' });
            await page.waitForSelector('input[type="file"]');

            // Ruta de la imagen que deseas subir como foto de perfil
            const imagePath = path.resolve(__dirname, persona.foto_perfil_url);  // Cambia esta ruta a la ubicación de tu imagen

            // Subir la imagen
            console.log('Subiendo la nueva foto de perfil...');
            const inputUploadHandle = await page.$('input[type="file"]');
            await inputUploadHandle.uploadFile(imagePath);

            console.log(`Nueva foto de perfil subida para ${persona.nombre}`);
            await delay(5000);  // Reemplazamos page.waitForTimeout con delay

            // Generar una biografía automáticamente usando ChatGPT
            console.log(`Generando biografía para ${persona.nombre} basado en su descripción...${persona.description}`);
            const bio = await generarBioConGPT(persona.descripcion);

            if (!bio) {
                console.error(`No se pudo generar una biografía para ${persona.nombre}`);
                continue;
            }
            
            console.log(`Biografía generada para ${persona.nombre}: ${bio}`);

            // Esperar el campo de biografía y reemplazar su contenido
            await page.waitForSelector('textarea[id="pepBio"]');

            // Limpiar el campo actual
            await page.evaluate(() => {
                document.querySelector('textarea[id="pepBio"]').value = '';
            });

            await page.type('textarea[id="pepBio"]', bio, { delay: 200 });
            // Asegúrate de que ya estás en la página donde aparece el botón
            await page.waitForSelector('div[role="button"]');  // Esperar que el botón aparezca

            // Hacer clic en el botón "Enviar"
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                const enviarButton = buttons.find(button => button.textContent.includes('Enviar'));
                if (enviarButton) {
                    enviarButton.click();
                }
            });

            // Dar tiempo para que se procese la imagen subida
            await delay(5000);

            // Verificar si la imagen se subió correctamente
            const errorMsg = await page.evaluate(() => {
                const error = document.querySelector('.error-message-selector'); // Cambia esto por la clase real de error
                return error ? error.innerText : null;
            });

            if (errorMsg) {
                console.log('Error al subir la imagen:', errorMsg);
            } else {
                console.log('Imagen cargada correctamente.');
            }

            console.log('Imagen subida correctamente.');




            

        } catch (error) {
            console.error(`Error al iniciar sesión para ${persona.nombre}: `, error);
        }
    }
    
    console.log('Cerrando navegador...');
    //await browser.close();
    db.end();
};
