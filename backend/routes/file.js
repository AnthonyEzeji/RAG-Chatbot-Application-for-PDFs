const express = require('express');
const multer = require("multer");
const jwt = require("jsonwebtoken");
const upload = multer();
const router = express.Router();
const Helpers = require('../helpers');
const helpers = new Helpers();
const fileModel = require('../models/File');
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize Pinecone
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});
const index = pinecone.index("pdf-embeddings-new", process.env.PINECONE_INDEX_HOST);

router.post('/upload', upload.single("file"), async(req, res) => {
    try {
        // Validate file upload
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        // Validate file type
        if (req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ message: "Only PDF files are allowed" });
        }

        // Validate file size (10MB limit)
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "File size exceeds 10MB limit" });
        }

        const fileName = req.file.originalname;
        const fileBuffer = req.file.buffer;
        const userId = req.user.userId;
        
        console.log(`Processing file upload: ${fileName} for user: ${userId}`);

        // Extract text from PDF
        const extractedText = await helpers.extractTextFromPDFPerPage(fileBuffer);
        
        if (!extractedText || extractedText.length === 0) {
            return res.status(400).json({ message: "No text could be extracted from the PDF" });
        }

        console.log(`Extracted ${extractedText.length} pages from PDF`);

        // Generate embeddings for each page
        const embeddings = await helpers.generatePageEmbeddings(extractedText);
        
        // Upload file to S3
        const uploadedFileUrl = await helpers.uploadFile(fileBuffer, fileName, userId);
        
        // Create file record in database
        const file = await fileModel.create({
            userId,
            fileName,
            fileUrl: uploadedFileUrl,
            fileSize: req.file.size,
            processed: true,
            embeddings,
            metadata: { extractedText }
        });

        // Store vectors in Pinecone with unique IDs
        for (let i = 0; i < embeddings.length; i++) {
            const vectorId = `${file._id}_page_${i}`;
            await index.upsert([{
                id: vectorId,
                values: embeddings[i],
                metadata: { 
                    text: extractedText[i],
                    fileId: file._id.toString(),
                    pageNumber: i,
                    category: "document"
                }
            }]);
        }

        console.log(`Successfully processed and stored ${embeddings.length} vectors for file: ${fileName}`);

        res.status(200).json({ 
            message: "File uploaded and processed successfully",
            fileId: file._id,
            fileName: file.fileName,
            pageCount: extractedText.length
        });

    } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({ message: "Failed to process file upload" });
    }
});

router.get("/", async(req, res) => {
    try {
        const userId = req.user.userId;
        const userFiles = await fileModel.find({ userId }).select('fileName fileSize uploadedAt processed _id');
        
        res.status(200).json(userFiles);
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Failed to fetch files" });
    }
});

router.get("/:fileId", async(req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.userId;
        
        // Validate ObjectId format
        if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid file ID format" });
        }
        
        const file = await fileModel.findOne({ _id: fileId, userId });
        
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
        
        res.status(200).json(file);
    } catch (error) {
        console.error("Error fetching file:", error);
        res.status(500).json({ message: "Failed to fetch file" });
    }
});

module.exports = router;