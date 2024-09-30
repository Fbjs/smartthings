const puppeteer = require('puppeteer');
const mysql = require('mysql');
const path = require('path');
const axios = require('axios');

require('dotenv').config();

// Función de retraso personalizada para reemplazar waitForTimeout
const delay = (time) => {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
};

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
    console.log('Iniciando Puppeteer...');
    
    // Obtener personas con correos validados
    const personas = await getPersonas();
    
    // Iniciar Puppeteer
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

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

            // Rellenar el formulario
            await page.type('input[name="username"]', persona.email, { delay: 100 }); // Simular tipeo humano
            await page.type('input[name="password"]', persona.password, { delay: 100 });

            // Esperar a que el botón de inicio de sesión esté habilitado
            await page.waitForSelector('button[type="submit"]');
            
            console.log('Haciendo clic en el botón de inicio de sesión...');
            await page.click('button[type="submit"]');

            // Esperar la navegación después de hacer clic
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
                    
            console.log(`Inicio de sesión exitoso para ${persona.nombre}`);
            
            // Esperar y detectar la opción "Guardar información"
            console.log('Buscando el botón "Guardar información"...');
            
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
                console.log('No se encontraron opciones para "Guardar información" o "Ahora no".');
            }

            // Navegar a la página del perfil del usuario
            console.log(`Navegando al perfil de ${persona.usuario}...`);
            await page.goto(`https://www.instagram.com/${persona.usuario}/`, { waitUntil: 'networkidle2' });

            // Aquí puedes extraer datos adicionales del perfil, como seguidores, posts, etc.
            console.log(`Perfil de ${persona.usuario} cargado exitosamente`);

            await page.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'networkidle2' });

            console.log('Esperando el botón para cambiar la foto de perfil...');
            await page.waitForSelector('input[type="file"]');

            // Ruta de la imagen que deseas subir como foto de perfil
            const imagePath = path.resolve(__dirname, persona.foto_perfil_url);  // Cambia esta ruta a la ubicación de tu imagen

            // Subir la imagen
            console.log('Subiendo la nueva foto de perfil...');
            const inputUploadHandle = await page.$('input[type="file"]');
            await inputUploadHandle.uploadFile(imagePath);

            console.log(`Nueva foto de perfil subida para ${persona.nombre}`);

            // Espera algún tiempo para asegurarte de que la imagen se sube
            //await page.waitForTimeout(5000);
            // Esperar un poco antes de pasar a la siguiente persona
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

            /*await page.evaluate((bio) => {
                //document.querySelector('textarea[id="pepBio"]').value = bio;
                await page.type('textarea[id="pepBio"]', bio, { delay: 200 });
            }, bio);*/

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

            console.log(`Biografía actualizada para ${persona.nombre}`);

            await page.goto(`https://www.instagram.com/${persona.usuario}/`, { waitUntil: 'networkidle2' });
            


            

        } catch (error) {
            console.error(`Error al iniciar sesión para ${persona.nombre}: `, error);
        }
    }
    
    console.log('Cerrando navegador...');
    //await browser.close();
    db.end();
};
