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
            roleCode: 'EMPLOYEE',
            roleName: 'Employee',
            isSystemRole: true,
            description: 'Standard employee access to employee portal only',
            permissions: [
                'dashboard:view',
                'employees:read',
                'attendance:read',
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
