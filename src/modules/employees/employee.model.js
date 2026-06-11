const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
    {
        date: String,
        checkIn: String,
        checkOut: String,
        status: String
    },
    { _id: false }
);

const documentSchema = new mongoose.Schema(
    {
        name: String,
        type: String,
        size: String
    },
    { _id: false }
);

const employeeSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            unique: true
        },
        name: {
            type: String,
            required: true
        },
        department: {
            type: String,
            required: true
        },
        designation: {
            type: String,
            required: true
        },
        manager: {
            type: String,
            default: 'None'
        },
        mobile: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        personalInfo: {
            dob: String,
            gender: String,
            address: String,
            bloodGroup: String
        },
        employmentInfo: {
            joinDate: String,
            employeeType: String,
            salary: String,
            workLocation: String
        },
        attendance: [attendanceSchema],
        performance: {
            kpiScore: {
                type: String,
                default: '—'
            },
            salesClosed: {
                type: String,
                default: '—'
            },
            reviews: {
                type: String,
                default: ''
            }
        },
        documents: [documentSchema]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
