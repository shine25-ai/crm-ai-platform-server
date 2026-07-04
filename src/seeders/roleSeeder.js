const Role = require('../modules/roles/role.model');

const roleDefinitions = [
    {
        roleCode: 'SUPER_ADMIN',
        roleName: 'Super Admin',
        isSystemRole: true,
        description: 'Unrestricted developer configuration access'
    },
    {
        roleCode: 'ADMIN',
        roleName: 'Admin',
        isSystemRole: true,
        description:
            'Administrator operational configuration and user management access'
    },
    {
        roleCode: 'HR',
        roleName: 'HR',
        isSystemRole: true,
        description:
            'Human Resources personnel management, payroll, leave, and assets allocation'
    },
    {
        roleCode: 'HR_MANAGER',
        roleName: 'HR Manager',
        isSystemRole: true,
        description:
            'Human Resources department manager overseeing operations and approvals'
    },
    {
        roleCode: 'SALES_DIRECTOR',
        roleName: 'Sales Director',
        isSystemRole: true,
        description:
            'Executive head of sales pipeline, commissions, and revenue operations'
    },
    {
        roleCode: 'SALES_MANAGER',
        roleName: 'Sales Manager',
        isSystemRole: true,
        description:
            'Lead assigner, team performance coordinator, and conversion supervisor'
    },
    {
        roleCode: 'SALES_EXECUTIVE',
        roleName: 'Sales Executive',
        isSystemRole: true,
        description:
            'Client relationship representative managing assigned pipeline leads'
    },
    {
        roleCode: 'BUSINESS_DEVELOPMENT_EXECUTIVE',
        roleName: 'Business Development Executive',
        isSystemRole: true,
        description:
            'Field marketing representative generating initial pipeline prospects'
    },
    {
        roleCode: 'CUSTOMER_SUPPORT_EXECUTIVE',
        roleName: 'Customer Support Executive',
        isSystemRole: true,
        description:
            'Helpdesk support specialist managing client support tasks and correspondence'
    },
    {
        roleCode: 'TEAM_MANAGER',
        roleName: 'Team Manager',
        isSystemRole: true,
        description:
            'Line manager overseeing operational tasks and team approvals'
    },
    {
        roleCode: 'FINANCE_MANAGER',
        roleName: 'Finance Manager',
        isSystemRole: true,
        description:
            'Financial accountant managing payroll totals, invoices, and sales audits'
    },
    {
        roleCode: 'PROCUREMENT_ASSET_MANAGER',
        roleName: 'Procurement & Asset Manager',
        isSystemRole: true,
        description:
            'Logistics coordinator managing hardware purchases, inventory, and lifecycle'
    },
    {
        roleCode: 'PROJECT_MANAGER',
        roleName: 'Project Manager',
        isSystemRole: true,
        description:
            'Workplace planner overseeing milestone deliverables, assignments, and tasks'
    },
    {
        roleCode: 'EMPLOYEE',
        roleName: 'Employee',
        isSystemRole: true,
        description: 'Standard organization worker with employee portal access'
    },
    {
        roleCode: 'CLIENT_PORTAL_USER',
        roleName: 'Client Portal User',
        isSystemRole: true,
        description:
            'External customer portal representative tracking tickets and chat updates'
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
