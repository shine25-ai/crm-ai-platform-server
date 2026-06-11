const Permission = require('../modules/permissions/permission.model');

const seedPermissions = async () => {
    try {
        const permissions = [
            { permissionId: 'dashboard:view', name: 'View Dashboard' },
            { permissionId: 'users:read', name: 'Read Users' },
            { permissionId: 'users:write', name: 'Write Users' },
            { permissionId: 'users:delete', name: 'Delete Users' },
            { permissionId: 'roles:read', name: 'Read Roles' },
            { permissionId: 'roles:write', name: 'Write Roles' },
            { permissionId: 'roles:delete', name: 'Delete Roles' },
            { permissionId: 'departments:read', name: 'Read Departments' },
            { permissionId: 'departments:write', name: 'Write Departments' },
            { permissionId: 'departments:delete', name: 'Delete Departments' },
            { permissionId: 'employees:read', name: 'Read Employees' },
            { permissionId: 'employees:write', name: 'Write Employees' },
            { permissionId: 'employees:delete', name: 'Delete Employees' },
            { permissionId: 'leads:read', name: 'Read Leads' },
            { permissionId: 'leads:write', name: 'Write Leads' },
            { permissionId: 'leads:delete', name: 'Delete Leads' },
            { permissionId: 'customers:read', name: 'Read Customers' },
            { permissionId: 'campaigns:read', name: 'Read Campaigns' },
            { permissionId: 'tasks:read', name: 'Read Tasks' },
            { permissionId: 'attendance:read', name: 'Read Attendance' },
            { permissionId: 'gps:read', name: 'Read GPS Tracking' },
            { permissionId: 'reports:read', name: 'Read Reports' },
            { permissionId: 'settings:read', name: 'Read Settings' }
        ];

        for (const perm of permissions) {
            const exists = await Permission.findOne({
                permissionId: perm.permissionId
            });
            if (!exists) {
                await Permission.create(perm);
            }
        }
        console.log('✅ Permissions seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding permissions:', error);
    }
};

module.exports = seedPermissions;
