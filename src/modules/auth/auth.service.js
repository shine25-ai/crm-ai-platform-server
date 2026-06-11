const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const { generateToken } = require('../../shared/utils/jwt');
const emailService = require('../../shared/services/email.service');

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

const forgotPassword = async (email) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new AppError('User with this email does not exist.', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(user.email, resetUrl);

    return true;
};

const resetPassword = async (token, password) => {
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new AppError(
            'Password reset token is invalid or has expired.',
            400
        );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return true;
};

module.exports = {
    login,
    forgotPassword,
    resetPassword
};
