const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        eventType: {
            type: String,
            enum: [
                'Company Event',
                'Meeting',
                'Birthday',
                'Holiday',
                'Task Due Date'
            ],
            default: 'Company Event'
        },
        description: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
);

eventSchema.index({ startDate: 1, endDate: 1, eventType: 1 });

module.exports = mongoose.model('Event', eventSchema);
