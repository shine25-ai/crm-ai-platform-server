const bcrypt = require('bcryptjs');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');

const createDefaultAdmin = async () => {
    try {
        const superAdminRole = await Role.findOne({ roleCode: 'SUPER_ADMIN' });
        if (!superAdminRole) {
            console.log(
                '⚠️ Super Admin role not found. Ensure roleSeeder runs first.'
            );
            return;
        }

        const existingAdmin = await User.findOne({
            email: process.env.DEFAULT_ADMIN_EMAIL
        });

        if (existingAdmin) {
            if (
                !existingAdmin.roleId ||
                existingAdmin.roleId.toString() !==
                    superAdminRole._id.toString()
            ) {
                existingAdmin.roleId = superAdminRole._id;
                await existingAdmin.save();
                console.log('✅ Default admin roleId updated successfully');
            } else {
                console.log('✅ Default admin already exists');
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(
            process.env.DEFAULT_ADMIN_PASSWORD,
            10
        );

        await User.create({
            name: process.env.DEFAULT_ADMIN_NAME,
            email: process.env.DEFAULT_ADMIN_EMAIL,
            password: hashedPassword,
            roleId: superAdminRole._id,
            status: 'ACTIVE'
        });

        console.log('✅ Default admin created successfully');
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
};

module.exports = createDefaultAdmin;
