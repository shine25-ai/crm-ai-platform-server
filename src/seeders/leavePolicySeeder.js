const leaveService = require('../modules/leave/leave.service');

const seedLeavePolicies = async () => {
    try {
        await leaveService.seedDefaultPolicies();
        console.log('[Seeder] Leave policies seeded successfully');
    } catch (error) {
        console.error('[Seeder] Error seeding leave policies:', error.message);
    }
};

module.exports = seedLeavePolicies;
