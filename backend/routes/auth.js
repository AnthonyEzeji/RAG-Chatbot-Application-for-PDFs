const express = require('express')
const userModel = require('../models/User')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
router.post('/register', async(req,res)=>{
    try {
        console.log(req.body)
        const {email,firstName,lastName,password} = req.body
        const registeredUser = await userModel.findOne({email})
        if(!registeredUser){
           const  hashedPassword = await bcrypt.hash(password, 3);
            await userModel.create({email,firstName,lastName,password:hashedPassword})
            res.sendStatus(201)
        }
        else if(registeredUser){
            console.log(1)
            return res.sendStatus(409)
            
        }
        else{
            return res.sendStatus(422)
        }
        

    } catch (error) {
        console.log(error)
    }
    
})
router.post('/login', async(req,res)=>{
    try {
        
        const {email,password} =  req.body
        const user = await userModel.findOne({ email });
        
        if (!user) return res.sendStatus(401).json({ message: "Invalid credentials" });
    
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.sendStatus(401).json({ message: "Invalid password" });
    
       
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: "1h" });
    
        return res.json({ token, user: {email:user.email,firstName:user.firstName,lastName:user.lastName,_id:user._id} });
    } catch (error) {
        console.log(error)
    }
   
})

module.exports = router