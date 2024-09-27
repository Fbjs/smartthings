const mysql = require('mysql');
const axios = require('axios');
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

// Conexión a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error conectando a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
    generarYGuardarPersonas();
});

// Función para generar datos ficticios usando OpenAI
const generarYGuardarPersonas = async () => {
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
                        content: `Genera un array de 5 personas chilenas ficticias. Cada persona debe incluir:
                        - nombre completo
                        - email con el dominio @neighbour.cl
                        - contraseña: neig2120
                        - descripción completa de la persona (características físicas, edad, raza, color de ojos, pasatiempos, hobbys, etc)
                        - fecha de nacimiento en formato día/mes/año.`
                    }
                ],
                max_tokens: 800
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
        guardarPersonasEnBaseDeDatos(personas);

    } catch (error) {
        console.error('Error al generar datos:', error.response ? error.response.data : error.message);
    }
};

// Función para guardar personas en la base de datos
const guardarPersonasEnBaseDeDatos = (personas) => {
    personas.forEach(persona => {
        const { nombre, email, password, descripcion, fecha_nacimiento } = persona;
        const query = `INSERT INTO personas (nombre, email, password, descripcion, fecha_nacimiento) VALUES (?, ?, ?, ?, ?)`;

        db.query(query, [nombre, email, password, descripcion, fecha_nacimiento], (err, result) => {
            if (err) {
                console.error('Error al guardar persona en la base de datos:', err);
            } else {
                console.log('Persona guardada en la base de datos con ID:', result.insertId);
            }
        });
    });
};
