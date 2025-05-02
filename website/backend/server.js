const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const port = 3001; // Backend runs on a different port than frontend

// Ensure assets directory exists
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)){
    fs.mkdirSync(assetsDir, { recursive: true });
    console.log(`Created assets directory at ${assetsDir}`);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadsDir}`);
}

// Expanded CORS configuration
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'], // Allow GET and POST
  allowedHeaders: ['Content-Type'], // Allow Content-Type header
}));

// Add middleware to parse JSON
app.use(express.json());

// Multer setup for file storage in the uploads directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir); // Store files in the 'uploads' directory
  },
  filename: function (req, file, cb) {
    // Keep original filename
    // Consider adding logic to prevent overwrites or sanitize names if needed
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only .glb files
    if (path.extname(file.originalname).toLowerCase() === '.glb') {
      cb(null, true);
    } else {
      cb(new Error('Only .glb files are allowed!'), false);
    }
  }
});

// Updated route to list assets from both assets and uploads directories
app.get('/api/assets', (req, res) => {
  console.log('Received request to list assets');
  
  // Helper function to read and filter GLB files
  const readGlbFiles = (directory) => {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          console.error(`Could not list the directory ${directory}.`, err);
          reject(err);
          return;
        }
        // Filter for .glb files
        const glbFiles = files
          .filter(file => path.extname(file).toLowerCase() === '.glb')
          .map(file => {
            // Add source information to each file
            return {
              name: file,
              source: path.basename(directory)
            };
          });
        resolve(glbFiles);
      });
    });
  };

  // Read both directories and combine results
  Promise.all([
    readGlbFiles(assetsDir),
    readGlbFiles(uploadsDir)
  ])
    .then(([assetsFiles, uploadsFiles]) => {
      const allFiles = [...assetsFiles, ...uploadsFiles];
      console.log(`Found ${allFiles.length} GLB files total`);
      res.json(allFiles);
    })
    .catch(error => {
      console.error("Error listing assets:", error);
      res.status(500).send("Server error listing assets.");
    });
});

// Re-add file upload endpoint
app.post('/upload', upload.single('asset'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded or file type not allowed.');
  }
  console.log('Uploaded file:', req.file.filename);
  // Send back success message or the filename
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
}, (error, req, res, next) => {
    // Handle Multer errors (e.g., wrong file type)
    if (error instanceof multer.MulterError) {
        // A Multer error occurred when uploading.
        return res.status(500).json({ error: error.message });
    } else if (error) {
        // An unknown error occurred when uploading.
        return res.status(400).json({ error: error.message }); // Use the error message from fileFilter
    }
    // Everything went fine.
    next();
});

// Add a more detailed error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Server error');
});

// Serve static assets from both directories
app.use('/assets', express.static(assetsDir, {
  setHeaders: (res, path) => {
    // Set appropriate headers for GLB files
    if (path.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  }
}));

app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res, path) => {
    // Set appropriate headers for GLB files
    if (path.endsWith('.glb')) {
      res.setHeader('Content-Type', 'model/gltf-binary');
    }
  }
}));

// Basic route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
}); 