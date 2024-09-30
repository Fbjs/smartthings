const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Navega a la página
    await page.goto('https://qxbroker.com/es/sign-in/', { waitUntil: 'networkidle2' });

    // Verifica si la página tiene iframes
    const frames = page.frames();
    console.log(`Frames detectados: ${frames.length}`);

    // Si el contenido está en un iframe, navega a él
    const frame = frames.find(f => f.url().includes('sign-in')); // Ajusta esto si el iframe tiene una URL específica

    if (frame) {
        console.log("Accediendo al iframe...");
        
        // Espera por el campo de email dentro del iframe
        await frame.waitForSelector('input[name="email"]', { visible: true });
        await frame.type('input[name="email"]', 'tu_correo@example.com');
        await frame.type('input[name="password"]', 'tu_contraseña');
        
        // Haz clic en el botón de iniciar sesión
        await frame.click('button.modal-sign__block-button');

    } else {
        console.log("No se encontró iframe. Intentando acceder directamente...");
        
        // Espera por el campo de email en la página principal si no hay iframes
        await page.waitForSelector('input[name="email"]', { visible: true });
        await page.type('input[name="email"]', 'tu_correo@example.com');
        await page.type('input[name="password"]', 'tu_contraseña');
        
        // Haz clic en el botón de iniciar sesión
        await page.click('button.modal-sign__block-button');
    }

    // Espera unos segundos para observar el resultado
    await page.waitForTimeout(5000);

    // Cierra el navegador
    await browser.close();
})();