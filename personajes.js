const mysql = require('mysql');
const axios = require('axios');
const readline = require('readline'); // Para capturar la entrada del usuario
require('dotenv').config();

// Configuración de OpenAI
const apiKey = process.env.OPENAI_API_KEY;

// Configuración de la base de datos
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Configuración de readline para capturar entradas del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Conexión a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
    solicitarCantidadPersonas(); // Solicitamos la cantidad de personas al iniciar la conexión
});

// Función para solicitar la cantidad de personas
const solicitarCantidadPersonas = () => {
    rl.question('¿Cuántas personas deseas generar?: ', cantidad => {
        if (isNaN(cantidad) || cantidad <= 0) {
            console.log('Por favor ingresa un número válido.');
            solicitarCantidadPersonas();
        } else {
            generarYGuardarPersonas(parseInt(cantidad));
        }
    });
};

// Función para generar datos ficticios usando OpenAI
const generarYGuardarPersonas = async (cantidad) => {
    console.log(`Generando ${cantidad} personas ficticias usando OpenAI...`);
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un generador de datos ficticios. debes devolver solo un array json'
                    },
                    {
                        role: 'user',
                        content: `Genera un array de ${cantidad} personas chilenas ficticias. Cada persona debe incluir:
                        - nombre (nombre completo)
                        - email (con el dominio @neighbour.cl)
                        - password (contraseña: Neig2120*)
                        - descripcion (descripción completa de la persona características físicas, edad, raza, color de ojos, pasatiempos, hobbys, etc)
                        - fecha_nacimiento (en formato año/mes/día.)
                        - usuario (debe ser una frase inventada con numero enmedio y unica que sea dificil que se repita)`
                    }
                ],
                max_tokens: 2000
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Obtener y procesar los datos generados
        console.log('choices:', response.data.choices);
        const content = response.data.choices[0].message.content.trim();
        let personas;
        try {
            personas = JSON.parse(content);
        } catch (jsonError) {
            console.error('Error al parsear JSON:', jsonError.message);
            console.log('Contenido recibido:', content);  // Para depuración
            return;  // Salir si el JSON es inválido
        }
        console.log('Personas generadas:', personas)
        ;
        
        console.log(`Guardando las ${cantidad} personas en la base de datos...`);
        guardarPersonasEnBaseDeDatos(personas);

    } catch (error) {
        console.error('Error al generar datos:', error.response ? error.response.data : error.message);
    }
};

// Función para guardar personas en la base de datos
const guardarPersonasEnBaseDeDatos = (personas) => {
    personas.forEach(persona => {
        const { nombre, email, password, descripcion, fecha_nacimiento, usuario } = persona;
        const query = `INSERT INTO personas (nombre, email, password, descripcion, fecha_nacimiento, usuario) VALUES (?, ?, ?, ?, ?, ?)`;

        db.query(query, [nombre, email, password, descripcion, fecha_nacimiento, usuario], (err, result) => {
            if (err) {
                console.error('Error al guardar persona en la base de datos:', err);
            } else {
                console.log('Persona guardada en la base de datos con ID:', result.insertId);
            }
        });

         createEmail(persona); // Llamar a createEmail para cada registro
    });

    // Cerrar la interfaz readline y la conexión a la base de datos una vez terminado
    rl.close();
    db.end();
};

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
                    quota: 100, // Tamaño del buzón (en MB)
                },
            });

            console.log(response.data);


        } catch (error) {
            console.error('Error creando el correo:', error);
        }
    };
