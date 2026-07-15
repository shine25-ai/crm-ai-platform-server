const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        contextModule: {
            type: String,
            enum: [
                'Leads',
                'Customers',
                'Tasks',
                'Reports',
                'Dashboard',
                'Projects',
                'Billing'
            ],
            required: true
        },
        relatedId: {
            type: String,
            default: null
        },
        history: [
            {
                sender: {
                    type: String,
                    enum: ['user', 'ai'],
                    required: true
                },
                message: {
                    type: String,
                    required: true
                },
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('AIConversation', aiConversationSchema);
