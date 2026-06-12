const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        module: {
            type: String,
            required: true
        },
        action: {
            type: String,
            required: true
        },
        oldData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        newData: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        ipAddress: {
            type: String,
            default: ''
        },
        userAgent: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
