const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require("express-session");
const http = require('http');

// Load environment variables
dotenv.config();

const fileRoutes = require('./routes/file');
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/question');
const Helpers = require('./helpers');
const setupSocket = require('./socket');

const helpers = new Helpers();
const app = express();

// Database connection with error handling
mongoose.connect(process.env.MONGO_DB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// CORS configuration - restrict to specific origins
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(express.json({ limit: '10mb' })); // Add size limit for JSON payloads
app.use(cors(corsOptions));

// Authentication middleware (applied to all routes except auth)
app.use(helpers.authenticateToken);

// Route handlers
app.use('/files', fileRoutes);
app.use('/auth', authRoutes);
app.use('/questions', questionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ message: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5050;
const httpServer = app.listen(PORT, () => {
    console.log(`Server successfully running on port ${PORT}`);
});

// Setup Socket.IO
setupSocket(httpServer);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
        mongoose.connection.close();
        process.exit(0);
    });
});

module.exports = app;




