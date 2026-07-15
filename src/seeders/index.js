require('../config/env');
const mongoose = require('mongoose');
const tenantScopePlugin = require('../shared/plugins/tenantScope.plugin');

mongoose.plugin(tenantScopePlugin);

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
const seedExpenseClaims = require('./expenseClaimSeeder');
const seedGpsTracking = require('./gpsTrackingSeeder');
const seedPhase7 = require('./phase7Seeder');
const addDefaultTenant = require('../migrations/addDefaultTenant');
const seedDemoTenants = require('./demoTenantSeeder');

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
        await seedExpenseClaims();
        await seedAssets();
        await seedPhase5();
        await seedPhase7();
        await seedDemoTenants();
        await seedGpsTracking();
        await addDefaultTenant({ disconnect: false });

        console.log('🎉 Database seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

runSeeders();
