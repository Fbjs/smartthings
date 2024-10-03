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
        db.query('SELECT * FROM personas WHERE correo_validado = 1 and instagram_count=1 and instagram_followers=0', (err, results) => {
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
           // await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

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
            
            perfiles = ["redaccionescreativas","marketingenioso","marketingclasificado","luzzidigital","p/C0twPyQO_qW/","p/CwQgGVsPMYv/"];
            //"redaccionescreativas","marketingenioso","marketingclasificado","luzzidigital","marketing.conmaria","startlab"
            for (let perfil of perfiles) {

              try {
                await page.goto(`https://www.instagram.com/${perfil}`, { waitUntil: 'networkidle2' });
                 
                await page.waitForSelector('button[type="button"]', { timeout: 10000 });

                // Evaluar el DOM y buscar el botón que tiene un `div` con el texto "Seguir"
                 /* await page.evaluate(() => {
                    // Obtener todos los botones
                    const buttons = Array.from(document.querySelectorAll('button[type="button"]'));

                    // Buscar el botón que contiene el texto "Seguir" en un `div` dentro del botón
                    const seguirButton = buttons.find(button => {
                      const div = button.querySelector('div');
                      return div && div.textContent.includes('Seguir');
                    });

                    if (seguirButton) {
                      
                      // Hacer clic en el botón "Seguir"
                      seguirButton.click();

                     
                      console.log('Botón "Seguir" encontrado y clicado.');
                    } else {
                      console.log('No se encontró el botón "Seguir".');
                    }
                  });

                  */
                
                        try {
                          console.log('Buscar Span');

                           // Utilizar XPath para encontrar el elemento
/*
                            const element_guardar = await page.waitForSelector('xpath/./html/body/div[2]/div/div/div/div[2]/div/div/div[1]/div[1]/div[1]/section/main/div/div[1]/div/div[2]/div/div[3]/section[1]/div[2]/div/div/div/div');

                            if (element_guardar) {
                                await element_guardar.hover();
                                console.log('Hover realizado con éxito.');
                                await element_guardar.click();
                                console.log('Clic realizado con éxito.');
                            }

                            const element_like = await page.waitForSelector('xpath/./html/body/div[2]/div/div/div/div[2]/div/div/div[1]/div[1]/div[1]/section/main/div/div[1]/div/div[2]/div/div[3]/section[1]/div[1]/span[1]/div/div/div');
                           
                            console.log('Elemento ',element_like);
                            
                            if (element_like) {
                                // Si se encuentra el element_likeo, hacer clic en él
                               await element_like.hover();
                                console.log('Hover realizado con éxito.');

                                // Luego hacer clic en el element_likeo
                                await element_like.click();
                                console.log('Clic realizado con éxito.');
                                console.log('like clickeado con éxito.');
                            }
                               */
                            const element_compartir = await page.waitForSelector('xpath/./html/body/div[2]/div/div/div/div[2]/div/div/div[1]/div[1]/div[1]/section/main/div/div[1]/div/div[2]/div/div[3]/section[1]/div[1]/div/div');
                                console.log('element_compartir  ');
                            
                            if(element_compartir){
                              // await element_like.hover();

                              await element_compartir.click();
                                console.log('element_compartir  con éxito.');

                            }

                            const element_buscar = await page.waitForSelector('xpath/./html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/div[1]/div[1]/div/div/div[1]/label/input');
                            
                            if(element_buscar){
                              await element_buscar.type('aventura_123_mujer', { delay: 150 });
                                console.log('element_buscar aventura_123_mujer con éxito.');
                            }
                                    
                            const element_usuario = await page.waitForSelector('xpath/./html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/div[1]/div[2]/div');
                                
                            if(element_usuario){
                                await element_usuario.click();
                            }else{
                                console.log('element_usuario no encontrado.');
                                const element_usuario2 = await page.waitForSelector('xpath/./html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/div[1]/div[2]/div/div/div[2]');
                                
                                if(element_usuario2){
                                    await element_usuario2.click();
                                }else{
                                    console.log('element_usuario2 no encontrado.');
                                    
                                }  
                            }
                           
                            const element_enviar = await page.waitForSelector('xpath/./html/body/div[7]/div[1]/div/div[2]/div/div/div/div/div/div/div[2]/div[2]/div[2]/div/div');

                              if(element_enviar){
                                await element_enviar.click();
                                console.log('element_enviar  con éxito.');
                              }
                            console.log('compartir clickeado con éxito.');
                                
                                 
                           
                        } catch (error) {
                            console.error('Error en el proceso:', error);
                        }

                  // Puedes agregar un tiempo de espera para observar el resultado antes de pasar al siguiente perfil
                  //await page.waitForTimeout(3000);
                  
                  console.log('FIN SEGUIR: '+perfil)
                  return false;

              }catch (error) {
                console.error(`Error al intentar seguir el perfil ${perfil}:`, error);
              }
            }




            return false;
           
         


            

        } catch (error) {
            console.error(`Error al iniciar sesión para ${persona.nombre}: `, error);
        }
    }
    
    console.log('Cerrando navegador...');
    //await browser.close();
    db.end();
};
