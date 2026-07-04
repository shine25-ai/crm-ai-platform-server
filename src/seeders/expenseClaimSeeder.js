const Employee = require('../modules/employees/employee.model');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const Workflow = require('../modules/approvals/workflow.model');
const Approval = require('../modules/approvals/approval.model');
const ApprovalAction = require('../modules/approvals/approvalAction.model');
const ApprovalAttachment = require('../modules/approvals/approvalAttachment.model');
const ExpenseClaim = require('../modules/expenses/expenseClaim.model');
const ExpenseAttachment = require('../modules/expenses/expenseAttachment.model');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const SAMPLE_CLAIMS = [
    {
        claimNumber: 'EXP-SEED-00001',
        status: 'Draft',
        category: 'Travel',
        merchant: 'City Taxi Services',
        description: 'Taxi fare to customer office',
        businessPurpose: 'On-site customer requirements meeting',
        projectReference: 'CRM Implementation',
        amount: 850,
        expenseDate: daysAgo(2)
    },
    {
        claimNumber: 'EXP-SEED-00002',
        status: 'Submitted',
        category: 'Meals',
        merchant: 'Business Cafe',
        description: 'Team lunch during client workshop',
        businessPurpose: 'Full-day customer solution workshop',
        projectReference: 'Retail CRM Phase 2',
        amount: 2450,
        expenseDate: daysAgo(5)
    },
    {
        claimNumber: 'EXP-SEED-00003',
        status: 'Under Review',
        category: 'Accommodation',
        merchant: 'Grand Business Hotel',
        description: 'One-night accommodation for project visit',
        businessPurpose: 'Outstation project deployment',
        projectReference: 'Distributor Portal Rollout',
        amount: 6200,
        expenseDate: daysAgo(9)
    },
    {
        claimNumber: 'EXP-SEED-00004',
        status: 'Approved',
        category: 'Office Supplies',
        merchant: 'Office World',
        description: 'Workshop stationery and print materials',
        businessPurpose: 'Employee training workshop',
        projectReference: 'Internal Training',
        amount: 1750,
        expenseDate: daysAgo(14)
    },
    {
        claimNumber: 'EXP-SEED-00005',
        status: 'Rejected',
        category: 'Client Entertainment',
        merchant: 'Premium Dining',
        description: 'Customer dinner expense',
        businessPurpose: 'Customer relationship meeting',
        projectReference: 'Enterprise Renewal',
        amount: 4800,
        expenseDate: daysAgo(18)
    }
];

const findApprovers = async (employee) => {
    const hrRole = await Role.findOne({ roleCode: 'HR' });
    const adminRoles = await Role.find({
        roleCode: { $in: ['SUPER_ADMIN', 'ADMIN'] }
    });
    const hrUsers = hrRole
        ? await User.find({ roleId: hrRole._id, status: 'Active' })
        : [];
    const adminUsers = await User.find({
        roleId: { $in: adminRoles.map((role) => role._id) },
        status: 'Active'
    });
    const fallbackUsers = [...hrUsers, ...adminUsers];

    let stageOne = null;
    if (employee.manager) {
        const manager = await Employee.findById(employee.manager);
        if (manager?.userId) stageOne = await User.findById(manager.userId);
    }
    stageOne =
        stageOne ||
        fallbackUsers.find(
            (user) => String(user._id) !== String(employee.userId)
        ) ||
        (await User.findById(employee.userId));

    const stageTwo =
        hrUsers.find(
            (user) =>
                String(user._id) !== String(stageOne?._id) &&
                String(user._id) !== String(employee.userId)
        ) ||
        adminUsers.find(
            (user) =>
                String(user._id) !== String(stageOne?._id) &&
                String(user._id) !== String(employee.userId)
        ) ||
        hrUsers[0] ||
        adminUsers[0] ||
        stageOne;

    return { stageOne, stageTwo };
};

const statusHistoryFor = (sample, employeeUserId, stageOne, stageTwo) => {
    const history = [
        {
            status: 'Draft',
            note: 'Demo expense claim created',
            changedBy: employeeUserId,
            changedAt: daysAgo(20)
        }
    ];
    if (sample.status !== 'Draft') {
        history.push({
            status: 'Submitted',
            note: 'Submitted for manager approval',
            changedBy: employeeUserId,
            changedAt: daysAgo(19)
        });
    }
    if (['Under Review', 'Approved', 'Rejected'].includes(sample.status)) {
        history.push({
            status: 'Under Review',
            note: 'Manager approved; forwarded to HR',
            changedBy: stageOne?._id || employeeUserId,
            changedAt: daysAgo(17)
        });
    }
    if (['Approved', 'Rejected'].includes(sample.status)) {
        history.push({
            status: sample.status,
            note:
                sample.status === 'Approved'
                    ? 'Approved by HR'
                    : 'Rejected by HR: expense exceeds policy limit',
            changedBy: stageTwo?._id || employeeUserId,
            changedAt: daysAgo(15)
        });
    }
    return history;
};

const buildApprovalState = (
    sample,
    workflow,
    stageOne,
    stageTwo,
    employeeUserId
) => {
    const firstApproved = ['Under Review', 'Approved', 'Rejected'].includes(
        sample.status
    );
    const finalApproved = sample.status === 'Approved';
    const finalRejected = sample.status === 'Rejected';
    const stages = [
        {
            stageNumber: 1,
            stageName: workflow.stages[0].stageName,
            approverRole: workflow.stages[0].approverRole,
            approverId: stageOne._id,
            status: firstApproved ? 'Approved' : 'Pending',
            actedBy: firstApproved ? stageOne._id : null,
            actedAt: firstApproved ? daysAgo(17) : null,
            comments: firstApproved ? 'Manager verified the expense' : ''
        },
        {
            stageNumber: 2,
            stageName: workflow.stages[1].stageName,
            approverRole: workflow.stages[1].approverRole,
            approverId: stageTwo._id,
            status: finalApproved
                ? 'Approved'
                : finalRejected
                  ? 'Rejected'
                  : 'Pending',
            actedBy: finalApproved || finalRejected ? stageTwo._id : null,
            actedAt: finalApproved || finalRejected ? daysAgo(15) : null,
            comments: finalApproved
                ? 'Approved within policy'
                : finalRejected
                  ? 'Expense exceeds policy limit'
                  : ''
        }
    ];

    return {
        status: finalApproved
            ? 'Approved'
            : finalRejected
              ? 'Rejected'
              : 'Pending Approval',
        currentStageNumber: firstApproved ? 2 : 1,
        currentApproverId:
            finalApproved || finalRejected
                ? null
                : firstApproved
                  ? stageTwo._id
                  : stageOne._id,
        stageApprovals: stages,
        submittedBy: employeeUserId
    };
};

const seedApprovalActions = async (
    approval,
    sample,
    employeeUserId,
    stageOne,
    stageTwo
) => {
    await ApprovalAction.updateOne(
        {
            approvalRequestId: approval._id,
            stageNumber: 0
        },
        {
            $setOnInsert: {
                approvalRequestId: approval._id,
                stageNumber: 0,
                approverId: employeeUserId,
                action: 'Approve',
                comments: 'Demo claim submitted for review',
                actionDate: daysAgo(19)
            }
        },
        { upsert: true }
    );

    if (['Under Review', 'Approved', 'Rejected'].includes(sample.status)) {
        await ApprovalAction.updateOne(
            { decisionKey: `seed:${approval._id}:stage:1` },
            {
                $setOnInsert: {
                    approvalRequestId: approval._id,
                    stageNumber: 1,
                    approverId: stageOne._id,
                    action: 'Approve',
                    comments: 'Manager verified the expense',
                    decisionKey: `seed:${approval._id}:stage:1`,
                    actionDate: daysAgo(17)
                }
            },
            { upsert: true }
        );
    }
    if (['Approved', 'Rejected'].includes(sample.status)) {
        await ApprovalAction.updateOne(
            { decisionKey: `seed:${approval._id}:stage:2` },
            {
                $setOnInsert: {
                    approvalRequestId: approval._id,
                    stageNumber: 2,
                    approverId: stageTwo._id,
                    action: sample.status === 'Approved' ? 'Approve' : 'Reject',
                    comments:
                        sample.status === 'Approved'
                            ? 'Approved within policy'
                            : 'Expense exceeds policy limit',
                    decisionKey: `seed:${approval._id}:stage:2`,
                    actionDate: daysAgo(15)
                }
            },
            { upsert: true }
        );
    }
};

const seedExpenseClaims = async () => {
    try {
        const employees = await Employee.find({
            userId: { $ne: null },
            status: 'Active'
        }).sort({ employeeId: 1 });
        const workflow = await Workflow.findOne({
            requestType: 'Expense Claim',
            isActive: true
        });
        if (employees.length === 0 || !workflow || workflow.stages.length < 2) {
            console.log(
                '[Seeder] Expense claim samples skipped: employees or workflow unavailable'
            );
            return;
        }

        let createdCount = 0;
        for (const [index, sample] of SAMPLE_CLAIMS.entries()) {
            if (
                await ExpenseClaim.exists({ claimNumber: sample.claimNumber })
            ) {
                continue;
            }
            const employee = employees[index % employees.length];
            const { stageOne, stageTwo } = await findApprovers(employee);
            if (!stageOne || !stageTwo) continue;

            const claim = await ExpenseClaim.create({
                ...sample,
                employeeId: employee._id,
                submittedBy: employee.userId,
                currency: 'INR',
                approvedAmount:
                    sample.status === 'Approved' ? sample.amount : 0,
                reviewedBy: ['Approved', 'Rejected'].includes(sample.status)
                    ? stageTwo._id
                    : null,
                reviewedAt: ['Approved', 'Rejected'].includes(sample.status)
                    ? daysAgo(15)
                    : null,
                reviewNote:
                    sample.status === 'Rejected'
                        ? 'Expense exceeds policy limit'
                        : '',
                statusHistory: statusHistoryFor(
                    sample,
                    employee.userId,
                    stageOne,
                    stageTwo
                )
            });

            const receipt = await ExpenseAttachment.create({
                expenseClaimId: claim._id,
                fileName: `${sample.claimNumber}-receipt.pdf`,
                fileUrl:
                    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                fileSize: 13264,
                mimeType: 'application/pdf',
                uploadedBy: employee.userId
            });

            if (sample.status !== 'Draft') {
                const state = buildApprovalState(
                    sample,
                    workflow,
                    stageOne,
                    stageTwo,
                    employee.userId
                );
                const approval = await Approval.create({
                    requestNumber: `REQ-${sample.claimNumber}`,
                    requestType: 'Expense Claim',
                    title: `${sample.claimNumber} · ${sample.category}`,
                    description: `${sample.description}\nBusiness purpose: ${sample.businessPurpose}`,
                    employeeId: employee._id,
                    workflowId: workflow._id,
                    currentStageNumber: state.currentStageNumber,
                    status: state.status,
                    priority: 'Medium',
                    effectiveDate: sample.expenseDate,
                    requestedAmount: sample.amount,
                    requestData: {
                        expenseClaimId: claim._id,
                        claimNumber: sample.claimNumber,
                        category: sample.category,
                        receiptCount: 1,
                        seeded: true
                    },
                    currentApproverId: state.currentApproverId,
                    stageApprovals: state.stageApprovals
                });
                claim.approvalId = approval._id;
                await claim.save();
                await ApprovalAttachment.create({
                    approvalRequestId: approval._id,
                    name: receipt.fileName,
                    fileUrl: receipt.fileUrl,
                    fileSize: receipt.fileSize,
                    mimeType: receipt.mimeType,
                    uploadedBy: employee.userId
                });
                await seedApprovalActions(
                    approval,
                    sample,
                    employee.userId,
                    stageOne,
                    stageTwo
                );
            }
            createdCount += 1;
        }

        console.log(`[Seeder] Created ${createdCount} sample expense claim(s)`);
    } catch (error) {
        console.error('[Seeder] Error seeding expense claims:', error.message);
    }
};

module.exports = seedExpenseClaims;
