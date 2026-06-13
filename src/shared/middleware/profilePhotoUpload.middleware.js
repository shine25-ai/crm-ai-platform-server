const multer = require('multer');

const profilePhotoUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp'
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
            return;
        }

        cb(new Error('Only JPG, JPEG, PNG, and WEBP images are allowed'));
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = profilePhotoUpload;
