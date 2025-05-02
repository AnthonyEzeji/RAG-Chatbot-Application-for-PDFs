const express = require('express')
const multer = require("multer");
const jwt = require("jsonwebtoken")
const upload = multer();
const router = express.Router()
const Helpers = require('../helpers')
const helpers = new Helpers()
const fileModel = require('../models/File')


router.post('/upload',upload.single("file"), async(req,res)=>{
    try {

    const fileName = req.file.originalname
    const fileBuffer = req.file.buffer
    const userId = req.user.userId
    const filePath = req.file.path;
    const extractedText = await helpers.extractTextFromPDFPerPage(fileBuffer);
    console.log(extractedText)
    console.log(extractedText)
    const embeddings = await helpers.generatePageEmbeddings(extractedText)
    let uploadedFileUrl = await helpers.uploadFile(fileBuffer, fileName, userId)
    let file = await fileModel.create({userId,fileName,fileUrl:uploadedFileUrl,fileSize:req.file.size,processed:true,embeddings,metadata:{extractedText}})
    res.send(200)
    } catch (error) {
        console.log(error)
    }
    
})
router.get("/", async(req,res)=>{
    try {
       
        const userId = req.user.userId
        let userFiles = await fileModel.find({userId})
        res.send(userFiles)
    } catch (error) {
        console.log(error)
    }
})

module.exports = router