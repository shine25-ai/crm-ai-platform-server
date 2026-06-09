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
    res.json({ message: 'Forgot Password endpoint' });
};

const resetPassword = async (req, res, next) => {
    res.json({ message: 'Reset Password endpoint' });
};

module.exports = {
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword
};
