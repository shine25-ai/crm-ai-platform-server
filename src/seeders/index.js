require('../config/env');
const mongoose = require('mongoose');

const createDefaultRole = require('./roleSeeder');
const seedPermissions = require('./permissionSeeder');
const createDefaultAdmin = require('./superAdminSeeder');
const seedCustomers = require('./customerSeeder');
const seedSales = require('./salesSeeder');
const seedWorkflows = require('./workflowSeeder');
const seedLeads = require('./leadSeeder');
const seedCommunications = require('./communicationSeeder');
const seedLeavePolicies = require('./leavePolicySeeder');
const seedLeaveData = require('./leaveDataSeeder');
const seedAssets = require('./assetSeeder');
const seedPhase5 = require('./phase5Seeder');

const runSeeders = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('📡 Connected successfully.');

        console.log('🚀 Running seeders in sequence...');

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
        await seedAssets();
        await seedPhase5();

        console.log('🎉 Database seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

runSeeders();
