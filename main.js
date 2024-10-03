const puppeteer = require('puppeteer');
const mysql = require('mysql');
const axios = require('axios');
require('dotenv').config();
const Imap = require('imap');
const { simpleParser } = require('mailparser');

// Función para conectar al servidor IMAP
function conectarImap(email) {
  return new Promise((resolve, reject) => {
    const imapConfig = {
      user: email,
      password: 'Neig2120*',
      host: 'mail.neighbour.cl', // Cambia esto si es necesario
      port: 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false, // Asegúrate de que esto esté en true en producción
      },
    };

    const imap = new Imap(imapConfig);

    imap.once('ready', () => {
      console.log('Conectado al servidor IMAP');
      resolve(imap);
    });

    imap.once('error', (err) => {
      console.error('Error en la conexión IMAP:', err);
      reject(err);
    });

    imap.connect();
  });
}

// Función principal para buscar el código
async function obtenerCodigoVerificacion(email) {
  try {
    const imap = await conectarImap(email);
    console.log('imap',imap)
    const codigo = await buscarCorreoCodigo(imap, email);
    return codigo; // Retorna el código encontrado
  } catch (error) {
    console.error('Error al obtener el código de verificación:', error);
    throw error; // Lanza el error para manejarlo en otro lugar si es necesario
  }
}

function buscarCorreoCodigo(imap, email) {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) return reject(err);

      // Buscar correos cuyo asunto contenga "is your Instagram code" es tu código de Instagram
      imap.search([
          ['OR', 
            ['HEADER', 'SUBJECT', 'is your Instagram code'], 
            ['HEADER', 'SUBJECT', 'es tu código de Instagram']
          ]
        ], (err, results) => {
        if (err) return reject(err);

        if (results.length > 0) {
          const f = imap.fetch(results, { bodies: '' });

          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, mail) => {
                if (err) return reject(err);

                // Extraer el código del asunto
                const subject = mail.subject;
                const match = subject.match(/^(\d{6})/); // Busca un número de 6 dígitos al inicio del asunto

                if (match) {
                  console.log(`Código encontrado: ${match[1]}`);
                  imap.end(); // Finaliza la conexión si se encuentra el correo
                  resolve(match[1]); // Resuelve el código de verificación
                }
              });
            });
          });

          f.once('end', () => {
            console.log('Búsqueda finalizada.');
          });
        } else {
          console.log('Correo no encontrado. Revisando nuevamente en 2 segundos...');
          setTimeout(() => buscarCorreoCodigo(imap, email).then(resolve).catch(reject), 2000); // Espera 2 segundos y vuelve a intentar
        }
      });

    });
  });
}


// Ejemplo de uso



(async () => {

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

        db.query("SELECT * FROM personas WHERE correo_validado = 0 and instagram_count = 0", async (error, results) => {
            if (error) {
                console.error('Error al realizar la consulta:', error);
                return;
            }
            
            console.log("results");
            console.log(results);

            for (const persona of results) {
                await bot(persona); // Llamar a createEmail para cada registro
            }
        });
    });


const URL = "https://www.booking.com/";
const PROXY_USERNAME = "brd-customer-hl_703b2df4-zone-scraping_browser1";
const PROXY_PASSWORD = "l78a547agc8o";
const PROXY_HOST = "brd.superproxy.io";
const BROWSER_WS = "wss://brd-customer-hl_703b2df4-zone-scraping_browser1:l78a547agc8o@brd.superproxy.io:9222";
const PROXY_PORT = "9222";
const CHROME_EXECUTABLE_PATH = '/usr/bin/google-chrome'; 
  // Lanzar el navegador
  async function bot(data) {


      // Proxy details
      const proxy = {
        host: '181.82.232.177',
        port: '1080',
        auth: {
          username: 'tl-f5dfbb54167aad5f0f7c66db962d4b0864bd1dd426cb042de664281d7f6b637c-country-XX-session-###',
          password: '28a9l1x7m7hc'
        }
      };


      //codigo de pupper
      const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',  // URL de Chrome en Android
  });

      const page = await browser.newPage();
      // Authenticate proxy if credentials are required
      /*
      await page.authenticate({
        username: proxy.auth.username,
        password: proxy.auth.password
      });
      */

      await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos

      // Navegar a la URL deseada
              console.log('goto instagram');
      await page.goto('https://www.instagram.com', { waitUntil: 'networkidle2', timeout: 50000 });

      // Ir a la página de registro de Instagram
      //await page.goto('https://www.instagram.com/accounts/emailsignup', { waitUntil: 'networkidle2' });
      

      
      //boton para ir a registrar desde pagina inicio 

      await page.waitForSelector('span._ap3a._aaco._aacw._aad0._aad7', { timeout: 10000 });

      await page.evaluate(() => {
          // Buscar todos los spans con las clases mencionadas
          let spans = Array.from(document.querySelectorAll('span._ap3a._aaco._aacw._aad0._aad7'));

          // Buscar el primer span que esté dentro de un <a>
          let registerLink = spans.find(span => span.closest('a'));

          if (registerLink) {
              // Hacer click en el <a> que contiene el span
              let anchor = registerLink.closest('a');
              anchor.click();
              console.log('Enlace que contiene el botón "Regístrate" clicado.');
          } else {
              console.log('No se encontró un enlace con el botón "Regístrate".');
          }
      });
        



      // Esperar a que el formulario cargue y seleccionar los campos
      await page.waitForSelector('input[name="emailOrPhone"]');

      // Completar los campos del formulario
      await page.type('input[name="emailOrPhone"]', data['email'], { delay: 200 });
      await page.type('input[name="fullName"]', data['nombre'], { delay: 250 });
      await page.type('input[name="username"]', data['usuario'], { delay: 300 });
      await page.type('input[name="password"]', data['password'], { delay: 500 });

      await new Promise(resolve => setTimeout(resolve, 3000 )); // Espera 3 segundos

      // _acan _acap _acas _aj1- _ap30
      const isClicked = await page.evaluate(() => {
        let buttons = Array.from(document.querySelectorAll('button'));
        let registerButton = buttons.find(b => b.innerText === 'Registrarte');
        if (registerButton) {
          registerButton.click();
          console.log('Botón "Registrarte" clicado.');
          return true; // Devolver true si se clicó el botón
        } else {
          console.log('Botón "Registrarte" no encontrado.');
          return false; // Devolver false si no se encontró el botón
        }
      });


      if(!isClicked){
        return false;
      }
      console.log("persona",data);

      //return false;

      // Esperar que la nueva página cargue (puedes ajustar el tiempo si es necesario)
      await new Promise(resolve => setTimeout(resolve, 4000)); // Espera 3 segundos

      //1986-05-12
      var fecha_nacimiento = '1986-05-12';
      var partes = fecha_nacimiento.split('-');

      // Recuperar el año, mes y día
      var ano = partes[0]; // Año
      var mes = partes[1]; // Mes
      var dia = partes[2]; // Día
      


      // Esperar que el selector del mes esté disponible antes de interactuar
      try {
          await page.waitForSelector('select[title="Mes:"]', { visible: true, timeout: 5000 });
          await page.select('select[title="Mes:"]', mes);  // Seleccionar el mes
          console.log('Mes seleccionado:', mes);
      } catch (error) {
          console.log('No se pudo encontrar el select de "Mes".', error);
      }

      // Esperar que el selector del día esté disponible antes de interactuar
      try {
          await page.waitForSelector('select[title="Día:"]', { visible: true, timeout: 5000 });
          await page.select('select[title="Día:"]', dia);  // Seleccionar el día
          console.log('Día seleccionado:', dia);
      } catch (error) {
          console.log('No se pudo encontrar el select de "Día".', error);
      }

      // Esperar que el selector del año esté disponible antes de interactuar
      try {
          await page.waitForSelector('select[title="Año:"]', { visible: true, timeout: 5000 });
          await page.select('select[title="Año:"]', ano);  // Seleccionar el año
          console.log('Año seleccionado:', ano);
      } catch (error) {
          console.log('No se pudo encontrar el select de "Año".', error);
      }




      await page.evaluate(() => {
        let buttons = Array.from(document.querySelectorAll('button'));
        let nextButton = buttons.find(b => b.innerText === 'Siguiente');
        if (nextButton) {
          nextButton.click();
        } else {
          console.log('Botón "Siguiente" no encontrado.');
        }
      });


      const personaId = data['id'];
      console.log('ID persona: ',personaId);

      //const codigo = await buscarCorreoCodigo(data['email']);
      obtenerCodigoVerificacion(data['email'])
        .then(async codigo => {
          console.log(`Código de verificación recibido: ${codigo}`)

          await new Promise(resolve => setTimeout(resolve, 7000)); // Espera 5 segundos

           // Esperar a que el input del código esté disponible
          await page.waitForSelector('input[name="email_confirmation_code"]');

          // Insertar el código de verificación en el input
          await page.type('input[name="email_confirmation_code"]', codigo, { delay: 300 });

          console.log(`Código ingresado: ${codigo}`);
          await new Promise(resolve => setTimeout(resolve, 3000 )); // Espera 5 segundos

          await page.evaluate(() => {
              // Buscar todos los divs con el role="button"
              let divs = Array.from(document.querySelectorAll('div[role="button"]'));

              // Filtrar los divs que tengan el texto "Siguiente"
              let nextButton = divs.find(div => div.innerText === 'Siguiente');

              if (nextButton) {
                  nextButton.click();
                  console.log('Botón "Siguiente" clicado.');
              } else {
                  console.log('No se encontró el botón "Siguiente".');
              }
          });
     
          // Esperar a que la nueva página cargue
          await page.waitForNavigation();
          console.log('Nueva página cargada.');

          // Hacer clic en el botón "Activar"
          await page.waitForSelector('button._a9--._ap36._a9_0');
          await page.click('button._a9--._ap36._a9_0');
          console.log('Botón "Activar" clicado.');

          // Esperar unos segundos
          await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos

           // Cambia este valor con el ID de la persona que deseas actualizar
          const query = 'UPDATE personas SET instagram_count = 1 WHERE id = ?';

          // Ejecutar la consulta de actualización
          db.query(query, [personaId], (err, result) => {
              if (err) {
                  console.error('Error al actualizar la base de datos:', err);
              } else {
                  console.log(`Registro actualizado con éxito para la persona con ID ${personaId}`);
              }
          });

          // Cerrar la conexión cuando ya no sea necesaria
          db.end();

          return false;
          
          // Marcar todos los checkboxes
          await page.evaluate(() => {
              let checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
              checkboxes.forEach(checkbox => {
                  if (!checkbox.checked) {
                      checkbox.click();
                  }
              });
              console.log('Todos los checkboxes han sido marcados.');
          });

          // Esperar unos segundos
          await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos

          /*
          // Hacer clic en el botón "Siguiente"
          await page.evaluate(() => {
              let nextButton = document.querySelector('div[role="button"]');
              if (nextButton) {
                  nextButton.click();
                  console.log('Botón "Siguiente" clicado.');
              } else {
                  console.log('No se encontró el botón "Siguiente".');
              }
          });
          */
          console.log("Flujo completado.");


        })
        .catch(err => console.error(err));



  }

 
})();