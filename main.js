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

// Función para buscar el correo de verificación
function buscarCorreoCodigo(imap, email) {
  return new Promise((resolve, reject) => {
    imap.openBox('INBOX', true, (err, box) => {
      if (err) return reject(err);

      // Buscar correos cuyo asunto contenga "is your Instagram code"
      imap.search([['HEADER', 'SUBJECT', 'is your Instagram code']], (err, results) => {
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

      // Buscar correos cuyo asunto contenga "is your Instagram code"
      imap.search([['HEADER', 'SUBJECT', 'is your Instagram code']], (err, results) => {
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




  // Lanzar el navegador
  async function bot(data) {

          //codigo de pupper
      const browser = await puppeteer.launch({ 
        headless: false,
        //args: ['--proxy-server=74.119.147.209:4145'] 
      }); // headless: false para ver el navegador
      const page = await browser.newPage();
      
      // Ir a la página de registro de Instagram
      //await page.goto('https://www.instagram.com/accounts/emailsignup', { waitUntil: 'networkidle2' });
      await page.goto('https://www.instagram.com', { waitUntil: 'networkidle2' });
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos
      
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
      await page.type('input[name="emailOrPhone"]', data['email'], { delay: 100 });
      await page.type('input[name="fullName"]', data['nombre'], { delay: 100 });
      await page.type('input[name="username"]', data['usuario'], { delay: 100 });
      await page.type('input[name="password"]', data['password'], { delay: 100 });

      await page.evaluate(() => {
        let buttons = Array.from(document.querySelectorAll('button'));
        let registerButton = buttons.find(b => b.innerText === 'Registrarte');
        if (registerButton) {
          registerButton.click();
          console.log('Botón "Registrarte" CLick');

        } else {
          console.log('Botón "Registrarte" no encontrado.');
        }
      });

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
      // Seleccionar el mes "Marzo" en el select con title "Mes:"
      await page.select('select[title="Mes:"]', dia);  // Marzo tiene value "3"

      // Seleccionar el día "7" en el select con title "Día:"
      await page.select('select[title="Día:"]', mes);  // Día 7

      // Seleccionar el año "1990" en el select con title "Año:"
      await page.select('select[title="Año:"]', ano);  // Año 1990

      await page.evaluate(() => {
        let buttons = Array.from(document.querySelectorAll('button'));
        let nextButton = buttons.find(b => b.innerText === 'Siguiente');
        if (nextButton) {
          nextButton.click();
        } else {
          console.log('Botón "Siguiente" no encontrado.');
        }
      });
      //const codigo = await buscarCorreoCodigo(data['email']);
      obtenerCodigoVerificacion(data['email'])
        .then(async codigo => {
          console.log(`Código de verificación recibido: ${codigo}`)

          await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos

           // Esperar a que el input del código esté disponible
          await page.waitForSelector('input[name="email_confirmation_code"]');

          // Insertar el código de verificación en el input
          await page.type('input[name="email_confirmation_code"]', codigo, { delay: 100 });

          console.log(`Código ingresado: ${codigo}`);

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
     
          // Cerrar el navegador después de completar el registro
          //await browser.close();


        })
        .catch(err => console.error(err));



  }

 
})();