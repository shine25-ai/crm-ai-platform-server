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

/**
 * GET /api/auth/verify-onboarding?token=xxx
 * Returns employee preview info if token is valid.
 */
const verifyOnboarding = async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res
                .status(400)
                .json({ success: false, message: 'Token is required' });
        }
        const data = await authService.verifyOnboardingToken(token);
        return ApiResponse.success(res, 'Token valid', data);
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/complete-onboarding
 * Body: { token, password, personalInfo }
 */
const completeOnboarding = async (req, res, next) => {
    try {
        const { token, password, personalInfo } = req.body;
        if (!token || !password) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: 'Token and password are required'
                });
        }
        const result = await authService.completeOnboarding(
            token,
            password,
            personalInfo
        );
        return ApiResponse.success(res, result.message, result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    verifyOnboarding,
    completeOnboarding
};
