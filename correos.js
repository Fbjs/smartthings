const axios = require('axios');
const mysql = require('mysql');
require('dotenv').config();

(async () => {
    
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

        db.query("SELECT * FROM personas WHERE correo_validado = 0", async (error, results) => {
            if (error) {
                console.error('Error al realizar la consulta:', error);
                return;
            }
            
            console.log("results");
            console.log(results);

            for (const persona of results) {
                await createEmail(persona); // Llamar a createEmail para cada registro
            }
        });
    });

    const createEmail = async (persona) => {
        const token = 'SHOVTLG1Y0ZFPIX7PYCRUVR5WKK66XYN'; // API Token de cPanel
        const cpanelUrl = 'https://cp013.servidoresph.com:2083/'; // URL de tu cPanel

        const email = persona.email.split('@')[0]; // Obtener la parte del correo antes del @
        const password = persona.password; // Usar la contraseña del registro
        const domain = persona.email.split('@')[1]; // Obtener el dominio del correo

        try {
            const response = await axios({
                method: 'post',
                url: `${cpanelUrl}/execute/Email/add_pop`,
                headers: {
                    Authorization: `cpanel neighbour:${token}`,
                },
                params: {
                    email: email,
                    password: 'Neig2120*',
                    domain: domain,
                    quota: 200, // Tamaño del buzón (en MB)
                },
            });

            console.log(response.data);


        } catch (error) {
            console.error('Error creando el correo:', error);
        }
    };
    
})();
