require('../config/env');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const { Company, Plan, Subscription } = require('../modules/saas/saas.model');
const saasService = require('../modules/saas/saas.service');

const DEFAULT_PASSWORD = 'Tenant@123';

const demoTenants = [
    {
        companyName: 'Acme Sales CRM',
        legalName: 'Acme Sales CRM Pvt Ltd',
        domain: 'acme.demo.local',
        subdomain: 'acme',
        planName: 'Worthy',
        owner: {
            name: 'Acme Tenant Admin',
            email: 'acme.admin@demo-crm.com'
        },
        billingContact: {
            name: 'Acme Billing',
            email: 'billing.acme@demo-crm.com',
            phone: '+91 90000 10001'
        }
    },
    {
        companyName: 'Nova HR Solutions',
        legalName: 'Nova HR Solutions Pvt Ltd',
        domain: 'nova.demo.local',
        subdomain: 'nova',
        planName: 'Starter',
        owner: {
            name: 'Nova Tenant Admin',
            email: 'nova.admin@demo-crm.com'
        },
        billingContact: {
            name: 'Nova Billing',
            email: 'billing.nova@demo-crm.com',
            phone: '+91 90000 10002'
        }
    },
    {
        companyName: 'Horizon Projects',
        legalName: 'Horizon Projects Pvt Ltd',
        domain: 'horizon.demo.local',
        subdomain: 'horizon',
        planName: 'Growth',
        owner: {
            name: 'Horizon Tenant Admin',
            email: 'horizon.admin@demo-crm.com'
        },
        billingContact: {
            name: 'Horizon Billing',
            email: 'billing.horizon@demo-crm.com',
            phone: '+91 90000 10003'
        }
    },
    {
        companyName: 'Pixel Enterprise CRM',
        legalName: 'Pixel Enterprise CRM Pvt Ltd',
        domain: 'pixel.demo.local',
        subdomain: 'pixel',
        planName: 'Enterprise',
        owner: {
            name: 'Pixel Tenant Admin',
            email: 'pixel.admin@demo-crm.com'
        },
        billingContact: {
            name: 'Pixel Billing',
            email: 'billing.pixel@demo-crm.com',
            phone: '+91 90000 10004'
        }
    }
];

const seedDemoTenants = async () => {
    const adminRole = await Role.findOne({ roleCode: 'ADMIN' });
    if (!adminRole) {
        throw new Error(
            'ADMIN role is missing. Run role/permission seeders first.'
        );
    }

    const activePlans = await Plan.find({ status: 'active' }).sort({
        sortOrder: 1,
        price: 1
    });
    if (!activePlans.length) {
        throw new Error('No active SaaS plans found. Run phase7Seeder first.');
    }

    const fallbackPlan = activePlans[0];
    const created = [];

    for (const tenant of demoTenants) {
        const plan =
            activePlans.find((item) => item.name === tenant.planName) ||
            fallbackPlan;

        let company = await Company.findOne({
            $or: [{ domain: tenant.domain }, { subdomain: tenant.subdomain }]
        });

        if (!company) {
            company = await Company.create({
                companyName: tenant.companyName,
                legalName: tenant.legalName,
                domain: tenant.domain,
                subdomain: tenant.subdomain,
                status: 'active',
                timezone: 'Asia/Calcutta',
                locale: 'en-IN',
                currency: plan.currency || 'INR',
                billingContact: tenant.billingContact,
                featureSettings: plan.featureFlags || {}
            });
        } else {
            company.companyName = tenant.companyName;
            company.legalName = tenant.legalName;
            company.status = 'active';
            company.billingContact = tenant.billingContact;
            company.featureSettings = plan.featureFlags || {};
            await company.save();
        }

        const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        let owner = await User.findOne({ email: tenant.owner.email });

        if (!owner) {
            owner = await User.create({
                name: tenant.owner.name,
                email: tenant.owner.email,
                password: passwordHash,
                roleId: adminRole._id,
                companyId: company._id,
                tenantId: company._id,
                status: 'Active'
            });
        } else {
            owner.name = tenant.owner.name;
            owner.password = passwordHash;
            owner.roleId = adminRole._id;
            owner.companyId = company._id;
            owner.tenantId = company._id;
            owner.status = 'Active';
            await owner.save();
        }

        company.ownerUser = owner._id;
        await company.save();
        await User.collection.updateOne(
            { email: tenant.owner.email },
            {
                $set: {
                    companyId: company._id,
                    tenantId: company._id,
                    roleId: adminRole._id,
                    status: 'Active'
                }
            }
        );

        const currentSubscription = await Subscription.findOne({
            companyId: company._id,
            status: { $in: ['trialing', 'active', 'past_due'] }
        })
            .sort({ createdAt: -1 })
            .populate('planId');

        if (
            String(currentSubscription?.planId?._id || '') !== String(plan._id)
        ) {
            await saasService.activateDemoCheckout({
                companyId: company._id,
                planId: plan._id,
                userId: owner._id
            });
        }

        created.push({
            company: tenant.companyName,
            domain: tenant.domain,
            plan: plan.name,
            email: tenant.owner.email,
            password: DEFAULT_PASSWORD
        });
    }

    return created;
};

if (require.main === module) {
    (async () => {
        try {
            await connectDB();
            const created = await seedDemoTenants();
            console.log('\n✅ Demo SaaS tenants are ready\n');
            console.table(created);
        } catch (error) {
            console.error('❌ Demo tenant seeding failed:', error);
            process.exitCode = 1;
        } finally {
            await mongoose.connection.close();
        }
    })();
}

module.exports = seedDemoTenants;
