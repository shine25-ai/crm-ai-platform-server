const Role = require('../modules/roles/role.model');

const roleDefinitions = [
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
            'sales:read',
            'sales:write',
            'communications:read',
            'communications:write',
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
            'settings:read'
        ]
    },
    {
        roleCode: 'SALES_MANAGER',
        roleName: 'Sales Manager',
        isSystemRole: true,
        description:
            'Sales team manager with lead assignment and conversion access',
        permissions: [
            'dashboard:view',
            'users:read',
            'leads:read',
            'leads:write',
            'leads:assign',
            'leads:convert',
            'customers:read',
            'customers:write',
            'communications:read',
            'communications:write',
            'notifications:read',
            'notifications:write',
            'chat:read',
            'chat:write',
            'settings:read'
        ]
    },
    {
        roleCode: 'SALES_EXECUTIVE',
        roleName: 'Sales Executive',
        isSystemRole: true,
        description:
            'Sales representative to create, view and update assigned leads',
        permissions: [
            'dashboard:view',
            'leads:read',
            'leads:write',
            'customers:read',
            'communications:read',
            'communications:write',
            'notifications:read',
            'chat:read',
            'chat:write'
        ]
    }
];

const roleSeeder = async () => {
    for (const role of roleDefinitions) {
        const exists = await Role.findOne({ roleCode: role.roleCode });

        if (!exists) {
            await Role.create({ ...role, status: 'Active' });
            console.log(`${role.roleName} created`);
            continue;
        }

        exists.roleName = role.roleName;
        exists.isSystemRole = role.isSystemRole;
        exists.permissions = role.permissions;
        exists.status = exists.status === 'Inactive' ? 'Inactive' : 'Active';
        exists.description = role.description || exists.description;
        await exists.save();
    }
};

module.exports = roleSeeder;
