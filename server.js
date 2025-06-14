const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// *******************************************************************
// *** IMPORTANT: CONFIGURE YOUR LOCAL POSTGRESQL DATABASE URL HERE ***
// *******************************************************************
// This URL connects to your local PostgreSQL server on your machine.
// Replace 'YOUR_LOCAL_PASSWORD_HERE' with the actual password you set for the 'postgres' user
// during your local PostgreSQL installation.
const databaseUrl = 'postgresql://postgres:anurag17082010@localhost:5432/postgres';
// *******************************************************************

// *******************************************************************
// *** Create a PostgreSQL Connection Pool ***
// *******************************************************************
const pool = new Pool({
    connectionString: databaseUrl,
    // The 'ssl' configuration is typically NOT needed for local connections.
    // If you uncommented it for Supabase, ensure it's removed or commented out now.
});

// Test the database connection
pool.connect()
    .then(client => {
        // CHANGED: This message now correctly reflects a local connection.
        console.log('PostgreSQL connected successfully to your local database!');
        client.release(); // Release the client back to the pool
    })
    .catch(err => console.error('PostgreSQL connection error:', err.message));

// Middleware to handle form data
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Serves your static files (HTML, CSS, JS)

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// *******************************************************************
// *** Registration Route (to save users to PostgreSQL) ***
// *******************************************************************
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // --- TEMPORARY DEBUGGING LINE ---
    // This will print the plain-text password to your terminal when a user registers.
    // REMOVE THIS LINE BEFORE DEPLOYING YOUR APPLICATION!
    console.log('User registered - Plain-text password received (FOR DEBUGGING):', password);
    // --- END TEMPORARY DEBUGGING LINE ---

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    try {
        // Check if the users table exists and create it if it doesn't
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).send('User already exists. Please choose a different username.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

        res.status(201).send('User registered successfully!');

    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send('Server error during registration.');
    }
});

// *******************************************************************
// *** Login Route (to verify users from PostgreSQL) ***
// *******************************************************************
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    try {
        // 1. Find the user by username in the database
        const userResult = await pool.query('SELECT id, username, password FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0]; // Get the first row (the user object)

        if (!user) {
            return res.status(400).send('Invalid username or password.');
        }

        // 2. Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid username or password.');
        }

        res.status(200).send('Login successful!');

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).send('Server error during login.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});