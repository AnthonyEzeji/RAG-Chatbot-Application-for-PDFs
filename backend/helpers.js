const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken')
const fs = require( "fs");

const { S3Client, PutObjectCommand,GetObjectCommand } = require("@aws-sdk/client-s3");

const pdfParse = require("pdf-parse") ;
const s3 = new S3Client({ region: process.env.AWS_REGION });
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class Helpers {
    s3;
  
    constructor() {
        this.s3 = s3
    }
    generateUniqueFileName = (fileName, userId) => {
        return `${userId}-${Date.now()}-${uuidv4()}-${fileName}`;
    };
    

    
    async extractTextFromPDFPerPage(buffer) {
        const data = await pdfParse(buffer);
    
        if (!data.text || !data.numpages) {
            console.log("No text detected or page count could not be determined.");
            return [];
        }
    
        console.log(`Total pages detected: ${data.numpages}`);
    
        // ✅ Extract text per page using pdfParse's built-in page separation
        const pages = data.pages ? data.pages.map(page => page.text) : data.text.split(/\f/); // Uses form feed (\f) as an alternative separator
    
        console.log("Extracted pages:", pages.length);
        
        return pages;
    }
    
  
    
    
    
    
    async generatePageEmbeddings(pages) {
        const embeddings = await Promise.all(
            pages.map(async (pageText) => {
                const response = await openai.embeddings.create({
                    model: "text-embedding-ada-002",
                    input: pageText,
                });
                return response.data[0].embedding;
            })
        );
        console.log(embeddings.length)
        return embeddings;
    }
    
    


 authenticateToken(req, res, next) {
    console.log(req.path)
    if (!req || !req.path) {
        return res.status(500).json({ message: "Request object is missing." });
    }
    const allowedRoutes = ["/auth/login", "/auth/register","/socket.io"];

    if (allowedRoutes.includes(req.path)) {
        return next();
    }
    const token = req.headers.authorization.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: "Unauthorized" });
        
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = decoded; 
        next(); 
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}
    async uploadFile(fileBuffer, fileName,userId) {
        try {
            const uniqueFileName = this.generateUniqueFileName(fileName, userId);
            const params = {
                Bucket: process.env.S3_BUCKET,
                Key: uniqueFileName,
                Body: fileBuffer,
                ContentType: "application/pdf",
            };
    
            const command = new PutObjectCommand(params);
            await this.s3.send(command).then(output=>{
                console.log(output)
            });
            return `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`
        } catch (error) {
            console.log(error)
        }
       
    }
}

module.exports = Helpers
