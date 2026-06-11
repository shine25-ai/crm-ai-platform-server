const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
    {
        departmentName: {
            type: String,
            required: true,
            unique: true
        },
        departmentHead: {
            type: String,
            required: true
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
