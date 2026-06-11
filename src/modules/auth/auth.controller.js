const authService = require('./auth.service');
const ApiResponse = require('../../shared/utils/response');

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.login(email, password);

        return ApiResponse.success(res, 'Login successful', result);
    } catch (error) {
        next(error);
    }
};

const refreshToken = async (req, res, next) => {
    res.json({ message: 'Refresh Token endpoint' });
};

const logout = async (req, res, next) => {
    res.json({ message: 'Logout endpoint' });
};

const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        await authService.forgotPassword(email);

        return ApiResponse.success(
            res,
            'Password reset link sent to your email.'
        );
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;

        await authService.resetPassword(token, password);

        return ApiResponse.success(
            res,
            'Password reset successful. You can now login with your new password.'
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
};
