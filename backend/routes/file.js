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
        const uploadResult = await helpers.uploadFile(fileBuffer, fileName, userId);
        
        // Create file record in database
        const file = await fileModel.create({
            userId,
            fileName,
            fileUrl: uploadResult.url,
            fileSize: req.file.size,
            processed: true,
            embeddings,
            metadata: { extractedText },
            pageCount: extractedText.length,
            s3Key: uploadResult.key
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

router.delete("/:fileId", async(req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.userId;
        
        console.log(`Delete request for file: ${fileId} by user: ${userId}`);
        
        // Validate ObjectId format
        if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid file ID format" });
        }
        
        // Find the file to ensure it exists and belongs to the user
        const file = await fileModel.findOne({ _id: fileId, userId });
        
        if (!file) {
            return res.status(404).json({ message: "File not found or you don't have permission to delete it" });
        }
        
        console.log(`Found file to delete: ${file.fileName}`);
        
        // Delete vectors from Pinecone
        try {
            // Get all vector IDs for this file (they follow the pattern: fileId_page_X)
            const vectorIds = [];
            const pageCount = file.pageCount || (file.embeddings ? file.embeddings.length : 0);
            
            for (let i = 0; i < pageCount; i++) {
                vectorIds.push(`${fileId}_page_${i}`);
            }
            
            if (vectorIds.length > 0) {
                await index.deleteMany(vectorIds);
                console.log(`Deleted ${vectorIds.length} vectors from Pinecone for file: ${file.fileName}`);
            }
        } catch (pineconeError) {
            console.error("Error deleting vectors from Pinecone:", pineconeError);
            // Continue with deletion even if Pinecone fails
        }
        
        // Delete from S3 if S3Key exists
        try {
            let s3Key = file.s3Key;
            
            // For backwards compatibility, extract key from URL if s3Key doesn't exist
            if (!s3Key && file.fileUrl) {
                const urlParts = file.fileUrl.split('/');
                s3Key = urlParts[urlParts.length - 1];
            }
            
            if (s3Key) {
                await helpers.deleteFromS3(s3Key);
                console.log(`Deleted file from S3: ${s3Key}`);
            }
        } catch (s3Error) {
            console.error("Error deleting file from S3:", s3Error);
            // Continue with deletion even if S3 fails
        }
        
        // Delete from MongoDB
        await fileModel.deleteOne({ _id: fileId, userId });
        console.log(`Successfully deleted file from database: ${file.fileName}`);
        
        res.status(200).json({ 
            message: "File deleted successfully",
            fileName: file.fileName,
            fileId: fileId
        });
        
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ message: "Failed to delete file" });
    }
});

module.exports = router;