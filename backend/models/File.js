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
        type: String, 
        required: true
    },
    fileSize: {
        type: Number 
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    processed: {
        type: Boolean, 
        default: false
    },
    embeddings: {
        type: Array  
    },
    metadata: {
        type: Object  
    },
    pageCount: {
        type: Number
    },
    s3Key: {
        type: String
    }
});

module.exports = mongoose.model('file', FileSchema);