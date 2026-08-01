import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';

const s3Configured = () =>
    Boolean(process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY && process.env.AWS_BUCKET_NAME);

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg',
                          'video/mp4', 'video/webm',
                          'audio/mpeg', 'audio/wav', 'audio/ogg',
                          'application/pdf', 'application/zip',
                          'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("File type not allowed"), false);
    }
};

let storage;

if (s3Configured()) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_KEY,
        },
    });

    storage = multerS3({
        s3,
        bucket: process.env.AWS_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            cb(null, `uploads/${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
        },
    });
} else {
    const uploadsDir = "public/uploads";
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
            cb(null, Date.now() + "_" + safeName);
        }
    });
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
});

export { s3Configured };
export default upload;
