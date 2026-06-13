const Employee = require('../employees/employee.model');
const Attendance = require('../attendance/attendance.model');
const Task = require('../tasks/task.model');
const User = require('../users/user.model');
const ActivityLog = require('../activityLogs/activityLog.model');

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

module.exports = { getDashboardSummary };
