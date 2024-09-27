CREATE TABLE personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    usuario VARCHAR(255) DEFAULT NULL
);

ALTER TABLE personas
ADD correo_validado BOOLEAN DEFAULT 0,
ADD instagram_count BOOLEAN DEFAULT 0,
ADD instagram_followers INT DEFAULT 0,
ADD instagram_following INT DEFAULT 0,
ADD instagram_posts INT DEFAULT 0,
ADD fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;