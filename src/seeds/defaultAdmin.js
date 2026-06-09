const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createDefaultAdmin = async () => {
    try {
        const existingAdmin = await User.findOne({
            email: process.env.DEFAULT_ADMIN_EMAIL
        });

        if (existingAdmin) {
            console.log('✅ Default admin already exists');
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
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        });

        console.log('✅ Default admin created successfully');
    } catch (error) {
        console.error('❌ Error creating default admin:', error);
    }
};

module.exports = createDefaultAdmin;
