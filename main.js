const puppeteer = require('puppeteer');

(async () => {
  // Lanzar el navegador
  const browser = await puppeteer.launch({ headless: false }); // headless: false para ver el navegador
  const page = await browser.newPage();
  
  // Ir a la página de registro de Instagram
  await page.goto('https://www.instagram.com/accounts/emailsignup/', { waitUntil: 'networkidle2' });

  // Esperar a que el formulario cargue y seleccionar los campos
  await page.waitForSelector('input[name="emailOrPhone"]');

  // Completar los campos del formulario
  await page.type('input[name="emailOrPhone"]', 'victor.rubilar@neighbour.cl', { delay: 100 });
  await page.type('input[name="fullName"]', 'Victor Rubilar', { delay: 100 });
  await page.type('input[name="username"]', 'victorrubilar77', { delay: 100 });
  await page.type('input[name="password"]', 'neig2120*', { delay: 100 });

await page.evaluate(() => {
    let buttons = Array.from(document.querySelectorAll('button'));
    let registerButton = buttons.find(b => b.innerText === 'Registrarte');
    if (registerButton) {
      registerButton.click();
    } else {
      console.log('Botón "Registrarte" no encontrado.');
    }
  });

 // Esperar que la nueva página cargue (puedes ajustar el tiempo si es necesario)
 await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 3 segundos

  // Seleccionar el mes "Marzo" en el select con title "Mes:"
  await page.select('select[title="Mes:"]', '3');  // Marzo tiene value "3"

  // Seleccionar el día "7" en el select con title "Día:"
  await page.select('select[title="Día:"]', '20');  // Día 7

  // Seleccionar el año "1990" en el select con title "Año:"
  await page.select('select[title="Año:"]', '1994');  // Año 1990

   await page.evaluate(() => {
    let buttons = Array.from(document.querySelectorAll('button'));
    let nextButton = buttons.find(b => b.innerText === 'Siguiente');
    if (nextButton) {
      nextButton.click();
    } else {
      console.log('Botón "Siguiente" no encontrado.');
    }
  });
  // Si quisieras hacer clic en "Registrarse", podrías usar este código:
  // await page.click('button[type="submit"]');
  
  // Puedes agregar más lógica según necesites, por ejemplo, manejar captchas o verificar que el registro fue exitoso

  // Mantener el navegador abierto para inspeccionar los resultados
  // await browser.close(); // Comentar si no quieres que cierre el navegador automáticamente
})();