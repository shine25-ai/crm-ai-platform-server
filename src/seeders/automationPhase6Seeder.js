const User = require('../modules/users/user.model');
const Workflow = require('../modules/workflows/workflow.model');
const AutomationJob = require('../modules/automations/automationJob.model');

const seedPhase6 = async () => {
    try {
        const admin =
            (await User.findOne({
                email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@crm.com'
            })) || (await User.findOne());
        if (!admin) {
            console.log(
                '⚠️ No admin user found. Cannot seed Phase 6 workflows.'
            );
            return;
        }

        // 1. Seed workflows
        const {
            EmailTemplate,
            WhatsAppTemplate
        } = require('../modules/communications/communication.model');
        const welcomeTemplate = await EmailTemplate.findOne({
            name: 'Customer Welcome'
        });
        const demoFollowupTemplate = await WhatsAppTemplate.findOne({
            name: 'Demo Follow-up'
        });

        // Delete existing seeded Phase 6 workflows to avoid duplicates
        await Workflow.deleteMany({
            name: {
                $in: [
                    'Send Welcome Email Flow',
                    'Task Done Notification Flow',
                    'WhatsApp Demo Follow-up Flow'
                ]
            }
        });

        await Workflow.create([
            {
                name: 'Send Welcome Email Flow',
                description:
                    'Triggered when a lead is created to send greeting email instantly.',
                triggerEvent: 'lead.created',
                conditions: [],
                actions: [
                    {
                        type: 'send_email',
                        params: {
                            recipient: '{{email}}',
                            templateId: welcomeTemplate
                                ? welcomeTemplate._id
                                : null,
                            subject: welcomeTemplate
                                ? welcomeTemplate.subject
                                : 'Welcome to OptiFlow!',
                            body: welcomeTemplate
                                ? welcomeTemplate.body
                                : 'Hi {{name}}, thank you for reaching out. We will connect with you soon.'
                        }
                    }
                ],
                status: 'Active',
                createdBy: admin._id
            },
            {
                name: 'WhatsApp Demo Follow-up Flow',
                description:
                    'Sends a WhatsApp message automatically when a lead is created.',
                triggerEvent: 'lead.created',
                conditions: [],
                actions: [
                    {
                        type: 'send_whatsapp',
                        params: {
                            recipient: '{{phone}}',
                            templateId: demoFollowupTemplate
                                ? demoFollowupTemplate._id
                                : null,
                            body: demoFollowupTemplate
                                ? demoFollowupTemplate.body
                                : 'Hi {{leadName}}, thanks for joining.',
                            templateName: demoFollowupTemplate
                                ? demoFollowupTemplate.metaTemplateName ||
                                  demoFollowupTemplate.name
                                : 'workflow_alert'
                        }
                    }
                ],
                status: 'Active',
                createdBy: admin._id
            },
            {
                name: 'Task Done Notification Flow',
                description:
                    'Notifies team manager when a key task status changes to Completed.',
                triggerEvent: 'task.completed',
                conditions: [],
                actions: [
                    {
                        type: 'send_notification',
                        params: {
                            title: 'Task Completed: {{title}}',
                            message:
                                'Task {{title}} was completed by {{assignedToName}}.'
                        }
                    }
                ],
                status: 'Active',
                createdBy: admin._id
            }
        ]);
        console.log('✅ Phase 6 Automation Workflows seeded successfully.');

        // 2. Seed automation cron jobs
        const jobsCount = await AutomationJob.countDocuments();
        if (jobsCount === 0) {
            await AutomationJob.create([
                {
                    name: 'Weekly Sales KPI Report Delivery',
                    type: 'report-auto-delivery',
                    schedule: '0 9 * * 1', // Monday 9am
                    taskConfig: {
                        recipient: 'admin@optiflow.com',
                        reportName: 'Sales Performance Summary'
                    },
                    status: 'Active',
                    createdBy: admin._id
                },
                {
                    name: 'Round-Robin Leads Distribute Daemon',
                    type: 'lead-distribution',
                    schedule: '*/10 * * * *', // every 10 mins
                    taskConfig: {
                        intervalMinutes: 10
                    },
                    status: 'Active',
                    createdBy: admin._id
                }
            ]);
            console.log('✅ Phase 6 Automation Cron Jobs seeded successfully.');
        } else {
            console.log('✅ Phase 6 Automation Cron Jobs already exist.');
        }
    } catch (error) {
        console.error('❌ Error seeding Phase 6 data:', error);
    }
};

module.exports = seedPhase6;
