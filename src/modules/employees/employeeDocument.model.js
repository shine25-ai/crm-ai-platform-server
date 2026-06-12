const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true
        },
        documentType: {
            type: String,
            enum: [
                'Resume',
                'Offer Letter',
                'PAN Card',
                'Aadhaar Card',
                'Driving License',
                'Certificates',
                'Passport',
                'Other'
            ],
            required: true
        },
        fileName: {
            type: String,
            required: true
        },
        filePath: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('EmployeeDocument', employeeDocumentSchema);
