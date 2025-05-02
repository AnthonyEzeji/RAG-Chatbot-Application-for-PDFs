const mongoose = require('mongoose')

const FileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: {
        type: String, // S3 URL where the PDF is stored
        required: true
    },
    fileSize: {
        type: Number // File size in bytes
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    processed: {
        type: Boolean, // Indicates if text extraction is complete
        default: false
    },
    embeddings: {
        type: Array // Stores vector embeddings for AI retrieval
    },
    metadata: {
        type: Object // Holds extracted document details (title, keywords, etc.)
    }
});

module.exports = mongoose.model('file', FileSchema);