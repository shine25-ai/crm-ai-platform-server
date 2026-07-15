const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
    {
        roleCode: {
            type: String,
            unique: true,
            required: true
        },

        roleName: {
            type: String,
            required: true
        },

        description: String,

        tenantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            default: null,
            index: true
        },

        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            default: null,
            index: true
        },

        permissions: [
            {
                type: String
            }
        ],

        isSystemRole: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Role', roleSchema);
