// const express = require('express');
// const multer  = require('multer');
// const cors    = require('cors');
// const path    = require('path');
// const fs      = require('fs');
// const archiver = require('archiver');

// const app = express();

// // Allow CORS from your React app
// app.use(cors());

// const PORT = 5000;
// const UPLOAD_DIR = path.join(__dirname, 'uploads');
// fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// // Memory store: code → array of { path, originalname }
// const fileMap = new Map();

// // Multer saves uploads to disk (preserving original name)
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename:    (req, file, cb) => cb(null, file.originalname)
// });
// const upload = multer({ storage });

// // 1) Upload endpoint
// // Expects form-data: files[] + code
// app.post('/upload', upload.array('files'), (req, res) => {
//   const { code } = req.body;
//   console.log(code);
//   if (!code) {
//     return res.status(400).json({ message: 'Missing code.' });
//   }
//   if (!req.files || !req.files.length) {
//     return res.status(400).json({ message: 'No files uploaded.' });
//   }

//   // Save mapping: code → list of files
//   fileMap.set(code, req.files.map(f => ({
//     path: f.path,
//     originalname: f.originalname
//   })));

//   res.json({
//     message: 'Upload successful',
//     code,
//     files: req.files.map(f => f.originalname)
//   });
// });
// ///
// app.get('/download/:code', (req, res) => {
//   const code = req.params.code;
//   const files = fileMap.get(code);

//   console.log(code);
//   console.log(files);

//   if (!files || files.length === 0) {
//       return res.status(404).json({ message: 'Invalid code or no files found.' });
//   }

//   if (files.length === 1) {
//       // Single file: directly download
//       const file = files[0];
//       return res.download(file.path, file.originalname, (err) => {
//           if (err) {
//               console.error('Error during file download:', err);
//               res.status(500).json({ message: 'Error during file download.' });
//           }
//       });
//   } else {
//       // Multiple files: stream zip without saving
//       const archive = archiver('zip', { zlib: { level: 9 } });

//       res.attachment(`${code}.zip`); // tell browser it's a zip file
//       archive.pipe(res); // directly stream to response

//       files.forEach(file => {
//           archive.file(file.path, { name: file.originalname });
//       });

//       archive.finalize();

//       archive.on('error', (err) => {
//           console.error('Archive error:', err);
//           res.status(500).json({ message: 'Error creating zip file.', error: err.message });
//       });
//   }
// });


// // Start the server
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');
const axios = require('axios');

const app = express();

app.use(cors({
    origin: "https://quick-share-olda.onrender.com",
}));

const PORT = process.env.PORT || 5000;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret
});

// Multer setup - store in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(express.json());

// In-memory map: code => array of Cloudinary file info
const codeToFileMap = {};

// Convert buffer to stream for Cloudinary upload
const bufferToStream = (buffer) => {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
};
a
// Wrap Cloudinary upload in a promise for async handling
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({
            resource_type: 'auto',
            folder: 'quickshare'
        }, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });

        bufferToStream(file.buffer).pipe(stream);
    });
};

// Upload route
app.post('/upload', upload.single('files'), async (req, res) => {
    const { code } = req.body;

    if (!req.files || !code) {
        return res.status(400).json({ error: 'Missing files or code' });
    }

    if (!codeToFileMap[code]) {
        codeToFileMap[code] = [];
    }

    try {
        // Upload all files to Cloudinary in parallel using Promise.all
        const uploadPromises = req.files.map((file) =>
            uploadToCloudinary(file).then((result) => {
                // Add file information to the in-memory map
                codeToFileMap[code].push({
                    url: result.secure_url,
                    public_id: result.public_id,
                    original_filename: result.original_filename
                });
            })
        );

        await Promise.all(uploadPromises);

        // Auto-cleanup after 10 minutes
        setTimeout(async () => {
            if (codeToFileMap[code]) {
                const deletePromises = codeToFileMap[code].map((file) =>
                    cloudinary.uploader.destroy(file.public_id, { resource_type: 'auto' })
                        .then(() => {
                            console.log(`Deleted from Cloudinary: ${file.public_id}`);
                        })
                        .catch((err) => {
                            console.error(`Failed to delete: ${file.public_id}`, err);
                        })
                );
                await Promise.all(deletePromises); // Wait for all deletes to finish
                delete codeToFileMap[code]; // Clean up in-memory data
                console.log(`Cleaned up code: ${code}`);
            }
        }, 10 * 60 * 1000); // 10 minutes

        res.json({
            message: 'Files uploaded to Cloudinary',
            code,
            'no of files sent': req.files.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Get filenames for a code
app.get('/download/:filename/:code', (req, res) => {
    const code = req.params.code;
    const files = codeToFileMap[code];

    if (!files || files.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired code' });
    }

    res.json({ filenames: files[0].original_filename });
});

// Get download URL
app.get('/download/:code', async (req,res) => {
  try {
    const code = req.params.code;
    const info = codeToFileMap[code];
    if (!info) {
      return res.status(404).send({ error: 'Code not found' });
    }
    const fileUrl = info.secure_url;
    const axiosRes = await axios.get(fileUrl, { responseType: 'stream' });
    axiosRes.data.pipe(res);
  } catch(err) {
    console.error("Download error:", err);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
