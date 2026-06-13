const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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
    process.env.S3_URL || process.env.S3_UR
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

module.exports = {
    uploadProfilePhotoToS3
};
