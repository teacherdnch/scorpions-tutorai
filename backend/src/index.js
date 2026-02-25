const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { setupDatabase } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize DB schema
try {
    setupDatabase();
} catch (error) {
    console.error("Failed to initialize database schema:", error);
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/tests', require('./routes/tests'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Tutorai API is running' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
