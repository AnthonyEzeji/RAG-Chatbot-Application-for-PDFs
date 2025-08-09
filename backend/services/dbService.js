const fileModel = require("../models/File");
const mongoose = require('mongoose');

async function retrieveFile(fileId) {
    try {
        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            throw new Error("Invalid file ID format");
        }
        
        console.log("Retrieving file with ID:", fileId);
        const fileData = await fileModel.findById(fileId);
     
        if (!fileData) {
            throw new Error("File not found");
        }
        
        return fileData;
    } catch (error) {
        console.error("Database error:", error.message);
        throw error;
    }
}

module.exports = { retrieveFile };
