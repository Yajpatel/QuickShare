const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    // The path to the file in Firebase Storage
    firebaseStoragePath: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 600 // 10 minutes in seconds (auto-delete after expiry)
    }
});

module.exports = mongoose.model('File', fileSchema);