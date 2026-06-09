require('./config/env');
const app = require('./app');
const connectDB = require('./config/database');
const createDefaultRole = require('./seeds/defaultRole.js');
const createDefaultAdmin = require('./seeds/defaultAdmin.js');
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect MongoDB First
        await connectDB();

        // Create default role and admin
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
