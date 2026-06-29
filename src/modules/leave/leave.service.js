const LeavePolicy = require('./leavePolicy.model');
const LeaveBalance = require('./leaveBalance.model');
const Employee = require('../employees/employee.model');
const Event = require('../events/event.model');
const Attendance = require('../attendance/attendance.model');
const AppError = require('../../shared/utils/appError');

const DEFAULT_LEAVE_POLICIES = [
    {
        leaveTypeName: 'Casual Leave',
        leaveTypeCode: 'CL',
        annualEntitlement: 12,
        isPaid: true,
        isUnlimited: false,
        accrualMode: 'Monthly Prorated',
        dayCountingMode: 'workingDays',
        allowHalfDay: true,
        carryForwardEnabled: false,
        carryForwardCap: 0,
        expiresAtYearEnd: true
    },
    {
        leaveTypeName: 'Sick Leave',
        leaveTypeCode: 'SL',
        annualEntitlement: 12,
        isPaid: true,
        isUnlimited: false,
        accrualMode: 'Monthly Prorated',
        dayCountingMode: 'workingDays',
        allowHalfDay: true,
        carryForwardEnabled: false,
        carryForwardCap: 0,
        expiresAtYearEnd: true
    },
    {
        leaveTypeName: 'Earned Leave',
        leaveTypeCode: 'EL',
        annualEntitlement: 15,
        isPaid: true,
        isUnlimited: false,
        accrualMode: 'Monthly Prorated',
        dayCountingMode: 'workingDays',
        allowHalfDay: true,
        carryForwardEnabled: true,
        carryForwardCap: 30,
        expiresAtYearEnd: false
    },
    {
        leaveTypeName: 'Loss of Pay',
        leaveTypeCode: 'LWP',
        annualEntitlement: 0,
        isPaid: false,
        isUnlimited: true,
        accrualMode: 'Manual',
        dayCountingMode: 'calendarDays',
        allowHalfDay: true,
        carryForwardEnabled: false,
        carryForwardCap: 0,
        expiresAtYearEnd: false
    }
];

const dateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

const normalizeDateOnly = (value) =>
    new Date(`${dateKey(value)}T00:00:00.000Z`);

const getLeaveYear = (value = new Date()) => new Date(value).getFullYear();

const roundHalf = (value) => Math.round(Number(value || 0) * 2) / 2;

const listPolicies = async (filters = {}) => {
    const query = {};
    if (filters.isActive !== undefined) {
        query.isActive =
            filters.isActive === true || filters.isActive === 'true';
    }
    return LeavePolicy.find(query).sort({ isPaid: -1, leaveTypeName: 1 });
};

const seedDefaultPolicies = async () => {
    for (const policy of DEFAULT_LEAVE_POLICIES) {
        await LeavePolicy.findOneAndUpdate(
            { leaveTypeCode: policy.leaveTypeCode },
            policy,
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    }
};

const upsertPolicy = async (payload) => {
    if (!payload.leaveTypeName?.trim()) {
        throw new AppError('Leave type name is required', 400);
    }
    if (!payload.leaveTypeCode?.trim()) {
        throw new AppError('Leave type code is required', 400);
    }

    const policyData = {
        leaveTypeName: payload.leaveTypeName,
        leaveTypeCode: payload.leaveTypeCode.toUpperCase(),
        annualEntitlement: Number(payload.annualEntitlement || 0),
        isPaid: payload.isPaid !== false,
        isUnlimited: Boolean(payload.isUnlimited),
        accrualMode: payload.accrualMode || 'Monthly Prorated',
        dayCountingMode: payload.dayCountingMode || 'workingDays',
        allowHalfDay: payload.allowHalfDay !== false,
        carryForwardEnabled: Boolean(payload.carryForwardEnabled),
        carryForwardCap: Number(payload.carryForwardCap || 0),
        expiresAtYearEnd: payload.expiresAtYearEnd !== false,
        isActive: payload.isActive !== false
    };

    if (payload._id) {
        return LeavePolicy.findByIdAndUpdate(payload._id, policyData, {
            returnDocument: 'after',
            runValidators: true
        });
    }

    return LeavePolicy.findOneAndUpdate(
        { leaveTypeCode: policyData.leaveTypeCode },
        policyData,
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
};

const resolvePolicy = async (requestData = {}) => {
    const query = requestData.leaveTypeId
        ? { _id: requestData.leaveTypeId }
        : {
              $or: [
                  { leaveTypeName: requestData.leaveTypeName },
                  { leaveTypeName: requestData.leaveType },
                  { leaveTypeCode: requestData.leaveTypeCode }
              ]
          };

    const policy = await LeavePolicy.findOne({
        ...query,
        isActive: true
    });
    if (!policy) {
        throw new AppError(
            'Selected leave type is not configured or active',
            400
        );
    }
    return policy;
};

const proratedAccrual = (employee, policy, leaveYear) => {
    if (!policy.isPaid || policy.isUnlimited) return 0;
    if (policy.accrualMode === 'Manual') return 0;

    const annual = Number(policy.annualEntitlement || 0);
    if (policy.accrualMode === 'Annual Upfront') return annual;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthsElapsed =
        leaveYear < currentYear ? 12 : Math.min(12, now.getMonth() + 1);
    const joinDate = employee.employmentInfo?.joinDate
        ? new Date(employee.employmentInfo.joinDate)
        : new Date(leaveYear, 0, 1);
    const joinMonth =
        joinDate.getFullYear() === leaveYear ? joinDate.getMonth() + 1 : 1;
    const eligibleMonths = Math.max(0, monthsElapsed - joinMonth + 1);
    return roundHalf((annual / 12) * eligibleMonths);
};

const ensureBalance = async (employee, policy, leaveYear) => {
    let balance = await LeaveBalance.findOne({
        employeeId: employee._id,
        leavePolicyId: policy._id,
        leaveYear
    });

    const accruedBalance = proratedAccrual(employee, policy, leaveYear);

    if (!balance) {
        balance = await LeaveBalance.create({
            employeeId: employee._id,
            leavePolicyId: policy._id,
            leaveYear,
            leaveTypeName: policy.leaveTypeName,
            leaveTypeCode: policy.leaveTypeCode,
            accruedBalance,
            adjustments: accruedBalance
                ? [
                      {
                          type: 'Accrual',
                          amount: accruedBalance,
                          note: 'Monthly prorated system accrual'
                      }
                  ]
                : []
        });
    } else if (balance.accruedBalance !== accruedBalance) {
        const delta = roundHalf(accruedBalance - balance.accruedBalance);
        balance.accruedBalance = accruedBalance;
        if (delta !== 0) {
            balance.adjustments.push({
                type: 'Accrual',
                amount: delta,
                note: 'Updated monthly prorated accrual'
            });
        }
        await balance.save();
    }

    return balance;
};

const getHolidayKeys = async (startDate, endDate) => {
    const holidays = await Event.find({
        eventType: 'Holiday',
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
    }).select('startDate endDate');

    const keys = new Set();
    holidays.forEach((holiday) => {
        const cursor = normalizeDateOnly(holiday.startDate);
        const end = normalizeDateOnly(holiday.endDate);
        while (cursor <= end) {
            keys.add(dateKey(cursor));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
    });
    return keys;
};

const calculateLeaveDays = async (
    policy,
    startDateValue,
    endDateValue,
    durationType
) => {
    const startDate = normalizeDateOnly(startDateValue);
    const endDate = normalizeDateOnly(endDateValue);
    if (!dateKey(startDate) || !dateKey(endDate) || startDate > endDate) {
        throw new AppError(
            'Leave start date must be before or same as end date',
            400
        );
    }

    const isHalfDay =
        durationType === 'First Half' || durationType === 'Second Half';
    if (isHalfDay && dateKey(startDate) !== dateKey(endDate)) {
        throw new AppError(
            'Half-day leave must start and end on the same date',
            400
        );
    }
    if (isHalfDay && !policy.allowHalfDay) {
        throw new AppError(
            'Half-day leave is not allowed for this leave type',
            400
        );
    }

    const holidayKeys =
        policy.dayCountingMode === 'workingDays'
            ? await getHolidayKeys(startDate, endDate)
            : new Set();

    const includedDates = [];
    const excludedDates = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        const key = dateKey(cursor);
        const day = cursor.getUTCDay();
        const isWeekend = day === 0 || day === 6;
        const isHoliday = holidayKeys.has(key);
        const excluded =
            policy.dayCountingMode === 'workingDays' &&
            (isWeekend || isHoliday);
        if (excluded) {
            excludedDates.push({
                date: key,
                reason: isWeekend ? 'Weekend' : 'Holiday'
            });
        } else {
            includedDates.push(key);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const calculatedDays = isHalfDay ? 0.5 : includedDates.length;
    if (calculatedDays <= 0) {
        throw new AppError(
            'Selected dates do not contain payable leave days',
            400
        );
    }

    return {
        calculatedDays,
        includedDates,
        excludedDates,
        dayCountingMode: policy.dayCountingMode
    };
};

const availableBalance = (balance) =>
    Math.max(
        0,
        Number(balance.openingBalance || 0) +
            Number(balance.accruedBalance || 0) +
            Number(balance.carriedForwardBalance || 0) -
            Number(balance.usedBalance || 0) -
            Number(balance.pendingBalance || 0)
    );

const buildBalanceSnapshot = (balance) => ({
    openingBalance: balance.openingBalance,
    accruedBalance: balance.accruedBalance,
    usedBalance: balance.usedBalance,
    pendingBalance: balance.pendingBalance,
    carriedForwardBalance: balance.carriedForwardBalance,
    availableBalance: availableBalance(balance)
});

const assertNoOverlappingLeave = async (
    employeeId,
    startDate,
    endDate,
    approvalId = null
) => {
    const Approval = require('../approvals/approval.model');
    const query = {
        employeeId,
        requestType: 'Leave Request',
        status: { $in: ['Pending Approval', 'Escalated', 'Approved'] },
        'requestData.startDate': { $lte: endDate },
        'requestData.endDate': { $gte: startDate }
    };
    if (approvalId) query._id = { $ne: approvalId };

    const overlap = await Approval.findOne(query).select('requestNumber');
    if (overlap) {
        throw new AppError(
            `Leave overlaps with existing request ${overlap.requestNumber}`,
            400
        );
    }
};

const prepareLeaveRequestPayload = async (payload, employee) => {
    if (employee.status !== 'Active') {
        throw new AppError(
            'Only active employees can submit leave requests',
            400
        );
    }

    const requestData = payload.requestData || {};
    const policy = await resolvePolicy(requestData);
    const durationType = requestData.durationType || 'Full Day';
    const startDate = dateKey(requestData.startDate);
    const endDate = dateKey(requestData.endDate);
    const leaveYear = getLeaveYear(startDate);
    const calculation = await calculateLeaveDays(
        policy,
        startDate,
        endDate,
        durationType
    );

    await assertNoOverlappingLeave(employee._id, startDate, endDate);

    const balance = await ensureBalance(employee, policy, leaveYear);
    const balanceBefore = buildBalanceSnapshot(balance);

    if (
        !policy.isUnlimited &&
        balanceBefore.availableBalance < calculation.calculatedDays
    ) {
        throw new AppError(
            `Insufficient ${policy.leaveTypeName} balance. Available: ${balanceBefore.availableBalance}, requested: ${calculation.calculatedDays}`,
            400
        );
    }

    return {
        ...requestData,
        leaveTypeId: policy._id,
        leaveTypeName: policy.leaveTypeName,
        leaveTypeCode: policy.leaveTypeCode,
        leaveType: policy.leaveTypeName,
        startDate,
        endDate,
        durationType,
        calculatedDays: calculation.calculatedDays,
        includedDates: calculation.includedDates,
        excludedDates: calculation.excludedDates,
        dayCountingMode: policy.dayCountingMode,
        isPaid: policy.isPaid,
        isUnlimited: policy.isUnlimited,
        reason: requestData.reason || payload.description,
        leaveYear,
        balanceSnapshotBeforeApply: balanceBefore,
        leaveLedgerStatus: 'Pending Reservation'
    };
};

const reserveLeaveForApproval = async (approval) => {
    if (approval.requestType !== 'Leave Request') return;
    const data = approval.requestData || {};
    if (data.leaveLedgerStatus === 'Reserved') return;

    const policy = await LeavePolicy.findById(data.leaveTypeId);
    const employee = await Employee.findById(approval.employeeId);
    if (!policy || !employee) return;

    const balance = await ensureBalance(employee, policy, data.leaveYear);
    const days = Number(data.calculatedDays || 0);
    if (!policy.isUnlimited && availableBalance(balance) < days) {
        throw new AppError(
            'Insufficient leave balance to reserve request',
            400
        );
    }

    balance.pendingBalance = roundHalf(
        Number(balance.pendingBalance || 0) + days
    );
    balance.adjustments.push({
        type: 'Reserved',
        amount: days,
        note: `Reserved for ${approval.requestNumber}`,
        approvalId: approval._id
    });
    await balance.save();

    approval.requestData = {
        ...data,
        leaveLedgerStatus: 'Reserved',
        balanceSnapshotAfterReserve: buildBalanceSnapshot(balance)
    };
    await approval.save();
};

const releaseLeaveReservation = async (
    approval,
    note = 'Leave request released'
) => {
    if (approval.requestType !== 'Leave Request') return;
    const data = approval.requestData || {};
    if (data.leaveLedgerStatus !== 'Reserved') return;

    const balance = await LeaveBalance.findOne({
        employeeId: approval.employeeId,
        leavePolicyId: data.leaveTypeId,
        leaveYear: data.leaveYear
    });
    if (!balance) return;

    const days = Number(data.calculatedDays || 0);
    balance.pendingBalance = Math.max(
        0,
        roundHalf(Number(balance.pendingBalance || 0) - days)
    );
    balance.adjustments.push({
        type: 'Released',
        amount: -days,
        note,
        approvalId: approval._id
    });
    await balance.save();

    approval.requestData = {
        ...data,
        leaveLedgerStatus: 'Released',
        balanceSnapshotAfterRelease: buildBalanceSnapshot(balance)
    };
    await approval.save();
};

const applyLeaveToAttendance = async (approval) => {
    const data = approval.requestData || {};
    const dates = data.includedDates || [];
    for (const shiftDate of dates) {
        const existing = await Attendance.findOne({
            employeeId: approval.employeeId,
            shiftDate
        });
        const leaveMeta = {
            approvalId: approval._id,
            leaveTypeName: data.leaveTypeName,
            durationType: data.durationType,
            calculatedDays: data.durationType === 'Full Day' ? 1 : 0.5
        };

        if (existing) {
            existing.attendanceStatus = 'On Leave';
            existing.leaveMeta = leaveMeta;
            await existing.save();
        } else {
            await Attendance.create({
                employeeId: approval.employeeId,
                shiftDate,
                checkIn: new Date(`${shiftDate}T00:00:00.000Z`),
                checkOut: null,
                workingHours: 0,
                breakHours: 0,
                attendanceStatus: 'On Leave',
                leaveMeta
            });
        }
    }
};

const finalizeLeaveApproval = async (approval) => {
    if (approval.requestType !== 'Leave Request') return;
    const data = approval.requestData || {};
    if (data.leaveLedgerStatus === 'Applied') return;

    const balance = await LeaveBalance.findOne({
        employeeId: approval.employeeId,
        leavePolicyId: data.leaveTypeId,
        leaveYear: data.leaveYear
    });
    if (!balance) return;

    const days = Number(data.calculatedDays || 0);
    balance.pendingBalance = Math.max(
        0,
        roundHalf(Number(balance.pendingBalance || 0) - days)
    );
    if (data.isUnlimited || data.leaveTypeCode === 'LWP') {
        balance.lwpTaken = roundHalf(Number(balance.lwpTaken || 0) + days);
    } else {
        balance.usedBalance = roundHalf(
            Number(balance.usedBalance || 0) + days
        );
    }
    balance.adjustments.push({
        type: 'Used',
        amount: -days,
        note: `Applied approved leave ${approval.requestNumber}`,
        approvalId: approval._id
    });
    await balance.save();
    await applyLeaveToAttendance(approval);

    approval.requestData = {
        ...data,
        leaveLedgerStatus: 'Applied',
        balanceSnapshotAfterApproval: buildBalanceSnapshot(balance)
    };
    await approval.save();
};

const previewLeaveRequest = async (payload, user) => {
    const employee = await Employee.findOne({ userId: user.userId });
    if (!employee) throw new AppError('Employee record not found', 404);
    const requestData = await prepareLeaveRequestPayload(
        { requestData: payload, description: payload.reason || '' },
        employee
    );
    return requestData;
};

const listBalances = async (filters = {}, user = {}) => {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.year) query.leaveYear = Number(filters.year);
    if (user.roleCode === 'EMPLOYEE') query.employeeId = user.employeeId;

    return LeaveBalance.find(query)
        .populate('employeeId', 'name employeeId email designation')
        .populate('leavePolicyId')
        .sort({ leaveYear: -1, leaveTypeName: 1 });
};

const getMyBalances = async (user, year = getLeaveYear()) => {
    const employee = await Employee.findOne({ userId: user.userId });
    if (!employee) throw new AppError('Employee record not found', 404);
    const policies = await listPolicies({ isActive: true });
    const balances = [];
    for (const policy of policies) {
        balances.push(await ensureBalance(employee, policy, Number(year)));
    }
    return balances;
};

const adjustBalance = async (payload, user) => {
    const employee = await Employee.findById(payload.employeeId);
    if (!employee) throw new AppError('Employee not found', 404);
    const policy = await LeavePolicy.findById(payload.leavePolicyId);
    if (!policy) throw new AppError('Leave policy not found', 404);
    const leaveYear = Number(payload.leaveYear || getLeaveYear());
    const balance = await ensureBalance(employee, policy, leaveYear);
    const amount = Number(payload.amount || 0);

    balance.openingBalance = roundHalf(
        Number(balance.openingBalance || 0) + amount
    );
    balance.adjustments.push({
        type: 'Manual Adjustment',
        amount,
        note: payload.note || 'Manual HR adjustment',
        adjustedBy: user.userId
    });
    await balance.save();
    return balance;
};

const runYearEndCarryForward = async (year, user) => {
    const sourceYear = Number(year || getLeaveYear() - 1);
    const targetYear = sourceYear + 1;
    const balances = await LeaveBalance.find({
        leaveYear: sourceYear
    }).populate('leavePolicyId');
    const results = [];

    for (const balance of balances) {
        const policy = balance.leavePolicyId;
        if (!policy) continue;
        const remaining = availableBalance(balance);
        const carry = policy.carryForwardEnabled
            ? Math.min(remaining, Number(policy.carryForwardCap || 0))
            : 0;
        const nextBalance = await LeaveBalance.findOneAndUpdate(
            {
                employeeId: balance.employeeId,
                leavePolicyId: policy._id,
                leaveYear: targetYear
            },
            {
                $setOnInsert: {
                    employeeId: balance.employeeId,
                    leavePolicyId: policy._id,
                    leaveYear: targetYear,
                    leaveTypeName: policy.leaveTypeName,
                    leaveTypeCode: policy.leaveTypeCode
                },
                $set: { carriedForwardBalance: carry },
                $push: {
                    adjustments: {
                        type: carry ? 'Carry Forward' : 'Expiry',
                        amount: carry,
                        note: `Year-end carry forward from ${sourceYear}`,
                        adjustedBy: user.userId
                    }
                }
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        results.push(nextBalance);
    }

    return results;
};

module.exports = {
    seedDefaultPolicies,
    listPolicies,
    upsertPolicy,
    previewLeaveRequest,
    prepareLeaveRequestPayload,
    reserveLeaveForApproval,
    releaseLeaveReservation,
    finalizeLeaveApproval,
    listBalances,
    getMyBalances,
    adjustBalance,
    runYearEndCarryForward,
    calculateLeaveDays
};
