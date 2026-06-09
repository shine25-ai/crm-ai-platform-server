const bcrypt = require('bcryptjs');

const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const { generateToken } = require('../../shared/utils/jwt');

const login = async (email, password) => {
    const user = await User.findOne({
        email
    }).populate('roleId');

    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken({
        userId: user._id,
        roleId: user.roleId._id,
        roleCode: user.roleId.roleCode
    });

    return {
        token,
        user
    };
};

module.exports = {
    login
};
