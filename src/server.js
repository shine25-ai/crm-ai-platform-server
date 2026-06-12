require('./config/env');
const http = require('http');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./config/socket');
const createDefaultRole = require('./seeders/roleSeeder.js');
const seedPermissions = require('./seeders/permissionSeeder.js');
const createDefaultAdmin = require('./seeders/superAdminSeeder.js');
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

        // await seedDepartmentsAndEmployees();

        // Create HTTP Server & attach Socket.io
        const server = http.createServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
    }
};

startServer();
