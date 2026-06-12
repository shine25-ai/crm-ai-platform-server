const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
    {
        permissionCode: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        permissionName: {
            type: String,
            required: true,
            trim: true
        },
        module: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'ACTIVE'
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

permissionSchema.virtual('permissionId').get(function () {
    return this.permissionCode;
});

permissionSchema.virtual('name').get(function () {
    return this.permissionName;
});

module.exports = mongoose.model('Permission', permissionSchema);
