import express from 'express'
import upload, { s3Configured } from '../middleware/multer.middleware.js'

const router = express.Router();

router.post('/upload', upload.single('file'), (req,res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    const url = s3Configured()
        ? req.file.location
        : `/uploads/${req.file.filename}`;
    res.json({
        message: "file uploaded successfully",
        file: {
            url,
            filename: req.file.filename || (req.file.key && req.file.key.split('/').pop()),
            size: req.file.size,
            mimetype: req.file.mimetype,
        }
    })
})
export default router
