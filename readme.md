CREATE TABLE users (
    id SERIAL PRIMARY KEY,             -- Unique ID for the user
    username VARCHAR(50) NOT NULL,     -- Username
    email VARCHAR(100) UNIQUE NOT NULL, -- Email address
    password TEXT NOT NULL,       -- Hashed password
    created_at TIMESTAMP DEFAULT NOW(), -- Timestamp for when the record was created
    updated_at TIMESTAMP DEFAULT NOW()  -- Timestamp for the last update
);

nodemon
npx nodemon index.js


