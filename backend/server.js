const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose =  require('mongoose')
const session = require("express-session");
const http = require('http')
dotenv.config()
const fileRoutes = require('./routes/file')
const authRoutes = require('./routes/auth')
const questionRoutes = require('./routes/question')
const Helpers = require('./helpers');
const setupSocket = require('./socket');
const helpers = new Helpers()
mongoose.connect(process.env.MONGO_DB_URI)
var app = express()




app.use(express.json(),cors("*"))

// app.use(session({
//     secret: process.env.JWT_SECRET_KEY, // Change this to a secure random string
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: false } // Set to `true` if using HTTPS
// }));
app.use(helpers.authenticateToken)
app.use('/files', fileRoutes)
app.use('/auth',authRoutes)
app.use('/questions',questionRoutes)

const httpServer = app.listen(5050,()=>console.log('server successfully running on port 5000...'))

setupSocket(httpServer);




