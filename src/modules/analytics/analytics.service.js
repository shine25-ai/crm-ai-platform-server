const Employee = require('../employees/employee.model');
const Attendance = require('../attendance/attendance.model');
const Task = require('../tasks/task.model');
const User = require('../users/user.model');
const ActivityLog = require('../activityLogs/activityLog.model');
const Customer = require('../customers/customer.model');
const {
    SalesOpportunity,
    SalesQuotation,
    SalesFollowUp
} = require('../sales/sales.model');

const toNumber = (value) => Number(value || 0);

const getExpectedRevenue = (opportunity) =>
    Math.round(
        (toNumber(opportunity.dealValue) * toNumber(opportunity.probability)) /
            100
    );

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

const monthKey = (value) =>
    new Date(value || Date.now()).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

const getPaymentDateBounds = (filters = {}) => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (filters.period) {
        case 'Today':
            return { start, end };
        case 'Week':
            start.setDate(start.getDate() - start.getDay());
            return { start, end };
        case 'Month':
            start.setDate(1);
            return { start, end };
        case 'Year':
            start.setMonth(0, 1);
            return { start, end };
        case 'Custom':
        default:
            return {
                start: filters.dateFrom
                    ? new Date(`${filters.dateFrom}T00:00:00`)
                    : null,
                end: filters.dateTo
                    ? new Date(`${filters.dateTo}T23:59:59.999`)
                    : null
            };
    }
};

const isWithinPaymentRange = (value, bounds) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    if (bounds.start && date < bounds.start) return false;
    if (bounds.end && date > bounds.end) return false;
    return true;
};

const getDashboardSummary = async () => {
    const today = new Date().toISOString().slice(0, 10);

    const [
        todaysAttendance,
        activeEmployees,
        pendingTasks,
        completedTasks,
        onlineEmployees,
        recentActivities
    ] = await Promise.all([
        Attendance.countDocuments({ shiftDate: today }),
        Employee.countDocuments({ status: 'Active' }),
        Task.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }),
        Task.countDocuments({ status: 'Completed' }),
        User.countDocuments({
            lastActive: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
        }),
        ActivityLog.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(10)
    ]);

    const attendanceTrend = await Attendance.aggregate([
        { $sort: { shiftDate: -1 } },
        {
            $group: {
                _id: '$shiftDate',
                present: { $sum: 1 },
                workingHours: { $sum: '$workingHours' }
            }
        },
        { $sort: { _id: 1 } },
        { $limit: 30 }
    ]);

    const taskCompletionRate =
        pendingTasks + completedTasks === 0
            ? 0
            : Math.round(
                  (completedTasks / (pendingTasks + completedTasks)) * 100
              );

    return {
        widgets: {
            todaysAttendance,
            activeEmployees,
            pendingTasks,
            completedTasks,
            onlineEmployees
        },
        charts: {
            attendanceTrend,
            taskCompletionRate,
            employeeProductivity: []
        },
        recentActivities
    };
};

const getSalesAnalytics = async (filters = {}) => {
    const opportunityQuery = {
        ...getDateRange(filters, 'expectedClosingDate')
    };
    if (filters.assignedTo) opportunityQuery.assignedTo = filters.assignedTo;
    if (filters.salesPerson) opportunityQuery.assignedTo = filters.salesPerson;
    if (filters.stage) opportunityQuery.stage = filters.stage;

    const performanceDateQuery = getDateRange(filters, 'createdAt');

    const [
        opportunities,
        allOpportunities,
        quotations,
        followUps,
        customers,
        users
    ] = await Promise.all([
        SalesOpportunity.find(opportunityQuery)
            .populate('customerId', 'customerName companyName customerType')
            .populate('assignedTo', 'name email')
            .sort({ expectedClosingDate: 1 }),
        SalesOpportunity.find(performanceDateQuery)
            .populate('customerId', 'customerName companyName customerType')
            .populate('assignedTo', 'name email'),
        SalesQuotation.find(performanceDateQuery),
        SalesFollowUp.find(performanceDateQuery).populate(
            'assignedTo',
            'name email'
        ),
        Customer.find({}).populate('assignedTo', 'name email department'),
        User.find({ status: { $in: ['Active', 'ACTIVE'] } }).select(
            'name email'
        )
    ]);

    const forecastRows = opportunities.map((item) => ({
        id: item._id,
        opportunityName: item.opportunityName,
        customerName:
            item.customerId?.customerName ||
            item.customerId?.companyName ||
            item.leadName ||
            '-',
        dealValue: toNumber(item.dealValue),
        probability: toNumber(item.probability),
        expectedRevenue: getExpectedRevenue(item),
        expectedClosingDate: item.expectedClosingDate,
        stage: item.stage,
        assignedTo: item.assignedTo?.name || 'Unassigned'
    }));

    const forecastChartMap = forecastRows.reduce((acc, item) => {
        const key = monthKey(item.expectedClosingDate);
        if (!acc[key])
            acc[key] = { period: key, expectedRevenue: 0, dealValue: 0 };
        acc[key].expectedRevenue += item.expectedRevenue;
        acc[key].dealValue += item.dealValue;
        return acc;
    }, {});

    const pipelineValue = forecastRows.reduce(
        (sum, item) => sum + item.dealValue,
        0
    );
    const expectedRevenue = forecastRows.reduce(
        (sum, item) => sum + item.expectedRevenue,
        0
    );

    const wonCount = allOpportunities.filter(
        (item) => item.status === 'Won' || item.stage === 'Won'
    ).length;
    const lostCount = allOpportunities.filter(
        (item) => item.status === 'Lost' || item.stage === 'Lost'
    ).length;
    const opportunityCount = allOpportunities.length;
    const quotationCount = quotations.length;
    const leadCount =
        customers.filter((item) => item.status === 'Prospect').length +
        allOpportunities.filter((item) => item.relatedType === 'Lead').length;
    const qualifiedCount = customers.filter((item) =>
        ['Active', 'Prospect'].includes(item.status)
    ).length;
    const conversionPercentage = opportunityCount
        ? Math.round((wonCount / opportunityCount) * 100)
        : 0;

    const paymentBounds = getPaymentDateBounds(filters);
    const paymentRows = customers.flatMap((customer) =>
        (customer.projectEngagements || []).flatMap((project) => {
            if (
                filters.projectId &&
                String(project._id) !== String(filters.projectId)
            ) {
                return [];
            }
            if (
                filters.department &&
                customer.assignedTo?.department !== filters.department
            ) {
                return [];
            }
            return (project.payments || [])
                .filter((payment) =>
                    isWithinPaymentRange(payment.paymentDate, paymentBounds)
                )
                .map((payment) => ({
                    paymentId: payment._id,
                    customerId: customer._id,
                    customerName:
                        customer.customerName || customer.companyName || '-',
                    customerType: customer.customerType || 'Unclassified',
                    projectId: project._id,
                    projectName: project.projectName,
                    department: customer.assignedTo?.department || 'Unassigned',
                    assignedTo: customer.assignedTo,
                    paymentDate: payment.paymentDate,
                    amount: toNumber(payment.amount),
                    paymentMode: payment.paymentMode,
                    referenceNumber: payment.referenceNumber
                }));
        })
    );

    const paidRevenueByCustomer = paymentRows.reduce((map, payment) => {
        const key = String(payment.customerId);
        map.set(key, (map.get(key) || 0) + payment.amount);
        return map;
    }, new Map());

    const sourceMap = customers.reduce((acc, item) => {
        const source = item.customerType || 'Unclassified';
        if (!acc[source]) {
            acc[source] = {
                leadSource: source,
                totalLeads: 0,
                convertedLeads: 0,
                lostLeads: 0,
                revenueGenerated: 0
            };
        }
        acc[source].totalLeads += 1;
        if (item.status === 'Active') acc[source].convertedLeads += 1;
        if (['Inactive', 'Blocked'].includes(item.status))
            acc[source].lostLeads += 1;
        acc[source].revenueGenerated +=
            paidRevenueByCustomer.get(String(item._id)) || 0;
        return acc;
    }, {});

    const leadSources = Object.values(sourceMap).map((item) => ({
        ...item,
        conversionPercentage: item.totalLeads
            ? Math.round((item.convertedLeads / item.totalLeads) * 100)
            : 0
    }));

    const userMap = new Map(
        users.map((user) => [
            String(user._id),
            {
                userId: String(user._id),
                salesPersonName: user.name,
                totalLeadsAssigned: 0,
                followUpsCompleted: 0,
                opportunitiesCreated: 0,
                wonDeals: 0,
                lostDeals: 0,
                revenueGenerated: 0,
                conversionPercentage: 0
            }
        ])
    );

    const ensureUser = (value) => {
        const id = String(value?._id || value || 'unassigned');
        if (!userMap.has(id)) {
            userMap.set(id, {
                userId: id,
                salesPersonName: value?.name || 'Unassigned',
                totalLeadsAssigned: 0,
                followUpsCompleted: 0,
                opportunitiesCreated: 0,
                wonDeals: 0,
                lostDeals: 0,
                revenueGenerated: 0,
                conversionPercentage: 0
            });
        }
        return userMap.get(id);
    };

    customers.forEach((item) => {
        ensureUser(item.assignedTo).totalLeadsAssigned += 1;
    });

    allOpportunities.forEach((item) => {
        const row = ensureUser(item.assignedTo);
        row.opportunitiesCreated += 1;
        if (item.relatedType === 'Lead') row.totalLeadsAssigned += 1;
        if (item.status === 'Won' || item.stage === 'Won') row.wonDeals += 1;
        if (item.status === 'Lost' || item.stage === 'Lost') row.lostDeals += 1;
    });

    followUps
        .filter((item) => item.status === 'Completed')
        .forEach((item) => {
            ensureUser(item.assignedTo).followUpsCompleted += 1;
        });

    paymentRows.forEach((payment) => {
        ensureUser(payment.assignedTo).revenueGenerated += payment.amount;
    });

    const salesPerformance = Array.from(userMap.values())
        .map((row) => ({
            ...row,
            conversionPercentage: row.opportunitiesCreated
                ? Math.round((row.wonDeals / row.opportunitiesCreated) * 100)
                : 0
        }))
        .filter(
            (row) =>
                !filters.salesPerson ||
                row.userId === String(filters.salesPerson)
        )
        .sort((a, b) => b.revenueGenerated - a.revenueGenerated);

    const revenueByDate = Object.values(
        paymentRows.reduce((map, payment) => {
            const key = new Date(payment.paymentDate)
                .toISOString()
                .slice(0, 10);
            if (!map[key]) {
                map[key] = { date: key, revenueGenerated: 0, payments: 0 };
            }
            map[key].revenueGenerated += payment.amount;
            map[key].payments += 1;
            return map;
        }, {})
    ).sort((a, b) => a.date.localeCompare(b.date));

    const projects = customers.flatMap((customer) =>
        (customer.projectEngagements || []).map((project) => ({
            id: project._id,
            name: project.projectName,
            customerName: customer.customerName || customer.companyName
        }))
    );

    return {
        filters: {
            users: users.map((user) => ({
                id: user._id,
                name: user.name,
                email: user.email
            })),
            stages: [
                'Qualification',
                'Discovery',
                'Proposal',
                'Negotiation',
                'Won',
                'Lost'
            ],
            departments: [
                ...new Set(
                    customers
                        .map((customer) => customer.assignedTo?.department)
                        .filter(Boolean)
                )
            ].sort(),
            projects
        },
        revenueForecast: {
            cards: {
                pipelineValue,
                expectedRevenue,
                opportunityCount,
                averageProbability: forecastRows.length
                    ? Math.round(
                          forecastRows.reduce(
                              (sum, item) => sum + item.probability,
                              0
                          ) / forecastRows.length
                      )
                    : 0
            },
            chart: Object.values(forecastChartMap),
            opportunities: forecastRows
        },
        conversionFunnel: {
            chart: [
                { name: 'Leads', value: leadCount },
                { name: 'Qualified', value: qualifiedCount },
                { name: 'Opportunities', value: opportunityCount },
                { name: 'Quotations', value: quotationCount },
                { name: 'Won', value: wonCount },
                { name: 'Lost', value: lostCount }
            ],
            leadCount,
            qualifiedCount,
            opportunityCount,
            quotationCount,
            wonCount,
            lostCount,
            conversionPercentage
        },
        leadSources: {
            chart: leadSources.map((item) => ({
                name: item.leadSource,
                value: item.totalLeads,
                revenueGenerated: item.revenueGenerated
            })),
            rows: leadSources
        },
        salesPerformance: {
            cards: {
                revenueGenerated: salesPerformance.reduce(
                    (sum, item) => sum + item.revenueGenerated,
                    0
                ),
                wonDeals: salesPerformance.reduce(
                    (sum, item) => sum + item.wonDeals,
                    0
                ),
                completedFollowUps: salesPerformance.reduce(
                    (sum, item) => sum + item.followUpsCompleted,
                    0
                ),
                teamConversion: salesPerformance.length
                    ? Math.round(
                          salesPerformance.reduce(
                              (sum, item) => sum + item.conversionPercentage,
                              0
                          ) / salesPerformance.length
                      )
                    : 0
            },
            revenueChart: revenueByDate.map((item) => ({
                name: item.date,
                revenueGenerated: item.revenueGenerated,
                payments: item.payments
            })),
            rows: salesPerformance,
            payments: paymentRows
        }
    };
};

module.exports = { getDashboardSummary, getSalesAnalytics };
