const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { AppError } = require("./errorHandler");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to allow only certain file types
const fileFilter = (req, file, cb) => {
  // Accept images, PDFs, and common document formats
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/msword" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype === "application/vnd.ms-excel" ||
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.mimetype === "application/zip" ||
    file.mimetype === "text/plain"
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Invalid file type. Only images, PDFs, documents, spreadsheets, zip files, and text files are allowed.",
        400
      ),
      false
    );
  }
};

// Configure multer upload
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

//  Upload a file to Cloudinary

const uploadToCloudinary = async (fileBuffer, folder = "deliverables") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Convert buffer to stream and pipe to uploadStream
    const Readable = require("stream").Readable;
    const readableStream = new Readable();
    readableStream.push(fileBuffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

module.exports = {
  upload,
  uploadToCloudinary,
};
