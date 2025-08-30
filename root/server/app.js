const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const File = require('./models/File');
const axios = require('axios');
// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for the client domain
app.use(cors({
    // origin: "https://quick-share-olda.onrender.com",
    origin: "http://localhost:5173",
}));

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer memory storage for temporary file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/test', (req, res) => {
    res.send('Server is working');
});

// Upload file to Cloudinary
const uploadToCloudinary = (buffer, fileName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type : 'raw',
                type : 'upload',
                folder: 'quickshare',
                public_id: `${Date.now()}-${fileName}`,
                use_filename: true
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

// Upload endpoint using Cloudinary and MongoDB
app.post('/upload', upload.array('files'), async (req, res) => {
    const { code } = req.body;
    
    console.log('Uploading files with code:', code); // Debug log
    if (!req.files || !code) {
        return res.status(400).json({ error: 'Missing files or code' });
    }

    try {
        const uploadPromises = req.files.map(async (file) => {
            const result = await uploadToCloudinary(file.buffer, file.originalname);
            
            // Save file information to MongoDB
            await File.create({
                code,
                name: file.originalname,
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            });
        });

        await Promise.all(uploadPromises);

        res.json({
            message: 'Files uploaded successfully',
            code,
            'files_uploaded': req.files.length
        });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload to Cloudinary or MongoDB failed' });
    }
});

// Endpoint to get filenames only (now downloads the specific file)
app.get('/download/:filename/:code', async (req, res) => {
    const { code, filename } = req.params;
    console.log('Downloading file with code:', code, 'and filename:', filename); // Debug log
    try {
        const file = await File.findOne({ code, name: filename });
        if (!file) {
            return res.status(404).json({ error: 'Invalid or expired code or file not found' });
        }
        // Fetch the file from Cloudinary and pipe it to the response
        const fileResponse = await axios.get(file.url, { responseType: 'stream' });
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
        fileResponse.data.pipe(res);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Endpoint to download a file by code (proxy from Cloudinary)
app.get('/download/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const files = await File.find({ code });
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired code' });
        }
        const file = files[0];
        const fileUrl = file.url;
        const fileName = file.name;
        // Fetch the file from Cloudinary and pipe it to the response
        const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
        fileResponse.data.pipe(res);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// Endpoint to get all files (name and url) for a code
app.get('/files/:code', async (req, res) => {
    const { code } = req.params;
    try {
        const files = await File.find({ code });
        if (!files || files.length === 0) {
            return res.status(404).json({ error: 'Invalid or expired code' });
        }
        res.json({ files: files.map(f => ({ name: f.name, url: f.url })) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve files' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});