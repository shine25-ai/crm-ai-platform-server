const Employee = require('../employees/employee.model');
const Attendance = require('../attendance/attendance.model');
const Task = require('../tasks/task.model');
const User = require('../users/user.model');
const Customer = require('../customers/customer.model');
const Asset = require('../assets/asset.model');
const AuditLog = require('../activityLogs/activityLog.model');
const { SalesOpportunity } = require('../sales/sales.model');
const EmployeeAsset = require('../assets/employeeAsset.model');

const toNumber = (value) => Number(value || 0);

const getDateRange = (filters = {}, field = 'createdAt') => {
    const range = {};
    if (filters.dateFrom) range.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
    }
    return Object.keys(range).length ? { [field]: range } : {};
};

const getSalesReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const matchQuery = {};
    if (query.dateFrom || query.dateTo) {
        matchQuery['projectEngagements.payments.paymentDate'] = {};
        if (query.dateFrom) {
            matchQuery['projectEngagements.payments.paymentDate'].$gte =
                new Date(query.dateFrom);
        }
        if (query.dateTo) {
            const end = new Date(query.dateTo);
            end.setHours(23, 59, 59, 999);
            matchQuery['projectEngagements.payments.paymentDate'].$lte = end;
        }
    }

    const pipeline = [
        { $unwind: '$projectEngagements' },
        { $unwind: '$projectEngagements.payments' }
    ];

    if (Object.keys(matchQuery).length > 0) {
        pipeline.push({ $match: matchQuery });
    }

    pipeline.push({
        $project: {
            customerId: '$_id',
            customerName: '$customerName',
            companyName: '$companyName',
            customerType: '$customerType',
            projectName: '$projectEngagements.projectName',
            paymentDate: '$projectEngagements.payments.paymentDate',
            amount: '$projectEngagements.payments.amount',
            paymentMode: '$projectEngagements.payments.paymentMode',
            referenceNumber: '$projectEngagements.payments.referenceNumber'
        }
    });

    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        pipeline.push({
            $match: {
                $or: [
                    { customerName: searchRegex },
                    { companyName: searchRegex },
                    { projectName: searchRegex }
                ]
            }
        });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countRes = await Customer.aggregate(countPipeline);
    const total = countRes[0]?.total || 0;

    pipeline.push({ $sort: { paymentDate: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const docs = await Customer.aggregate(pipeline);

    const kpisPipeline = [
        { $unwind: '$projectEngagements' },
        { $unwind: '$projectEngagements.payments' }
    ];
    if (Object.keys(matchQuery).length > 0) {
        kpisPipeline.push({ $match: matchQuery });
    }
    kpisPipeline.push({
        $group: {
            _id: null,
            totalRevenue: { $sum: '$projectEngagements.payments.amount' },
            paymentCount: { $sum: 1 }
        }
    });
    const kpisRes = await Customer.aggregate(kpisPipeline);

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalRevenue: kpisRes[0]?.totalRevenue || 0,
            paymentCount: kpisRes[0]?.paymentCount || 0
        }
    };
};

const getLeadsReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const leadQuery = {};
    if (query.status) leadQuery.status = query.status;
    if (query.source) leadQuery.customerType = query.source;

    leadQuery.status = leadQuery.status || {
        $in: ['Prospect', 'Active', 'Inactive', 'Blocked']
    };

    const dateRange = getDateRange(query, 'createdAt');
    Object.assign(leadQuery, dateRange);

    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        leadQuery.$or = [
            { customerName: searchRegex },
            { companyName: searchRegex },
            { email: searchRegex }
        ];
    }

    const total = await Customer.countDocuments(leadQuery);
    const docs = await Customer.find(leadQuery)
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const allLeads = await Customer.find(dateRange);
    const totalLeads = allLeads.length;
    const activeAccounts = allLeads.filter((c) => c.status === 'Active').length;
    const conversionRate = totalLeads
        ? Math.round((activeAccounts / totalLeads) * 100)
        : 0;

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalLeads,
            convertedLeads: activeAccounts,
            conversionRate
        }
    };
};

const getAttendanceReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const matchQuery = { employeeId: { $ne: null } };
    if (query.dateFrom || query.dateTo) {
        matchQuery.shiftDate = {};
        if (query.dateFrom) matchQuery.shiftDate.$gte = query.dateFrom;
        if (query.dateTo) matchQuery.shiftDate.$lte = query.dateTo;
    }

    if (query.employee) {
        matchQuery.employeeId = query.employee;
    }

    const total = await Attendance.countDocuments(matchQuery);
    const docs = await Attendance.find(matchQuery)
        .populate('employeeId', 'name designation employeeId')
        .sort({ shiftDate: -1 })
        .skip(skip)
        .limit(limit);

    const allAttendance = await Attendance.find(matchQuery);
    const totalHours = allAttendance.reduce(
        (acc, curr) => acc + (curr.workingHours || 0),
        0
    );
    const averageHours = allAttendance.length
        ? Math.round((totalHours / allAttendance.length) * 10) / 10
        : 0;
    const lateCheckIns = allAttendance.filter(
        (a) => a.status === 'Late'
    ).length;

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalDays: allAttendance.length,
            averageHours,
            lateCheckIns
        }
    };
};

const getTasksReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const taskQuery = {};
    if (query.status) taskQuery.status = query.status;
    if (query.priority) taskQuery.priority = query.priority;

    const dateRange = getDateRange(query, 'dueDate');
    Object.assign(taskQuery, dateRange);

    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        taskQuery.title = searchRegex;
    }

    const total = await Task.countDocuments(taskQuery);
    const docs = await Task.find(taskQuery)
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);

    const allTasks = await Task.find(getDateRange(query, 'dueDate'));
    const totalCount = allTasks.length;
    const completed = allTasks.filter((t) => t.status === 'Completed').length;
    const pending = totalCount - completed;
    const completionRate = totalCount
        ? Math.round((completed / totalCount) * 100)
        : 0;

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalTasks: totalCount,
            completedTasks: completed,
            pendingTasks: pending,
            completionRate
        }
    };
};

const getAssetsReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const assetQuery = {};
    if (query.status) assetQuery.currentStatus = query.status;
    if (query.assetType) assetQuery.assetCategory = query.assetType;

    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        assetQuery.$or = [
            { assetName: searchRegex },
            { assetTag: searchRegex },
            { serialNumber: searchRegex }
        ];
    }

    const total = await Asset.countDocuments(assetQuery);
    const docsRaw = await Asset.find(assetQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const docs = await Promise.all(
        docsRaw.map(async (asset) => {
            const assignment = await EmployeeAsset.findOne({
                assetId: asset._id,
                status: 'Assigned'
            }).populate('employeeId', 'name email employeeId');
            return {
                ...asset,
                assignedTo: assignment ? assignment.employeeId : null
            };
        })
    );

    const allAssets = await Asset.find({});
    const totalAssets = allAssets.length;
    const allocated = allAssets.filter(
        (a) => a.currentStatus === 'Assigned'
    ).length;
    const available = allAssets.filter(
        (a) => a.currentStatus === 'Available'
    ).length;
    const damaged = allAssets.filter(
        (a) =>
            a.currentStatus === 'Damaged' || a.currentStatus === 'Under Repair'
    ).length;

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalAssets,
            allocated,
            available,
            damaged
        }
    };
};

const getAuditReport = async (query = {}) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const logQuery = {};
    if (query.moduleName) logQuery.moduleName = query.moduleName;
    if (query.action) logQuery.action = query.action;

    const dateRange = getDateRange(query, 'createdAt');
    Object.assign(logQuery, dateRange);

    if (query.search) {
        const searchRegex = new RegExp(query.search, 'i');
        logQuery.$or = [{ action: searchRegex }, { ipAddress: searchRegex }];
    }

    const total = await AuditLog.countDocuments(logQuery);
    const docs = await AuditLog.find(logQuery)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const totalLogs = await AuditLog.countDocuments(dateRange);

    return {
        docs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        kpis: {
            totalAudits: totalLogs
        }
    };
};

module.exports = {
    getSalesReport,
    getLeadsReport,
    getAttendanceReport,
    getTasksReport,
    getAssetsReport,
    getAuditReport
};
