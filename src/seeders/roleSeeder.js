const Role = require('../modules/roles/role.model');

const roleSeeder = async () => {
    const roles = [
        {
            roleCode: 'SUPER_ADMIN',
            roleName: 'Super Admin',
            isSystemRole: true,
            permissions: ['*']
        },
        {
            roleCode: 'ADMIN',
            roleName: 'Admin',
            isSystemRole: true,
            permissions: [
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
                'attendance:read',
                'settings:read'
            ]
        },
        {
            roleCode: 'HR',
            roleName: 'HR',
            isSystemRole: true,
            description:
                'Human resources access for employees, onboarding, attendance, tasks, approvals, calendar, chat, and notifications',
            permissions: [
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
            ]
        },
        {
            roleCode: 'HR',
            roleName: 'HR',
            isSystemRole: true,
            description:
                'Human resources access for employees, onboarding, attendance, tasks, approvals, calendar, chat, and notifications',
            permissions: [
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
            ]
        },
        {
            roleCode: 'EMPLOYEE',
            roleName: 'Employee',
            isSystemRole: true,
            description: 'Standard employee access to employee portal only',
            permissions: [
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
                'calendar:read',
                'attendance:write',
                'notifications:read',
                'chat:read',
                'chat:write',
                'approvals:read',
                'approvals:write',
                'calendar:read',
                'settings:read'
            ]
        }
    ];

    for (const role of roles) {
        const exists = await Role.findOne({
            roleCode: role.roleCode
        });

        if (!exists) {
            await Role.create({ ...role, status: 'Active' });
            console.log(`${role.roleName} created`);
        } else {
            exists.roleName = role.roleName;
            exists.isSystemRole = role.isSystemRole;
            exists.permissions = role.permissions;
            exists.status =
                exists.status === 'Inactive' ? 'Inactive' : 'Active';
            if (role.description) exists.description = role.description;
            await exists.save();
        }
    }
};

module.exports = roleSeeder;
