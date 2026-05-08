import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "profilePicture") {
      const isImage = file.mimetype.startsWith("image/");
      cb(null, isImage);
    } else if (file.fieldname === "resume") {
      cb(null, file.mimetype === "application/pdf");
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export default upload;
