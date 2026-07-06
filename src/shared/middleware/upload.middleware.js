const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../../uploads/documents');
const taskUploadDir = path.join(__dirname, '../../../uploads/tasks');
[uploadDir, taskUploadDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const makeStorage = (dest) =>
    multer.diskStorage({
        destination: (req, file, cb) => cb(null, dest),
        filename: (req, file, cb) => {
            const uniqueSuffix =
                Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });

// Standard documents filter
const docExtensions = [
    '.pdf',
    '.doc',
    '.docx',
    '.jpg',
    '.jpeg',
    '.png',
    '.txt'
];
const docFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (docExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Allowed extensions: ${docExtensions.join(', ')}`), false);
    }
};

// Extended task attachments filter (.xlsx, .zip included)
const taskExtensions = [
    ...docExtensions,
    '.xlsx',
    '.xls',
    '.csv',
    '.zip',
    '.rar'
];
const taskFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (taskExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error(`Allowed extensions: ${taskExtensions.join(', ')}`),
            false
        );
    }
};

// Chat attachments filter (PDF, DOCX, XLSX, PPTX, ZIP, JPG, PNG, GIF)
const chatExtensions = [
    '.pdf',
    '.docx',
    '.xlsx',
    '.pptx',
    '.zip',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif'
];
const chatFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (chatExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error(`Allowed extensions: ${chatExtensions.join(', ')}`),
            false
        );
    }
};

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: docFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

const taskUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: taskFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 }
});

const chatUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: chatFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB size limit
});

const expenseExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
const expenseFileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (expenseExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `Expense receipts must be: ${expenseExtensions.join(', ')}`
            ),
            false
        );
    }
};

const expenseUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: expenseFileFilter,
    limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

module.exports = upload;
module.exports.taskUpload = taskUpload;
module.exports.chatUpload = chatUpload;
module.exports.expenseUpload = expenseUpload;
