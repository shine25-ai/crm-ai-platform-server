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

        permissions: [{
            type: String
        }],

        isSystemRole: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            default: 'ACTIVE'
        }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('Role', roleSchema);