const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
    {
        departmentName: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        // ObjectId ref to Employee — nullable to break the circular dependency
        // A department can be created first without a head, then assigned later
        departmentHead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            default: null
        },
        employeeCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
