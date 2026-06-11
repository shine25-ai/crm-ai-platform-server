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
                'employee.view',
                'employee.create',
                'employee.update',
                'employee.delete'
            ]
        },
        {
            roleCode: 'EMPLOYEE',
            roleName: 'Employee',
            isSystemRole: true,
            description: 'Standard employee — access to employee portal only',
            permissions: [
                'employee.view.self',
                'attendance.view.self',
                'profile.update.self'
            ]
        }
    ];

    for (const role of roles) {
        const exists = await Role.findOne({
            roleCode: role.roleCode
        });

        if (!exists) {
            await Role.create(role);
            console.log(`${role.roleName} created`);
        }
    }
};

module.exports = roleSeeder;
