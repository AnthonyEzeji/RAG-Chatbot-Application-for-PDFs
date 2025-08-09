const express = require('express');
const userModel = require('../models/User');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/register', async(req, res) => {
    try {
        console.log("Registration attempt:", req.body);
        const { email, firstName, lastName, password } = req.body;
        
        // Input validation
        if (!email || !firstName || !lastName || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
        
        const existingUser = await userModel.findOne({ email });
        
        if (existingUser) {
            return res.status(409).json({ message: "User already exists with this email" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10); // Increase salt rounds for better security
        await userModel.create({ email, firstName, lastName, password: hashedPassword });
        
        res.status(201).json({ message: "User registered successfully" });
        
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        
        // Input validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        
        const user = await userModel.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
    
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
    
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "24h" }); // Extend token life
    
        return res.json({ 
            token, 
            user: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                _id: user._id
            } 
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;