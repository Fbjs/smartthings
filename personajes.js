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
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un generador de datos ficticios.'
                    },
                    {
                        role: 'user',
                        content: `Genera un array de ${cantidad} personas chilenas ficticias. Cada persona debe incluir:
                        - nombre (nombre completo)
                        - email (con el dominio @neighbour.cl)
                        - password (contraseña: neig2120)
                        - descripcion (descripción completa de la persona características físicas, edad, raza, color de ojos, pasatiempos, hobbys, etc)
                        - fecha_nacimiento (en formato año/mes/día.)
                        - usuario (de instagram, debe ser unico)`
                    }
                ],
                max_tokens: 1000
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Obtener y procesar los datos generados
        const personas = JSON.parse(response.data.choices[0].message.content);
        console.log('Personas generadas:', personas);
        
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
    });

    // Cerrar la interfaz readline y la conexión a la base de datos una vez terminado
    rl.close();
    db.end();
};
