const fileModel = require("../models/File");
const mongoose = require('mongoose')


async function retrieveFile(fileId) {
    try {
        
        const objectId = new mongoose.Types.ObjectId(fileId); // ✅ Convert to ObjectId
       console.log(fileId)
        const fileData = await fileModel.findById(fileId);
     
        if (!fileData) throw new Error("File not found");
        
        return fileData;
    } catch (error) {
        console.error("Database error:", error);
        throw error;
    }
}


module.exports = { retrieveFile };
