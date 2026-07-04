const Permission = require('../modules/permissions/permission.model');
const Role = require('../modules/roles/role.model');
const RolePermission = require('../modules/permissions/rolePermission.model');

const permissionCatalog = [
    ['dashboard:view', 'View Dashboard', 'Dashboard'],
    ['users:read', 'Read Users', 'Users'],
    ['users:write', 'Write Users', 'Users'],
    ['users:delete', 'Delete Users', 'Users'],
    ['permissions:read', 'Read Permissions', 'Permissions'],
    ['permissions:write', 'Write Permissions', 'Permissions'],
    ['permissions:delete', 'Delete Permissions', 'Permissions'],
    ['roles:read', 'Read Roles', 'Roles'],
    ['roles:write', 'Write Roles', 'Roles'],
    ['roles:delete', 'Delete Roles', 'Roles'],
    ['departments:read', 'Read Departments', 'Departments'],
    ['departments:write', 'Write Departments', 'Departments'],
    ['departments:delete', 'Delete Departments', 'Departments'],
    ['employees:read', 'Read Employees', 'Employees'],
    ['employees:write', 'Write Employees', 'Employees'],
    ['employees:delete', 'Delete Employees', 'Employees'],
    ['leads:read', 'Read Leads', 'Leads'],
    ['leads:write', 'Write Leads', 'Leads'],
    ['leads:delete', 'Delete Leads', 'Leads'],
    ['leads:assign', 'Assign Leads', 'Leads'],
    ['leads:convert', 'Convert Leads', 'Leads'],
    ['customers:read', 'Read Customers', 'Customers'],
    ['sales:read', 'Read Sales', 'Sales'],
    ['sales:write', 'Write Sales', 'Sales'],
    ['customers:write', 'Write Customers', 'Customers'],
    ['communications:read', 'Read Communication Management', 'Communications'],
    [
        'communications:write',
        'Write Communication Management',
        'Communications'
    ],
    ['campaigns:read', 'Read Campaigns', 'Campaigns'],
    ['tasks:read', 'Read Tasks', 'Tasks'],
    ['tasks:write', 'Write Tasks', 'Tasks'],
    ['tasks:delete', 'Delete Tasks', 'Tasks'],
    ['attendance:read', 'Read Attendance', 'Attendance'],
    ['attendance:write', 'Write Attendance', 'Attendance'],
    ['shifts:read', 'Read Shift Masters and Assignments', 'Shifts'],
    ['shifts:write', 'Write Shift Masters and Assignments', 'Shifts'],
    ['shifts:delete', 'Delete Shift Masters and Assignments', 'Shifts'],
    ['expenses:read', 'Read Expense Claims', 'Expenses'],
    ['expenses:write', 'Create and Manage Own Expense Claims', 'Expenses'],
    ['expenses:review', 'Review Employee Expense Claims', 'Expenses'],
    ['notifications:read', 'Read Notifications', 'Notifications'],
    ['notifications:write', 'Write Notifications', 'Notifications'],
    ['chat:read', 'Read Chat', 'Chat'],
    ['chat:write', 'Write Chat', 'Chat'],
    ['approvals:read', 'Read Approvals', 'Approvals'],
    ['approvals:write', 'Write Approvals', 'Approvals'],
    ['leave:read', 'Read Leave Policy', 'Leave'],
    ['leave:write', 'Write Leave Policy', 'Leave'],
    ['calendar:read', 'Read Calendar', 'Calendar'],
    ['calendar:write', 'Write Calendar', 'Calendar'],
    ['calendar:delete', 'Delete Calendar', 'Calendar'],
    ['activity:read', 'Read Activity Logs', 'Activity'],
    ['gps:read', 'Read GPS Tracking', 'GPS Tracking'],
    ['reports:read', 'Read Reports', 'Reports'],
    ['settings:read', 'Read Settings', 'Settings'],
    ['assets:read', 'Read Assets', 'Assets'],
    ['assets:write', 'Write Assets', 'Assets'],
    ['assets:delete', 'Delete Assets', 'Assets'],
    ['employees:export', 'Export Employees List', 'Employees'],
    ['leads:export', 'Export Leads Pipeline', 'Leads'],
    ['customers:merge', 'Merge Duplicate Customer Profiles', 'Customers'],
    ['reports:export', 'Export Generated Analytics Reports', 'Reports'],
    ['settings:manage', 'Manage General Application Settings', 'Settings'],
    ['auditlogs:view', 'View Database Audit Logs Trail', 'Audit Logs']
];

const rolePermissions = {
    ADMIN: [
        'dashboard:view',
        'permissions:read',
        'users:read',
        'users:write',
        'roles:read',
        'departments:read',
        'departments:write',
        'employees:read',
        'employees:write',
        'employees:export',
        'leads:read',
        'leads:write',
        'leads:export',
        'customers:read',
        'customers:write',
        'customers:write',
        'customers:merge',
        'sales:read',
        'sales:write',
        'communications:read',
        'communications:write',
        'campaigns:read',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'shifts:read',
        'shifts:write',
        'shifts:delete',
        'expenses:read',
        'expenses:write',
        'expenses:review',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'leave:read',
        'leave:write',
        'calendar:read',
        'calendar:write',
        'activity:read',
        'settings:read',
        'settings:manage',
        'auditlogs:view',
        'assets:read',
        'assets:write',
        'assets:delete'
    ],
    HR: [
        'dashboard:view',
        'users:read',
        'departments:read',
        'employees:read',
        'employees:write',
        'employees:export',
        'leads:read',
        'leads:write',
        'communications:read',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'shifts:read',
        'shifts:write',
        'shifts:delete',
        'expenses:read',
        'expenses:write',
        'expenses:review',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'leave:read',
        'leave:write',
        'calendar:read',
        'calendar:write',
        'activity:read',
        'settings:read',
        'assets:read',
        'assets:write'
    ],
    HR_MANAGER: [
        'dashboard:view',
        'users:read',
        'departments:read',
        'employees:read',
        'employees:write',
        'employees:export',
        'leads:read',
        'leads:write',
        'communications:read',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'shifts:read',
        'expenses:read',
        'expenses:write',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'leave:read',
        'leave:write',
        'calendar:read',
        'calendar:write',
        'activity:read',
        'settings:read',
        'assets:read',
        'assets:write'
    ],
    SALES_DIRECTOR: [
        'dashboard:view',
        'leads:read',
        'leads:write',
        'leads:assign',
        'leads:convert',
        'leads:export',
        'customers:read',
        'customers:write',
        'customers:merge',
        'sales:read',
        'sales:write',
        'communications:read',
        'communications:write',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'reports:read',
        'reports:export',
        'settings:read'
    ],
    SALES_MANAGER: [
        'dashboard:view',
        'users:read',
        'leads:read',
        'leads:write',
        'leads:assign',
        'leads:convert',
        'leads:export',
        'customers:read',
        'customers:write',
        'communications:read',
        'communications:write',
        'notifications:read',
        'chat:read',
        'chat:write',
        'settings:read',
        'assets:read',
        'expenses:read',
        'expenses:write'
    ],
    SALES_EXECUTIVE: [
        'dashboard:view',
        'leads:read',
        'leads:write',
        'customers:read',
        'communications:read',
        'communications:write',
        'notifications:read',
        'chat:read',
        'chat:write',
        'expenses:read',
        'expenses:write'
    ],
    BUSINESS_DEVELOPMENT_EXECUTIVE: [
        'dashboard:view',
        'leads:read',
        'leads:write',
        'notifications:read',
        'chat:read',
        'chat:write'
    ],
    CUSTOMER_SUPPORT_EXECUTIVE: [
        'dashboard:view',
        'customers:read',
        'communications:read',
        'communications:write',
        'tasks:read',
        'tasks:write',
        'notifications:read',
        'chat:read',
        'chat:write'
    ],
    TEAM_MANAGER: [
        'dashboard:view',
        'employees:read',
        'tasks:read',
        'tasks:write',
        'approvals:read',
        'approvals:write',
        'calendar:read',
        'notifications:read',
        'chat:read',
        'chat:write'
    ],
    FINANCE_MANAGER: [
        'dashboard:view',
        'employees:read',
        'sales:read',
        'reports:read',
        'approvals:read',
        'approvals:write',
        'notifications:read',
        'chat:read',
        'chat:write',
        'settings:read'
    ],
    PROCUREMENT_ASSET_MANAGER: [
        'dashboard:view',
        'assets:read',
        'assets:write',
        'assets:delete',
        'notifications:read',
        'chat:read',
        'chat:write',
        'settings:read'
    ],
    PROJECT_MANAGER: [
        'dashboard:view',
        'tasks:read',
        'tasks:write',
        'tasks:delete',
        'calendar:read',
        'calendar:write',
        'notifications:read',
        'chat:read',
        'chat:write'
    ],
    EMPLOYEE: [
        'dashboard:view',
        'employees:read',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'notifications:read',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'leave:read',
        'calendar:read',
        'settings:read',
        'assets:read'
    ],
    CLIENT_PORTAL_USER: [
        'dashboard:view',
        'communications:read',
        'communications:write',
        'chat:read',
        'chat:write'
    ]
};

const syncRolePermissions = async (roleCode, permissionCodes, seededPerms) => {
    const role = await Role.findOne({ roleCode });
    if (!role) return;

    await RolePermission.deleteMany({ roleId: role._id });

    const mappings = seededPerms
        .filter((permission) =>
            permissionCodes.includes(permission.permissionCode)
        )
        .map((permission) => ({
            roleId: role._id,
            permissionId: permission._id
        }));

    if (mappings.length > 0) {
        await RolePermission.insertMany(mappings);
    }

    role.permissions = permissionCodes;
    await role.save();
    console.log(`${roleCode} RolePermissions seeded`);
};

const seedPermissions = async () => {
    try {
        const seededPerms = [];

        for (const [
            permissionCode,
            permissionName,
            module
        ] of permissionCatalog) {
            let dbPerm = await Permission.findOne({ permissionCode });

            if (!dbPerm) {
                dbPerm = await Permission.create({
                    permissionCode,
                    permissionName,
                    module
                });
            } else {
                dbPerm.permissionName = permissionName;
                dbPerm.module = module;
                await dbPerm.save();
            }

            seededPerms.push(dbPerm);
        }

        console.log('Permissions seeded successfully');

        const superAdminRole = await Role.findOne({ roleCode: 'SUPER_ADMIN' });
        if (superAdminRole) {
            await RolePermission.deleteMany({ roleId: superAdminRole._id });
            await RolePermission.insertMany(
                seededPerms.map((permission) => ({
                    roleId: superAdminRole._id,
                    permissionId: permission._id
                }))
            );
            superAdminRole.permissions = ['*'];
            await superAdminRole.save();
            console.log('Super Admin RolePermissions seeded');
        }

        await syncRolePermissions('ADMIN', rolePermissions.ADMIN, seededPerms);
        await syncRolePermissions('HR', rolePermissions.HR, seededPerms);
        await syncRolePermissions(
            'HR_MANAGER',
            rolePermissions.HR_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'SALES_DIRECTOR',
            rolePermissions.SALES_DIRECTOR,
            seededPerms
        );
        await syncRolePermissions(
            'SALES_MANAGER',
            rolePermissions.SALES_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'SALES_EXECUTIVE',
            rolePermissions.SALES_EXECUTIVE,
            seededPerms
        );
        await syncRolePermissions(
            'BUSINESS_DEVELOPMENT_EXECUTIVE',
            rolePermissions.BUSINESS_DEVELOPMENT_EXECUTIVE,
            seededPerms
        );
        await syncRolePermissions(
            'CUSTOMER_SUPPORT_EXECUTIVE',
            rolePermissions.CUSTOMER_SUPPORT_EXECUTIVE,
            seededPerms
        );
        await syncRolePermissions(
            'TEAM_MANAGER',
            rolePermissions.TEAM_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'FINANCE_MANAGER',
            rolePermissions.FINANCE_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'PROCUREMENT_ASSET_MANAGER',
            rolePermissions.PROCUREMENT_ASSET_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'PROJECT_MANAGER',
            rolePermissions.PROJECT_MANAGER,
            seededPerms
        );
        await syncRolePermissions(
            'EMPLOYEE',
            rolePermissions.EMPLOYEE,
            seededPerms
        );
        await syncRolePermissions(
            'CLIENT_PORTAL_USER',
            rolePermissions.CLIENT_PORTAL_USER,
            seededPerms
        );
    } catch (error) {
        console.error('Error seeding permissions:', error);
    }
};

module.exports = seedPermissions;
