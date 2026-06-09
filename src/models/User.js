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
        role: {
            type: String,
            default: 'ADMIN'
        },
        status: {
            type: String,
            default: 'ACTIVE'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
