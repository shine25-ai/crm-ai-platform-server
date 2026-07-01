const crypto = require('crypto');
const AppError = require('./appError');

const getKey = () => {
    const secret =
        process.env.CONFIG_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
    if (!secret) {
        throw new AppError(
            'Server encryption key is not configured. Set CONFIG_ENCRYPTION_KEY.',
            500
        );
    }
    return crypto.createHash('sha256').update(secret).digest();
};

const encryptSecret = (value) => {
    if (!value) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(String(value), 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return [iv, tag, encrypted]
        .map((part) => part.toString('base64url'))
        .join('.');
};

const decryptSecret = (value) => {
    if (!value) return '';
    try {
        const [iv, tag, encrypted] = String(value)
            .split('.')
            .map((part) => Buffer.from(part, 'base64url'));
        const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]).toString('utf8');
    } catch {
        throw new AppError('Stored communication credential is invalid', 500);
    }
};

module.exports = { encryptSecret, decryptSecret };
