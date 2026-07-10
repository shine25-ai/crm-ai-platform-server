const Customer = require('../modules/customers/customer.model');
const ProjectActivity = require('../modules/projects/projectActivity.model');
const {
    buildProjectChanges,
    recordProjectActivity
} = require('../modules/projects/projectActivity.service');

const BASELINE_FIELDS = [
    'projectName',
    'projectValue',
    'contractStartDate',
    'contractEndDate',
    'billingFrequency',
    'recurringInvoiceAmount',
    'invoiceTaxRate',
    'invoiceDueDays',
    'paymentTerms',
    'status',
    'milestones',
    'contractDocuments'
];

const seedProjectActivities = async () => {
    try {
        const customers = await Customer.find({
            'projectEngagements.0': { $exists: true }
        });
        let createdCount = 0;

        for (const customer of customers) {
            for (const project of customer.projectEngagements || []) {
                const hasHistory = await ProjectActivity.exists({
                    customerId: customer._id,
                    projectId: project._id
                });
                if (hasHistory) continue;

                await recordProjectActivity({
                    customerId: customer._id,
                    projectId: project._id,
                    projectName: project.projectName,
                    userId: null,
                    actorType: 'SYSTEM',
                    action: 'PROJECT_BASELINE_IMPORTED',
                    entityType: 'Project',
                    entityId: String(project._id),
                    summary: `Imported baseline for existing project ${project.projectName}`,
                    changes: buildProjectChanges(
                        {},
                        project.toObject(),
                        BASELINE_FIELDS
                    ),
                    metadata: {
                        invoiceCount: project.invoices?.length || 0,
                        paymentCount: project.payments?.length || 0,
                        baselineOnly: true
                    },
                    source: 'IMPORT',
                    occurredAt: project.createdAt || customer.createdAt
                });
                createdCount += 1;
            }
        }

        console.log(
            `[Seeder] Project activity baselines created for ${createdCount} project(s)`
        );
    } catch (error) {
        console.error(
            '[Seeder] Error seeding project activity baselines:',
            error.message
        );
    }
};

module.exports = seedProjectActivities;
