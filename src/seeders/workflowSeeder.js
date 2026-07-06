const Workflow = require('../modules/approvals/workflow.model');

const defaultWorkflows = [
    {
        workflowName: 'Standard Leave Approval',
        requestType: 'Leave Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Line Manager Approval',
                approverRole: 'MANAGER',
                slaDays: 3
            },
            {
                stageNumber: 2,
                stageName: 'HR Final Review',
                approverRole: 'HR',
                slaDays: 5
            }
        ]
    },
    {
        workflowName: 'Expense Claim Verification',
        requestType: 'Expense Claim',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Sign-off',
                approverRole: 'MANAGER',
                slaDays: 3
            },
            {
                stageNumber: 2,
                stageName: 'HR Expense Review',
                approverRole: 'HR',
                slaDays: 4
            }
        ]
    },
    {
        workflowName: 'Attendance Correction Approval',
        requestType: 'Attendance Correction',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Verification',
                approverRole: 'MANAGER',
                slaDays: 2
            }
        ]
    },
    {
        workflowName: 'Profile Update Approval',
        requestType: 'Profile Update',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'HR Update Approval',
                approverRole: 'HR',
                slaDays: 3
            }
        ]
    },
    {
        workflowName: 'Overtime Request routing',
        requestType: 'Overtime Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Verification',
                approverRole: 'MANAGER',
                slaDays: 2
            },
            {
                stageNumber: 2,
                stageName: 'HR Audit',
                approverRole: 'HR',
                slaDays: 3
            }
        ]
    },
    {
        workflowName: 'Asset Request routing',
        requestType: 'Asset Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Review',
                approverRole: 'MANAGER',
                slaDays: 3
            },
            {
                stageNumber: 2,
                stageName: 'IT Admin Dispatch',
                approverRole: 'ADMIN',
                slaDays: 5
            }
        ]
    },
    {
        workflowName: 'Travel Allowance Routing',
        requestType: 'Travel Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Clearance',
                approverRole: 'MANAGER',
                slaDays: 3
            },
            {
                stageNumber: 2,
                stageName: 'Department Head Review',
                approverRole: 'DEPARTMENT_HEAD',
                slaDays: 4
            },
            {
                stageNumber: 3,
                stageName: 'HR Clearance',
                approverRole: 'HR',
                slaDays: 3
            }
        ]
    },
    {
        workflowName: 'Document Request Review',
        requestType: 'Document Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'HR Operations Approval',
                approverRole: 'HR',
                slaDays: 4
            }
        ]
    },
    {
        workflowName: 'General Request Routing',
        requestType: 'Custom Request',
        isActive: true,
        stages: [
            {
                stageNumber: 1,
                stageName: 'Manager Review',
                approverRole: 'MANAGER',
                slaDays: 3
            }
        ]
    }
];

const seedWorkflows = async () => {
    try {
        for (const wf of defaultWorkflows) {
            const exists = await Workflow.findOne({
                requestType: wf.requestType
            });
            if (!exists) {
                await Workflow.create(wf);
                console.log(
                    `[Seeder] Seeded approval workflow: ${wf.workflowName}`
                );
            } else if (
                wf.requestType === 'Expense Claim' &&
                exists.workflowName === 'Expense Claim Verification' &&
                exists.stages?.[1]?.stageName === 'Finance Audit' &&
                exists.stages?.[1]?.approverRole === 'ADMIN'
            ) {
                exists.stages = wf.stages;
                exists.isActive = true;
                await exists.save();
                console.log(
                    '[Seeder] Synchronized expense claim approval workflow'
                );
            }
        }
    } catch (error) {
        console.error(
            '[Seeder] Error seeding default workflows:',
            error.message
        );
    }
};

module.exports = seedWorkflows;
