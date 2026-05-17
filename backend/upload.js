const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const trackingNumber = req.params.trackingNumber;
    const pkgDir = path.join(UPLOAD_DIR, trackingNumber);
    if (!fs.existsSync(pkgDir)) {
      fs.mkdirSync(pkgDir, { recursive: true });
    }
    cb(null, pkgDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Magic byte signatures for image types
const MAGIC_BYTES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')]
};

function validateMagicBytes(filePath, mimetype) {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buffer, 0, 12, 0);
  fs.closeSync(fd);

  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return false;

  return signatures.some(sig => {
    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) return false;
    }
    // WebP files also need "WEBP" at offset 8
    if (mimetype === 'image/webp') {
      const webpTag = Buffer.from('WEBP');
      for (let i = 0; i < 4; i++) {
        if (buffer[8 + i] !== webpTag[i]) return false;
      }
    }
    return true;
  });
}

function validateUploadedFiles(req, res, next) {
  if (!req.files || req.files.length === 0) return next();

  for (const file of req.files) {
    if (!validateMagicBytes(file.path, file.mimetype)) {
      // Delete the invalid file
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: `File "${file.originalname}" failed validation: content does not match file type` });
    }
  }
  next();
}

function getPhotosForPackage(trackingNumber) {
  const pkgDir = path.join(UPLOAD_DIR, trackingNumber);
  if (!fs.existsSync(pkgDir)) return [];

  const files = fs.readdirSync(pkgDir);
  return files
    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .map(f => `/uploads/${trackingNumber}/${f}`);
}

module.exports = { upload, validateUploadedFiles, getPhotosForPackage, UPLOAD_DIR };
