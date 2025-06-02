const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for the client domain
app.use(cors({
    origin: "https://quick-share-olda.onrender.com",
}));

const PORT = process.env.PORT || 5000;

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

// In-memory store: code => file metadata
const codeToFileMap = {};

// Health check endpoint
app.get('/test', (req, res) => {
    res.send('Server is working');
});

// Upload file to Cloudinary
const uploadToCloudinary = (buffer, fileName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto',
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

// Upload endpoint using Cloudinary
app.post('/upload', upload.array('files'), async (req, res) => {
    const { code } = req.body;
    
    if (!req.files || !code) {
        return res.status(400).json({ error: 'Missing files or code' });
    }

    if (!codeToFileMap[code]) {
        codeToFileMap[code] = [];
    }

    try {
        const uploadPromises = req.files.map(async (file) => {
            const result = await uploadToCloudinary(file.buffer, file.originalname);
            
            codeToFileMap[code].push({
                name: file.originalname,
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            });
        });

        await Promise.all(uploadPromises);

        // Auto-clean after 10 minutes
        setTimeout(async () => {
            if (codeToFileMap[code]) {
                // Delete files from Cloudinary
                const deletePromises = codeToFileMap[code].map(file => 
                    cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type })
                        .catch(err => console.error(`Failed to delete ${file.public_id}:`, err))
                );
                
                await Promise.all(deletePromises);
                delete codeToFileMap[code];
                console.log(`Cleaned up code: ${code}`);
            }
        }, 10 * 60 * 1000); // 10 minutes

        res.json({
            message: 'Files uploaded successfully',
            code,
            'files_uploaded': req.files.length
        });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload to Cloudinary failed' });
    }
});

// Endpoint to get filenames only
app.get('/download/:filename/:code', (req, res) => {
    const { code } = req.params;
    const files = codeToFileMap[code];

    if (!files || files.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired code' });
    }

    res.json({ filenames: files.map(f => f.name) });
});

// Endpoint to download a file by code
app.get('/download/:code', async (req, res) => {
    const { code } = req.params;
    const files = codeToFileMap[code];

    if (!files || files.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired code' });
    }

    try {
        const file = files[0]; // Get the first file (we're only handling one file at a time)
        
        // Redirect to the Cloudinary URL for direct download
        res.redirect(file.url);
    } catch (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
