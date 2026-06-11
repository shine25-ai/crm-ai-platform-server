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
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        // ObjectId ref to Department
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            required: true
        },
        designation: {
            type: String,
            required: true,
            trim: true
        },
        // Self-referential ObjectId ref — optional (nullable)
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            default: null
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
        // Link to User account once onboarding is complete
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        // Onboarding fields
        onboardingStatus: {
            type: String,
            enum: ['Pending', 'Completed'],
            default: 'Pending'
        },
        onboardingToken: {
            type: String,
            default: null
        },
        onboardingTokenExpires: {
            type: Date,
            default: null
        },
        personalInfo: {
            dob: String,
            gender: String,
            address: String,
            bloodGroup: String,
            emergencyContact: String
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
