const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;
const defaultBucketBaseUrl =
    bucketName && region
        ? `https://${bucketName}.s3.${region}.amazonaws.com/`
        : '';

const normalizeBucketBaseUrl = (value) => {
    if (!value) {
        return defaultBucketBaseUrl;
    }

    try {
        const url = new URL(value);

        // If the configured URL points to a different S3 bucket, prefer the active bucket config.
        if (
            bucketName &&
            url.hostname.includes('.amazonaws.com') &&
            url.hostname.startsWith(`${bucketName}.`) === false
        ) {
            return defaultBucketBaseUrl;
        }

        return url.toString().endsWith('/')
            ? url.toString()
            : `${url.toString()}/`;
    } catch (error) {
        return defaultBucketBaseUrl;
    }
};

const bucketBaseUrl = normalizeBucketBaseUrl(
    process.env.S3_URL || process.env.S3_URL
);

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const sanitizeFileName = (value) =>
    value.replace(/[^a-zA-Z0-9.-]/g, '-').replace(/-+/g, '-');

const uploadProfilePhotoToS3 = async (file, userId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `profile-photos/${userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const uploadChatAttachmentToS3 = async (file, userId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `chat-attachments/${userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const uploadEmployeeDocumentToS3 = async (file, employeeId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `employee-documents/${employeeId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const uploadCustomerDocumentToS3 = async (file, customerId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `customer-documents/${customerId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const uploadTaskAttachmentToS3 = async (file, userId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `task-attachments/${userId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const deleteFileFromS3 = async (urlOrKey) => {
    if (!urlOrKey) return;
    try {
        let key = urlOrKey;
        if (urlOrKey.startsWith('http')) {
            const urlObj = new URL(urlOrKey);
            key = urlObj.pathname.slice(1);
        }
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: key
            })
        );
    } catch (error) {
        console.error('Failed to delete file from S3:', error);
    }
};

const uploadLeadDocumentToS3 = async (file, leadId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `lead-documents/${leadId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

const uploadExpenseAttachmentToS3 = async (file, claimId) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, extension);
    const key = `expense-receipts/${claimId}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
        baseName
    )}${extension}`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        })
    );

    return `${bucketBaseUrl}${key}`;
};

module.exports = {
    uploadProfilePhotoToS3,
    uploadChatAttachmentToS3,
    uploadEmployeeDocumentToS3,
    uploadCustomerDocumentToS3,
    uploadTaskAttachmentToS3,
    uploadLeadDocumentToS3,
    uploadExpenseAttachmentToS3,
    deleteFileFromS3
};
