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
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
// app.use(cors({
//   origin: "http://localhost:5173", // replace with your React frontend URL
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

const PORT = process.env.PORT || 5000;

// Storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use(express.static('uploads')); // To serve files statically

// In-memory mapping: code -> filePath
const codeToFileMap = {};

// API to upload files
// API to upload files
app.post('/upload', upload.array('files'), async (req, res) => {
    const { code } = req.body;

    if (!req.files || !code) {
        return res.status(400).json({ error: 'Missing files or code' });
    }

    // Store all files associated with the code
    req.files.forEach((file) => {
        // If code doesn't exist, initialize it with an empty array
        if (!codeToFileMap[code]) {
            codeToFileMap[code] = [];
        }
        // Add the file path to the array for the given code
        codeToFileMap[code].push(file.path);

        // Set auto-delete after 10 minutes (600000 ms)
            setTimeout(() => {
                if (codeToFileMap[code]) {
                    codeToFileMap[code].forEach(filePath => {
                        if (fs.existsSync(filePath)) {
                            fs.unlink(filePath, err => {
                                if (err) console.error(`Failed to delete file: ${filePath}`);
                                else console.log(`Deleted unused file: ${filePath}`);
                            });
                        }
                    });
                    delete codeToFileMap[code];
                    console.log(`Cleaned up code: ${code}`);
                }
            }, 5 * 60 * 1000); // 10 minutes

    });

    // Respond with the number of files uploaded
    res.json({
        message: 'Files uploaded successfully',
        code: code,
        'no of files sent': req.files.length,
    });
});


// API to fetch the original filename(s) for a code
app.get('/download/:filename/:code', (req, res) => {
    const code = req.params.code;
    const filePaths = codeToFileMap[code];
    console.log(filePaths);
    if (!filePaths || filePaths.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired code' });
    }

    const files = filePaths.map(p => path.basename(p));
    console.log("back",files);
    console.log("back 1",files[0]);
    res.json({ filenames: files[0] });
});


// API to download files
app.get('/download/:code', (req, res) => {
    const code = req.params.code;
    const filePaths = codeToFileMap[code];

    if (!filePaths || filePaths.length === 0) {
        return res.status(404).json({ error: 'Invalid or expired code' });
    }

    // Assuming only one file is associated with the code
    const filePath = filePaths[0]; // Get the first file

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const filename = path.basename(filePath);
    console.log(filename);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Serve the file for download
    res.download(filePath,   (err) => {
        if (err) {
            console.error('Download error:', err);
        } else {
            // After successful download, delete the file and remove it from memory
            fs.unlinkSync(filePath);
            delete codeToFileMap[code];
        }
    });  
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});