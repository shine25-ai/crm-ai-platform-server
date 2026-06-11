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
        // Link to Employee record (set during onboarding, null for admin users)
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            default: null
        },
        mobile: String,
        department: String,
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
        },
        lastActive: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
