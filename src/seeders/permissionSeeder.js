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
    ['campaigns:read', 'Read Campaigns', 'Campaigns'],
    ['tasks:read', 'Read Tasks', 'Tasks'],
    ['tasks:write', 'Write Tasks', 'Tasks'],
    ['tasks:delete', 'Delete Tasks', 'Tasks'],
    ['attendance:read', 'Read Attendance', 'Attendance'],
    ['attendance:write', 'Write Attendance', 'Attendance'],
    ['notifications:read', 'Read Notifications', 'Notifications'],
    ['notifications:write', 'Write Notifications', 'Notifications'],
    ['chat:read', 'Read Chat', 'Chat'],
    ['chat:write', 'Write Chat', 'Chat'],
    ['approvals:read', 'Read Approvals', 'Approvals'],
    ['approvals:write', 'Write Approvals', 'Approvals'],
    ['calendar:read', 'Read Calendar', 'Calendar'],
    ['calendar:write', 'Write Calendar', 'Calendar'],
    ['calendar:delete', 'Delete Calendar', 'Calendar'],
    ['activity:read', 'Read Activity Logs', 'Activity'],
    ['gps:read', 'Read GPS Tracking', 'GPS Tracking'],
    ['reports:read', 'Read Reports', 'Reports'],
    ['settings:read', 'Read Settings', 'Settings']
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
        'leads:read',
        'leads:write',
        'customers:read',
        'sales:read',
        'sales:write',
        'campaigns:read',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'calendar:read',
        'calendar:write',
        'activity:read',
        'settings:read'
    ],
    HR: [
        'dashboard:view',
        'users:read',
        'departments:read',
        'employees:read',
        'employees:write',
        'leads:read',
        'leads:write',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'calendar:read',
        'calendar:write',
        'activity:read',
        'settings:read'
    ],
    EMPLOYEE: [
        'dashboard:view',
        'employees:read',
        'leads:read',
        'leads:write',
        'tasks:read',
        'tasks:write',
        'attendance:read',
        'attendance:write',
        'notifications:read',
        'chat:read',
        'chat:write',
        'approvals:read',
        'approvals:write',
        'calendar:read',
        'settings:read'
    ],
    SALES_MANAGER: [
        'dashboard:view',
        'users:read',
        'leads:read',
        'leads:write',
        'leads:assign',
        'leads:convert',
        'customers:read',
        'customers:write',
        'notifications:read',
        'notifications:write',
        'chat:read',
        'chat:write',
        'settings:read'
    ],
    SALES_EXECUTIVE: [
        'dashboard:view',
        'leads:read',
        'leads:write',
        'customers:read',
        'notifications:read',
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
            'EMPLOYEE',
            rolePermissions.EMPLOYEE,
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
    } catch (error) {
        console.error('Error seeding permissions:', error);
    }
};

module.exports = seedPermissions;
