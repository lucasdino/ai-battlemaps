const multer = require('multer');

function handleMulterError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(500).json({ error: error.message });
  } else if (error) {
    // An unknown error occurred when uploading.
    // This could be the custom error from fileFilter
    return res.status(400).json({ error: error.message }); 
  }
  // Everything went fine.
  next();
}

module.exports = {
  handleMulterError
}; 