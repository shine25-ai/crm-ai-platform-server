const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        triggerEvent: {
            type: String,
            required: true // e.g. 'lead.created', 'task.completed', 'billing.payment.received'
        },
        conditions: [
            {
                field: { type: String, required: true },
                operator: {
                    type: String,
                    enum: [
                        'equals',
                        'not_equals',
                        'greater_than',
                        'less_than',
                        'contains'
                    ],
                    required: true
                },
                value: { type: String, required: true }
            }
        ],
        actions: [
            {
                type: {
                    type: String,
                    enum: [
                        'create_task',
                        'update_record',
                        'send_email',
                        'send_whatsapp',
                        'send_notification',
                        'create_approval',
                        'call_webhook'
                    ],
                    required: true
                },
                params: {
                    type: mongoose.Schema.Types.Mixed,
                    default: {}
                }
            }
        ],
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        schedule: {
            type: String,
            default: null // e.g. cron string or 'daily', 'weekly' for scheduled triggers
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Workflow', workflowSchema);
