const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const errorMiddleware = require('./shared/middleware/error.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const roleRoutes = require('./modules/roles/role.routes');
const userRoutes = require('./modules/users/user.routes');
const departmentRoutes = require('./modules/departments/department.routes');
const employeeRoutes = require('./modules/employees/employee.routes');
const permissionRoutes = require('./modules/permissions/permission.routes');
const employeeDocumentRoutes = require('./modules/employees/employeeDocument.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const auditRoutes = require('./modules/auditLogs/audit.routes');
const profileRoutes = require('./modules/profile/profile.routes');
const searchRoutes = require('./modules/search/search.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const chatRoutes = require('./modules/chat/chat.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const approvalRoutes = require('./modules/approvals/approval.routes');
const eventRoutes = require('./modules/events/event.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const activityLogRoutes = require('./modules/activityLogs/activityLog.routes');
const customerRoutes = require('./modules/customers/customer.routes');
const salesRoutes = require('./modules/sales/sales.routes');
const leadRoutes = require('./modules/leads/lead.routes');
const communicationRoutes = require('./modules/communications/communication.routes');
const leaveRoutes = require('./modules/leave/leave.routes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(
    helmet({
        crossOriginResourcePolicy: false // Allows downloading files from another domain (frontend)
    })
);
app.use(morgan('dev'));

// Static files server for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/employee-documents', employeeDocumentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/leave', leaveRoutes);

app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'CRM AI API Running'
    });
});

app.use(errorMiddleware);

module.exports = app;
