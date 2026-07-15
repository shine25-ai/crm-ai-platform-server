require('../config/env');
const mongoose = require('mongoose');
const { Company } = require('../modules/saas/saas.model');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');

const tenantCollections = [
    'activitylogs',
    'analytics',
    'approvalactions',
    'approvalattachments',
    'approvalcomments',
    'approvals',
    'assetassignmenthistories',
    'assets',
    'attendances',
    'campaigns',
    'chatattachments',
    'chatcalls',
    'chatconversations',
    'chatgroups',
    'chatmessagereads',
    'chatmessages',
    'chatparticipants',
    'chatreactions',
    'communicationsettings',
    'communicationtemplates',
    'communicationlogs',
    'customers',
    'departments',
    'documents',
    'emailtemplates',
    'emaillogs',
    'employeeassets',
    'employeedocuments',
    'employees',
    'events',
    'expenseattachments',
    'expenseclaims',
    'gpsgeofences',
    'gpslocations',
    'gpssettings',
    'gpsvisits',
    'invoices',
    'invoicetemplates',
    'issues',
    'leadactivities',
    'leadcalls',
    'leaddocuments',
    'leadfollowups',
    'leadmeetings',
    'leadnotes',
    'leadownerhistories',
    'leads',
    'leavebalances',
    'leavepolicies',
    'notes',
    'notifications',
    'opportunities',
    'projectactivities',
    'projects',
    'resourceallocations',
    'roles',
    'sales',
    'settings',
    'shiftassignments',
    'shifts',
    'taskactivitylogs',
    'taskassignmenthistories',
    'taskattachments',
    'taskcomments',
    'tasks',
    'timesheets',
    'users',
    'whatsapplogs',
    'whatsapptemplates',
    'workflowdefinitions',
    'workflows'
];

const addDefaultTenant = async ({ disconnect = true } = {}) => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }

    let company = await Company.findOne({ domain: 'default.local' });
    if (!company) {
        company = await Company.create({
            companyName: 'Default CRM Tenant',
            legalName: 'Default CRM Tenant',
            domain: 'default.local',
            subdomain: 'default',
            status: 'active',
            timezone: 'Asia/Calcutta',
            locale: 'en-IN',
            currency: 'INR'
        });
    }

    const superAdminRole = await Role.findOne({ roleCode: 'SUPER_ADMIN' });
    await User.updateMany(
        { roleId: { $ne: superAdminRole?._id } },
        { $set: { tenantId: company._id, companyId: company._id } }
    );

    for (const collectionName of tenantCollections) {
        const exists = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .hasNext();
        if (!exists) continue;

        const result = await mongoose.connection.db
            .collection(collectionName)
            .updateMany(
                {
                    $or: [
                        { tenantId: { $exists: false } },
                        { tenantId: null },
                        { companyId: { $exists: false } },
                        { companyId: null }
                    ]
                },
                {
                    $set: {
                        tenantId: company._id,
                        companyId: company._id
                    }
                }
            );
        if (result.modifiedCount) {
            console.log(
                `Mapped ${result.modifiedCount} ${collectionName} records to Default CRM Tenant`
            );
        }
        await mongoose.connection.db
            .collection(collectionName)
            .createIndex({ tenantId: 1 })
            .catch(() => {});
        await mongoose.connection.db
            .collection(collectionName)
            .createIndex({ companyId: 1 })
            .catch(() => {});
    }

    console.log(`Default tenant migration complete: ${company._id}`);
    if (disconnect) {
        await mongoose.disconnect();
    }
    return company;
};

if (require.main === module) {
    addDefaultTenant()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = addDefaultTenant;
