const Permission = require('../modules/permissions/permission.model');
const Role = require('../modules/roles/role.model');
const RolePermission = require('../modules/permissions/rolePermission.model');

const seedPermissions = async () => {
    try {
        const permissions = [
            {
                permissionCode: 'dashboard:view',
                permissionName: 'View Dashboard',
                module: 'Dashboard'
            },
            {
                permissionCode: 'users:read',
                permissionName: 'Read Users',
                module: 'Users'
            },
            {
                permissionCode: 'users:write',
                permissionName: 'Write Users',
                module: 'Users'
            },
            {
                permissionCode: 'users:delete',
                permissionName: 'Delete Users',
                module: 'Users'
            },
            {
                permissionCode: 'permissions:read',
                permissionName: 'Read Permissions',
                module: 'Permissions'
            },
            {
                permissionCode: 'permissions:write',
                permissionName: 'Write Permissions',
                module: 'Permissions'
            },
            {
                permissionCode: 'permissions:delete',
                permissionName: 'Delete Permissions',
                module: 'Permissions'
            },
            {
                permissionCode: 'roles:read',
                permissionName: 'Read Roles',
                module: 'Roles'
            },
            {
                permissionCode: 'roles:write',
                permissionName: 'Write Roles',
                module: 'Roles'
            },
            {
                permissionCode: 'roles:delete',
                permissionName: 'Delete Roles',
                module: 'Roles'
            },
            {
                permissionCode: 'departments:read',
                permissionName: 'Read Departments',
                module: 'Departments'
            },
            {
                permissionCode: 'departments:write',
                permissionName: 'Write Departments',
                module: 'Departments'
            },
            {
                permissionCode: 'departments:delete',
                permissionName: 'Delete Departments',
                module: 'Departments'
            },
            {
                permissionCode: 'employees:read',
                permissionName: 'Read Employees',
                module: 'Employees'
            },
            {
                permissionCode: 'employees:write',
                permissionName: 'Write Employees',
                module: 'Employees'
            },
            {
                permissionCode: 'employees:delete',
                permissionName: 'Delete Employees',
                module: 'Employees'
            },
            {
                permissionCode: 'leads:read',
                permissionName: 'Read Leads',
                module: 'Leads'
            },
            {
                permissionCode: 'leads:write',
                permissionName: 'Write Leads',
                module: 'Leads'
            },
            {
                permissionCode: 'leads:delete',
                permissionName: 'Delete Leads',
                module: 'Leads'
            },
            {
                permissionCode: 'customers:read',
                permissionName: 'Read Customers',
                module: 'Customers'
            },
            {
                permissionCode: 'campaigns:read',
                permissionName: 'Read Campaigns',
                module: 'Campaigns'
            },
            {
                permissionCode: 'tasks:read',
                permissionName: 'Read Tasks',
                module: 'Tasks'
            },
            {
                permissionCode: 'tasks:write',
                permissionName: 'Write Tasks',
                module: 'Tasks'
            },
            {
                permissionCode: 'tasks:delete',
                permissionName: 'Delete Tasks',
                module: 'Tasks'
            },
            {
                permissionCode: 'attendance:read',
                permissionName: 'Read Attendance',
                module: 'Attendance'
            },
            {
                permissionCode: 'attendance:write',
                permissionName: 'Write Attendance',
                module: 'Attendance'
            },
            {
                permissionCode: 'notifications:read',
                permissionName: 'Read Notifications',
                module: 'Notifications'
            },
            {
                permissionCode: 'notifications:write',
                permissionName: 'Write Notifications',
                module: 'Notifications'
            },
            {
                permissionCode: 'chat:read',
                permissionName: 'Read Chat',
                module: 'Chat'
            },
            {
                permissionCode: 'chat:write',
                permissionName: 'Write Chat',
                module: 'Chat'
            },
            {
                permissionCode: 'approvals:read',
                permissionName: 'Read Approvals',
                module: 'Approvals'
            },
            {
                permissionCode: 'approvals:write',
                permissionName: 'Write Approvals',
                module: 'Approvals'
            },
            {
                permissionCode: 'calendar:read',
                permissionName: 'Read Calendar',
                module: 'Calendar'
            },
            {
                permissionCode: 'calendar:write',
                permissionName: 'Write Calendar',
                module: 'Calendar'
            },
            {
                permissionCode: 'calendar:delete',
                permissionName: 'Delete Calendar',
                module: 'Calendar'
            },
            {
                permissionCode: 'activity:read',
                permissionName: 'Read Activity Logs',
                module: 'Activity'
            },
            {
                permissionCode: 'gps:read',
                permissionName: 'Read GPS Tracking',
                module: 'GPS Tracking'
            },
            {
                permissionCode: 'reports:read',
                permissionName: 'Read Reports',
                module: 'Reports'
            },
            {
                permissionCode: 'settings:read',
                permissionName: 'Read Settings',
                module: 'Settings'
            }
        ];

        // 1. Seed permissions
        const seededPerms = [];
        for (const perm of permissions) {
            let dbPerm = await Permission.findOne({
                permissionCode: perm.permissionCode
            });
            if (!dbPerm) {
                dbPerm = await Permission.create(perm);
            } else {
                dbPerm.permissionName = perm.permissionName;
                dbPerm.module = perm.module;
                await dbPerm.save();
            }
            seededPerms.push(dbPerm);
        }
        console.log('✅ Permissions seeded successfully');

        // 2. Set up default RolePermissions
        const superAdminRole = await Role.findOne({ roleCode: 'SUPER_ADMIN' });
        const adminRole = await Role.findOne({ roleCode: 'ADMIN' });
        const hrRole = await Role.findOne({ roleCode: 'HR' });
        const employeeRole = await Role.findOne({ roleCode: 'EMPLOYEE' });

        if (superAdminRole) {
            await RolePermission.deleteMany({ roleId: superAdminRole._id });
            const superAdminMappings = seededPerms.map((p) => ({
                roleId: superAdminRole._id,
                permissionId: p._id
            }));
            await RolePermission.insertMany(superAdminMappings);
            superAdminRole.permissions = ['*'];
            await superAdminRole.save();
            console.log('✅ Super Admin RolePermissions seeded');
        }

        if (adminRole) {
            await RolePermission.deleteMany({ roleId: adminRole._id });
            const adminPermCodes = [
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
            ];
            const adminMappings = seededPerms
                .filter((p) => adminPermCodes.includes(p.permissionCode))
                .map((p) => ({
                    roleId: adminRole._id,
                    permissionId: p._id
                }));
            await RolePermission.insertMany(adminMappings);
            adminRole.permissions = adminPermCodes;
            await adminRole.save();
            console.log('✅ Admin RolePermissions seeded');
        }

        if (hrRole) {
            await RolePermission.deleteMany({ roleId: hrRole._id });
            const hrPermCodes = [
                'dashboard:view',
                'users:read',
                'departments:read',
                'employees:read',
                'employees:write',
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
            ];
            const hrMappings = seededPerms
                .filter((p) => hrPermCodes.includes(p.permissionCode))
                .map((p) => ({
                    roleId: hrRole._id,
                    permissionId: p._id
                }));
            await RolePermission.insertMany(hrMappings);
            hrRole.permissions = hrPermCodes;
            await hrRole.save();
            console.log('âœ… HR RolePermissions seeded');
        }

        if (employeeRole) {
            await RolePermission.deleteMany({ roleId: employeeRole._id });
            const employeePermCodes = [
                'dashboard:view',
                'employees:read',
                'tasks:read',
                'attendance:read',
                'attendance:write',
                'notifications:read',
                'chat:read',
                'chat:write',
                'approvals:read',
                'approvals:write',
                'calendar:read',
                'settings:read'
            ];
            const employeeMappings = seededPerms
                .filter((p) => employeePermCodes.includes(p.permissionCode))
                .map((p) => ({
                    roleId: employeeRole._id,
                    permissionId: p._id
                }));
            await RolePermission.insertMany(employeeMappings);
            employeeRole.permissions = employeePermCodes;
            await employeeRole.save();
            console.log('✅ Employee RolePermissions seeded');
        }
    } catch (error) {
        console.error('❌ Error seeding permissions:', error);
    }
};

module.exports = seedPermissions;
