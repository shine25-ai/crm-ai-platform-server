const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: String,
        email: {
            type: String,
            unique: true,
            required: true
        },
        password: String,
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true
        },
        status: {
            type: String,
            default: 'ACTIVE'
        },
        resetPasswordToken: {
            type: String,
            default: null
        },
        resetPasswordExpires: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
