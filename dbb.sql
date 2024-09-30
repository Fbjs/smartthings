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


CREATE TABLE imagenes_personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    persona_id INT NOT NULL,
    prompt TEXT NOT NULL,
    imagen_url TEXT NOT NULL,
    texto_publicacion TEXT NOT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subida_instagram BOOLEAN DEFAULT 0,
    FOREIGN KEY (persona_id) REFERENCES personas(id)
);

ALTER TABLE imagenes_personas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE imagenes_personas MODIFY texto_publicacion TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
