const bcrypt = require('bcryptjs');
const Approval = require('../modules/approvals/approval.model');
const Attendance = require('../modules/attendance/attendance.model');
const Department = require('../modules/departments/department.model');
const Employee = require('../modules/employees/employee.model');
const Event = require('../modules/events/event.model');
const LeaveBalance = require('../modules/leave/leaveBalance.model');
const LeavePolicy = require('../modules/leave/leavePolicy.model');
const Role = require('../modules/roles/role.model');
const User = require('../modules/users/user.model');
const Workflow = require('../modules/approvals/workflow.model');

const DEFAULT_PASSWORD = 'Password@123';

const currentYear = new Date().getFullYear();

const dateKey = (date) => new Date(date).toISOString().slice(0, 10);

const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

const daysFromNow = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};

const generateRequestNumber = async () => {
    const count = await Approval.countDocuments({
        requestNumber: { $regex: `^REQ-${currentYear}-` }
    });
    return `REQ-${currentYear}-${String(count + 1).padStart(4, '0')}`;
};

const ensureRole = async (roleCode) => {
    const role = await Role.findOne({ roleCode });
    if (!role) {
        throw new Error(`Required role missing: ${roleCode}`);
    }
    return role;
};

const ensureDemoUser = async ({ name, email, roleCode, employeeId = null }) => {
    const role = await ensureRole(roleCode);
    const existing = await User.findOne({ email });
    if (existing) {
        existing.name = name;
        existing.roleId = role._id;
        existing.status = 'Active';
        existing.password = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        if (employeeId) existing.employeeId = employeeId;
        await existing.save();
        return existing;
    }

    return User.create({
        name,
        email,
        password: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        roleId: role._id,
        employeeId,
        status: 'Active'
    });
};

const ensureDepartment = async () =>
    Department.findOneAndUpdate(
        { departmentName: 'Engineering' },
        {
            departmentName: 'Engineering',
            description: 'Product engineering and implementation team',
            status: 'Active'
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

const ensureDemoEmployees = async () => {
    const department = await ensureDepartment();

    const hrUser = await ensureDemoUser({
        name: 'Priya Menon',
        email: 'priya.hr@optiflow.test',
        roleCode: 'HR'
    });
    const managerUser = await ensureDemoUser({
        name: 'Vikram Shah',
        email: 'vikram.manager@optiflow.test',
        roleCode: 'TEAM_MANAGER'
    });
    const employeeUser = await ensureDemoUser({
        name: 'Aarav Nair',
        email: 'aarav.nair@optiflow.test',
        roleCode: 'EMPLOYEE'
    });

    const hrEmployee = await Employee.findOneAndUpdate(
        { email: hrUser.email },
        {
            employeeId: 'EMP-HR-001',
            name: hrUser.name,
            email: hrUser.email,
            department: department._id,
            designation: 'HR Manager',
            manager: null,
            mobile: '9000000101',
            status: 'Active',
            userId: hrUser._id,
            onboardingStatus: 'Completed',
            employmentInfo: {
                joinDate: `${currentYear - 1}-01-10`,
                employeeType: 'Full Time',
                salary: '900000',
                workLocation: 'Bengaluru'
            }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const managerEmployee = await Employee.findOneAndUpdate(
        { email: managerUser.email },
        {
            employeeId: 'EMP-MGR-001',
            name: managerUser.name,
            email: managerUser.email,
            department: department._id,
            designation: 'Engineering Manager',
            manager: hrEmployee._id,
            mobile: '9000000102',
            status: 'Active',
            userId: managerUser._id,
            onboardingStatus: 'Completed',
            employmentInfo: {
                joinDate: `${currentYear - 1}-02-01`,
                employeeType: 'Full Time',
                salary: '1200000',
                workLocation: 'Bengaluru'
            }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const employee = await Employee.findOneAndUpdate(
        { email: employeeUser.email },
        {
            employeeId: 'EMP-DEV-001',
            name: employeeUser.name,
            email: employeeUser.email,
            department: department._id,
            designation: 'Frontend Engineer',
            manager: managerEmployee._id,
            mobile: '9000000103',
            status: 'Active',
            userId: employeeUser._id,
            onboardingStatus: 'Completed',
            employmentInfo: {
                joinDate: `${currentYear}-01-15`,
                employeeType: 'Full Time',
                salary: '850000',
                workLocation: 'Bengaluru'
            }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await User.updateOne({ _id: hrUser._id }, { employeeId: hrEmployee._id });
    await User.updateOne(
        { _id: managerUser._id },
        { employeeId: managerEmployee._id }
    );
    await User.updateOne(
        { _id: employeeUser._id },
        { employeeId: employee._id }
    );
    const employeeCount = await Employee.countDocuments({
        department: department._id,
        status: 'Active'
    });
    await Department.updateOne(
        { _id: department._id },
        { departmentHead: managerEmployee._id, employeeCount }
    );

    return [hrEmployee, managerEmployee, employee];
};

const getEmployeesForLeaveData = async () => {
    await ensureDemoEmployees();
    const employees = await Employee.find({
        status: 'Active',
        userId: { $ne: null }
    }).sort({ createdAt: 1 });

    return employees;
};

const monthlyAccrual = (employee, policy) => {
    if (
        !policy.isPaid ||
        policy.isUnlimited ||
        policy.accrualMode === 'Manual'
    ) {
        return 0;
    }
    if (policy.accrualMode === 'Annual Upfront') {
        return Number(policy.annualEntitlement || 0);
    }
    const now = new Date();
    const joinDate = employee.employmentInfo?.joinDate
        ? new Date(employee.employmentInfo.joinDate)
        : new Date(currentYear, 0, 1);
    const joinMonth =
        joinDate.getFullYear() === currentYear ? joinDate.getMonth() + 1 : 1;
    const monthsElapsed = Math.min(12, now.getMonth() + 1);
    const eligibleMonths = Math.max(0, monthsElapsed - joinMonth + 1);
    return (
        Math.round(
            (Number(policy.annualEntitlement || 0) / 12) * eligibleMonths * 2
        ) / 2
    );
};

const seedBalances = async (employees, policies) => {
    for (const employee of employees) {
        for (const policy of policies) {
            const accruedBalance = monthlyAccrual(employee, policy);
            const usedBalance =
                policy.leaveTypeCode === 'CL'
                    ? 1
                    : policy.leaveTypeCode === 'SL'
                      ? 0.5
                      : 0;
            const carriedForwardBalance =
                policy.leaveTypeCode === 'EL'
                    ? Math.min(4, Number(policy.carryForwardCap || 0))
                    : 0;
            const lwpTaken = policy.leaveTypeCode === 'LWP' ? 1 : 0;

            await LeaveBalance.findOneAndUpdate(
                {
                    employeeId: employee._id,
                    leavePolicyId: policy._id,
                    leaveYear: currentYear
                },
                {
                    $set: {
                        employeeId: employee._id,
                        leavePolicyId: policy._id,
                        leaveYear: currentYear,
                        leaveTypeName: policy.leaveTypeName,
                        leaveTypeCode: policy.leaveTypeCode,
                        openingBalance: 0,
                        accruedBalance,
                        usedBalance,
                        pendingBalance: 0,
                        carriedForwardBalance,
                        lwpTaken
                    },
                    $setOnInsert: {
                        adjustments: [
                            {
                                type: 'Accrual',
                                amount: accruedBalance,
                                note: 'Seeded monthly prorated accrual'
                            }
                        ]
                    }
                },
                {
                    upsert: true,
                    returnDocument: 'after',
                    setDefaultsOnInsert: true
                }
            );
        }
    }
};

const ensureHolidayData = async () => {
    const holidays = [
        {
            title: 'Independence Day',
            startDate: new Date(`${currentYear}-08-15T00:00:00.000Z`),
            endDate: new Date(`${currentYear}-08-15T23:59:59.999Z`),
            eventType: 'Holiday',
            description:
                'National holiday used for leave working-day calculation'
        },
        {
            title: 'Company Foundation Day',
            startDate: daysFromNow(21),
            endDate: daysFromNow(21),
            eventType: 'Holiday',
            description: 'Company holiday used for leave policy previews'
        }
    ];

    for (const holiday of holidays) {
        await Event.findOneAndUpdate(
            { title: holiday.title, eventType: 'Holiday' },
            holiday,
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    }
};

const findApproverUser = async (employee) => {
    if (employee.manager) {
        const manager = await Employee.findById(employee.manager);
        if (manager?.userId) return manager.userId;
    }
    const hrRole = await Role.findOne({ roleCode: 'HR' });
    const hrUser = hrRole
        ? await User.findOne({ roleId: hrRole._id, status: 'Active' })
        : null;
    return hrUser?._id || null;
};

const seedApproval = async ({
    employee,
    workflow,
    policy,
    status,
    startDate,
    endDate,
    durationType,
    calculatedDays,
    currentApproverId = null
}) => {
    const existing = await Approval.findOne({
        employeeId: employee._id,
        requestType: 'Leave Request',
        'requestData.seedKey': `${policy.leaveTypeCode}-${status}-${dateKey(startDate)}`
    });
    if (existing) return existing;

    return Approval.create({
        requestNumber: await generateRequestNumber(),
        requestType: 'Leave Request',
        title: `${policy.leaveTypeName} - ${employee.name}`,
        description: `Seeded ${policy.leaveTypeName.toLowerCase()} request for leave policy demo`,
        employeeId: employee._id,
        workflowId: workflow._id,
        currentStageNumber: status === 'Approved' ? 2 : 1,
        status,
        priority: status === 'Escalated' ? 'High' : 'Medium',
        effectiveDate: startDate,
        requestData: {
            seedKey: `${policy.leaveTypeCode}-${status}-${dateKey(startDate)}`,
            leaveTypeId: policy._id,
            leaveTypeName: policy.leaveTypeName,
            leaveTypeCode: policy.leaveTypeCode,
            leaveType: policy.leaveTypeName,
            startDate: dateKey(startDate),
            endDate: dateKey(endDate),
            durationType,
            calculatedDays,
            includedDates: [dateKey(startDate)],
            excludedDates: [],
            dayCountingMode: policy.dayCountingMode,
            isPaid: policy.isPaid,
            isUnlimited: policy.isUnlimited,
            reason: 'Seeded leave request for UI rendering',
            leaveYear: currentYear,
            leaveLedgerStatus: status === 'Approved' ? 'Applied' : 'Reserved'
        },
        currentApproverId
    });
};

const seedLeaveApprovalsAndAttendance = async (employees, policies) => {
    const workflow = await Workflow.findOne({
        requestType: 'Leave Request',
        isActive: true
    });
    if (!workflow) return;

    const casualLeave = policies.find(
        (policy) => policy.leaveTypeCode === 'CL'
    );
    const sickLeave = policies.find((policy) => policy.leaveTypeCode === 'SL');
    const earnedLeave = policies.find(
        (policy) => policy.leaveTypeCode === 'EL'
    );
    const lwp = policies.find((policy) => policy.leaveTypeCode === 'LWP');
    const primaryEmployee =
        employees.find((employee) => employee.manager) || employees[0];
    if (
        !primaryEmployee ||
        !casualLeave ||
        !sickLeave ||
        !earnedLeave ||
        !lwp
    ) {
        return;
    }

    const approverId = await findApproverUser(primaryEmployee);
    const approvedStart = daysAgo(9);
    const approvedApproval = await seedApproval({
        employee: primaryEmployee,
        workflow,
        policy: casualLeave,
        status: 'Approved',
        startDate: approvedStart,
        endDate: approvedStart,
        durationType: 'Full Day',
        calculatedDays: 1
    });

    await Attendance.findOneAndUpdate(
        {
            employeeId: primaryEmployee._id,
            shiftDate: dateKey(approvedStart)
        },
        {
            employeeId: primaryEmployee._id,
            shiftDate: dateKey(approvedStart),
            checkIn: new Date(`${dateKey(approvedStart)}T00:00:00.000Z`),
            checkOut: null,
            workingHours: 0,
            breakHours: 0,
            attendanceStatus: 'On Leave',
            leaveMeta: {
                approvalId: approvedApproval._id,
                leaveTypeName: casualLeave.leaveTypeName,
                durationType: 'Full Day',
                calculatedDays: 1
            }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await seedApproval({
        employee: primaryEmployee,
        workflow,
        policy: sickLeave,
        status: 'Pending Approval',
        startDate: daysFromNow(3),
        endDate: daysFromNow(3),
        durationType: 'First Half',
        calculatedDays: 0.5,
        currentApproverId: approverId
    });

    await seedApproval({
        employee: primaryEmployee,
        workflow,
        policy: earnedLeave,
        status: 'Pending Approval',
        startDate: daysFromNow(12),
        endDate: daysFromNow(14),
        durationType: 'Full Day',
        calculatedDays: 3,
        currentApproverId: approverId
    });

    if (employees[1]) {
        await seedApproval({
            employee: employees[1],
            workflow,
            policy: lwp,
            status: 'Approved',
            startDate: daysAgo(20),
            endDate: daysAgo(20),
            durationType: 'Full Day',
            calculatedDays: 1
        });
    }
};

const seedLeaveData = async () => {
    try {
        const policies = await LeavePolicy.find({ isActive: true }).sort({
            leaveTypeCode: 1
        });
        if (policies.length === 0) {
            console.log(
                '[Seeder] Leave policies missing. Skipping leave data.'
            );
            return;
        }

        const employees = await getEmployeesForLeaveData();
        await ensureHolidayData();
        await seedBalances(employees, policies);
        await seedLeaveApprovalsAndAttendance(employees, policies);
        console.log(
            `[Seeder] Leave balances and sample leave requests mapped for ${employees.length} employee(s)`
        );
    } catch (error) {
        console.error('[Seeder] Error seeding leave data:', error.message);
    }
};

module.exports = seedLeaveData;
module.exports.ensureDemoEmployees = ensureDemoEmployees;
