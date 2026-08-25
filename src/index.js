const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import your auth handlers from the api/auth folder
const loginHandler = require('./api/auth/login');
const registerHandler = require('./api/auth/register');
const logoutHandler = require('./api/auth/logout');
const sessionHandler = require('./api/auth/session');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API Authentication Routes
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/logout', logoutHandler);
app.get('/api/auth/session', sessionHandler);

// Page Routing
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Fallback to index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.exports = app; // Or app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
