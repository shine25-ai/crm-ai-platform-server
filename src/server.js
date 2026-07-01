// Polyfill global crypto for older Node versions (such as Node v16.20.2)
if (typeof global.crypto === 'undefined') {
    const crypto = require('crypto');
    global.crypto = crypto.webcrypto || crypto;
    if (global.crypto && !global.crypto.randomUUID) {
        global.crypto.randomUUID = crypto.randomUUID;
    }
}
require('./config/env');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./config/socket');
const createDefaultRole = require('./seeders/roleSeeder.js');
const seedPermissions = require('./seeders/permissionSeeder.js');
const createDefaultAdmin = require('./seeders/superAdminSeeder.js');
const seedCustomers = require('./seeders/customerSeeder.js');
const seedSales = require('./seeders/salesSeeder.js');
const seedWorkflows = require('./seeders/workflowSeeder.js');
const seedLeads = require('./seeders/leadSeeder.js');
const seedCommunications = require('./seeders/communicationSeeder.js');
const seedLeavePolicies = require('./seeders/leavePolicySeeder.js');
const seedLeaveData = require('./seeders/leaveDataSeeder.js');
const {
    scheduleTaskDeadlineReminders
} = require('./shared/services/taskDeadline.cron');
const {
    scheduleApprovalEscalations
} = require('./shared/services/approvalEscalation.cron');
const {
    scheduleLeadFollowUpReminders
} = require('./shared/services/leadFollowUp.cron');
const {
    runInvoiceGeneration,
    scheduleInvoiceGeneration
} = require('./shared/services/invoiceGeneration.cron');
// const seedDepartmentsAndEmployees = require('./seeders/departmentAndEmployeeSeeder.js');
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect MongoDB First
        await connectDB();

        // Create default role and admin
        await createDefaultRole();
        await seedPermissions();
        await createDefaultAdmin();
        await seedCustomers();
        await seedSales();
        await seedWorkflows();
        await seedLeads();
        await seedCommunications();
        await seedLeavePolicies();
        await seedLeaveData();

        // await seedDepartmentsAndEmployees();

        // Create HTTP Server & attach Socket.io
        const server = http.createServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            // Start background cron jobs
            scheduleTaskDeadlineReminders();
            scheduleApprovalEscalations();
            scheduleLeadFollowUpReminders();
            scheduleInvoiceGeneration();
            runInvoiceGeneration();
        });
    } catch (error) {
        console.error('Server startup failed:', error);
    }
};

startServer();
