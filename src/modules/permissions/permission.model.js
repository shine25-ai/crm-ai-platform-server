const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
    {
        permissionId: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
