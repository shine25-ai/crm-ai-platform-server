require('./config/env');
const app = require('./app');
const connectDB = require('./config/database');
const createDefaultRole = require('./seeders/roleSeeder.js');
const createDefaultAdmin = require('./seeders/superAdminSeeder.js');
const seedPermissions = require('./seeders/permissionSeeder.js');
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect MongoDB First
        await connectDB();

        // Seed permissions, roles, and default admin
        await seedPermissions();
        await createDefaultRole();
        await createDefaultAdmin();

        // Start Express Server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error);
    }
};

startServer();
