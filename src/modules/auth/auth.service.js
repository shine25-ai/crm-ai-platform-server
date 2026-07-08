const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../users/user.model');
const Role = require('../roles/role.model');
const RolePermission = require('../permissions/rolePermission.model');
const Employee = require('../employees/employee.model');
const AppError = require('../../shared/utils/appError');
const { generateToken } = require('../../shared/utils/jwt');
const emailService = require('../../shared/services/email.service');
const logger = require('../../shared/utils/logger');

const PROVIDER_CONFIG = {
    google: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
        scope: 'openid email profile',
        clientIdEnv: 'GOOGLE_CLIENT_ID',
        clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
        redirectUriEnv: 'GOOGLE_REDIRECT_URI'
    },
    microsoft: {
        authorizationUrl: () =>
            `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/authorize`,
        tokenUrl: () =>
            `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`,
        jwksUrl: () =>
            `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/discovery/v2.0/keys`,
        scope: 'openid email profile User.Read',
        clientIdEnv: 'MICROSOFT_CLIENT_ID',
        clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
        redirectUriEnv: 'MICROSOFT_REDIRECT_URI'
    }
};

const getFrontendUrl = () =>
    (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

const getBackendUrl = () =>
    (
        process.env.BACKEND_URL ||
        process.env.API_BASE_URL ||
        'http://localhost:5050'
    ).replace(/\/$/, '');

const getProviderConfig = (provider) => {
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
        throw new AppError('Unsupported login provider.', 400);
    }
    return config;
};

const getProviderRuntimeConfig = (provider) => {
    const config = getProviderConfig(provider);
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    const redirectUri =
        process.env[config.redirectUriEnv] ||
        `${getBackendUrl()}/api/auth/oauth/${provider}/callback`;

    if (!clientId || !clientSecret) {
        throw new AppError(
            `${provider} login is not configured by an administrator.`,
            503
        );
    }

    return {
        ...config,
        authorizationUrl:
            typeof config.authorizationUrl === 'function'
                ? config.authorizationUrl()
                : config.authorizationUrl,
        tokenUrl:
            typeof config.tokenUrl === 'function'
                ? config.tokenUrl()
                : config.tokenUrl,
        jwksUrl:
            typeof config.jwksUrl === 'function'
                ? config.jwksUrl()
                : config.jwksUrl,
        clientId,
        clientSecret,
        redirectUri
    };
};

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');

const signState = (provider) => {
    const payload = base64UrlEncode(
        JSON.stringify({
            provider,
            createdAt: Date.now()
        })
    );
    const signature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'crm-ai-oauth-state')
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
};

const verifyState = (provider, state) => {
    if (!state || !state.includes('.')) return false;

    const [payload, signature] = state.split('.');
    const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'crm-ai-oauth-state')
        .update(payload)
        .digest('base64url');

    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);
    if (
        signatureBuffer.length !== expectedSignatureBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
        return false;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const stateAgeMs = Date.now() - Number(decoded.createdAt || 0);
    return decoded.provider === provider && stateAgeMs < 10 * 60 * 1000;
};

const decodeJwtPart = (value) =>
    JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new AppError(
            data.error_description ||
                data.error ||
                'OAuth provider request failed.',
            502
        );
    }

    return data;
};

const verifyIdToken = async (provider, idToken, runtimeConfig) => {
    const [headerPart, payloadPart, signaturePart] = idToken.split('.');
    if (!headerPart || !payloadPart || !signaturePart) {
        throw new AppError('Invalid identity token received.', 401);
    }

    const header = decodeJwtPart(headerPart);
    const payload = decodeJwtPart(payloadPart);
    const jwks = await fetchJson(runtimeConfig.jwksUrl);
    const jwk = (jwks.keys || []).find((key) => key.kid === header.kid);

    if (!jwk) {
        throw new AppError('Unable to verify identity token.', 401);
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerPart}.${payloadPart}`);
    verifier.end();

    const isValidSignature = verifier.verify(
        crypto.createPublicKey({ key: jwk, format: 'jwk' }),
        signaturePart,
        'base64url'
    );

    if (!isValidSignature) {
        throw new AppError('Invalid identity token signature.', 401);
    }

    if (payload.aud !== runtimeConfig.clientId) {
        throw new AppError('Identity token audience mismatch.', 401);
    }

    if (Number(payload.exp || 0) * 1000 < Date.now()) {
        throw new AppError('Identity token has expired.', 401);
    }

    if (
        provider === 'google' &&
        !['accounts.google.com', 'https://accounts.google.com'].includes(
            payload.iss
        )
    ) {
        throw new AppError('Invalid Google identity token issuer.', 401);
    }

    if (
        provider === 'microsoft' &&
        !String(payload.iss || '').startsWith(
            'https://login.microsoftonline.com/'
        )
    ) {
        throw new AppError('Invalid Microsoft identity token issuer.', 401);
    }

    return payload;
};

const buildAuthResult = async (user) => {
    const token = generateToken({
        userId: user._id,
        roleId: user.roleId._id,
        roleCode: user.roleId.roleCode,
        employeeId: user.employeeId || null
    });

    const permissions = await getRolePermissions(user.roleId);

    return {
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            roleCode: user.roleId.roleCode,
            roleName: user.roleId.roleName,
            permissions,
            employeeId: user.employeeId || null
        }
    };
};

const getOAuthAuthorizationUrl = (provider) => {
    const runtimeConfig = getProviderRuntimeConfig(provider);
    const params = new URLSearchParams({
        client_id: runtimeConfig.clientId,
        redirect_uri: runtimeConfig.redirectUri,
        response_type: 'code',
        scope: runtimeConfig.scope,
        state: signState(provider),
        prompt: 'select_account'
    });

    return `${runtimeConfig.authorizationUrl}?${params.toString()}`;
};

const completeOAuthLogin = async (provider, { code, state }) => {
    if (!code) {
        throw new AppError('Authorization code is required.', 400);
    }

    if (!verifyState(provider, state)) {
        throw new AppError('Invalid or expired login state.', 400);
    }

    const runtimeConfig = getProviderRuntimeConfig(provider);
    const tokenResponse = await fetchJson(runtimeConfig.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: runtimeConfig.clientId,
            client_secret: runtimeConfig.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: runtimeConfig.redirectUri
        })
    });

    if (!tokenResponse.id_token) {
        throw new AppError('Identity token was not returned by provider.', 502);
    }

    const profile = await verifyIdToken(
        provider,
        tokenResponse.id_token,
        runtimeConfig
    );

    if (provider === 'google' && profile.email_verified === false) {
        throw new AppError('Google account email is not verified.', 401);
    }

    const email = String(
        profile.email || profile.preferred_username || profile.upn || ''
    )
        .trim()
        .toLowerCase();

    if (!email) {
        throw new AppError('Provider did not return an email address.', 401);
    }

    const user = await User.findOne({ email }).populate('roleId');
    if (!user) {
        throw new AppError(
            'No CRM user exists for this email. Please contact your administrator.',
            403
        );
    }

    if (user.status === 'Inactive' || user.status === 'INACTIVE') {
        throw new AppError(
            'Your account setup is complete and pending HR activation.',
            403
        );
    }

    return buildAuthResult(user);
};

const getRolePermissions = async (role) => {
    if (!role) return [];
    if (role.roleCode === 'SUPER_ADMIN') return ['*'];
    if ((role.permissions || []).includes('*')) return ['*'];

    const mappings = await RolePermission.find({ roleId: role._id }).populate(
        'permissionId',
        'permissionCode'
    );
    const mappedPermissions = mappings
        .map((mapping) => mapping.permissionId?.permissionCode)
        .filter(Boolean);

    return [...new Set([...(role.permissions || []), ...mappedPermissions])];
};

const login = async (email, password) => {
    const user = await User.findOne({ email }).populate('roleId');

    if (!user) {
        throw new AppError('Invalid credentials', 401);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new AppError('Invalid credentials', 401);
    }

    if (user.status === 'Inactive' || user.status === 'INACTIVE') {
        throw new AppError(
            'Your account setup is complete and pending HR activation.',
            403
        );
    }

    const token = generateToken({
        userId: user._id,
        roleId: user.roleId._id,
        roleCode: user.roleId.roleCode,
        employeeId: user.employeeId || null
    });

    const permissions = await getRolePermissions(user.roleId);

    return {
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            roleCode: user.roleId.roleCode,
            roleName: user.roleId.roleName,
            permissions,
            employeeId: user.employeeId || null
        }
    };
};

const forgotPassword = async (email) => {
    const normalizedEmail = String(email || '')
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
        throw new AppError('Email is required.', 400);
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
        throw new AppError('User with this email does not exist.', 404);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const frontendUrl = (
        process.env.FRONTEND_URL || 'http://localhost:5173'
    ).replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
        const info = await emailService.sendPasswordResetEmail(
            user.email,
            resetUrl
        );
        logger.info(
            `[Auth Service] Password reset requested for ${user.email}. Message ID: ${info.messageId}`
        );
        return true;
    } catch (error) {
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        logger.error(
            `[Auth Service] Password reset email delivery failed for ${user.email}: ${error.message}`
        );
        throw new AppError(
            'Unable to send password reset email. Please contact support or try again later.',
            502
        );
    }
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

/**
 * Validate an onboarding token and return employee preview info.
 * Called when the employee lands on /onboarding?token=...
 */
const verifyOnboardingToken = async (token) => {
    const employee = await Employee.findOne({
        onboardingToken: token,
        onboardingTokenExpires: { $gt: new Date() }
    }).populate('department', 'departmentName');

    if (!employee) {
        throw new AppError(
            'This onboarding link is invalid or has expired. Please contact your administrator.',
            400
        );
    }

    if (employee.onboardingStatus === 'Completed') {
        throw new AppError(
            'Your account has already been set up. Please login directly.',
            400
        );
    }

    return {
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        department: employee.department?.departmentName || '',
        designation: employee.designation
    };
};

/**
 * Complete the onboarding process:
 * 1. Validate token
 * 2. Create a User account with EMPLOYEE role
 * 3. Update Employee record — link User, mark Completed, save personalInfo
 * 4. Clear onboarding token
 */
const completeOnboarding = async (
    token,
    password,
    personalInfo,
    bankDetails
) => {
    const employee = await Employee.findOne({
        onboardingToken: token,
        onboardingTokenExpires: { $gt: new Date() }
    }).populate('department', 'departmentName');

    if (!employee) {
        throw new AppError(
            'This onboarding link is invalid or has expired.',
            400
        );
    }

    if (employee.onboardingStatus === 'Completed') {
        throw new AppError('Onboarding already completed. Please login.', 400);
    }

    // Check if User already exists for this email
    const existingUser = await User.findOne({ email: employee.email });
    if (existingUser) {
        throw new AppError('An account with this email already exists.', 400);
    }

    // Get EMPLOYEE role
    const employeeRole = await Role.findOne({ roleCode: 'EMPLOYEE' });
    if (!employeeRole) {
        throw new AppError(
            'Employee role not configured. Contact system administrator.',
            500
        );
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: employee.name,
        email: employee.email,
        password: hashedPassword,
        roleId: employeeRole._id,
        employeeId: employee._id,
        mobile: employee.mobile,
        department: employee.department?.departmentName || '',
        status: 'Inactive'
    });

    // Update employee record
    employee.onboardingStatus = 'Completed';
    employee.userId = user._id;
    employee.onboardingToken = null;
    employee.onboardingTokenExpires = null;

    // Save personal info if provided
    if (personalInfo) {
        employee.personalInfo = {
            ...employee.personalInfo,
            ...personalInfo
        };
    }

    if (bankDetails) {
        employee.bankDetails = {
            ...employee.bankDetails,
            ...bankDetails
        };
    }

    const hasHrActivationData = Boolean(
        employee.employmentInfo?.joinDate && employee.employmentInfo?.salary
    );
    employee.status = hasHrActivationData ? 'Active' : 'Inactive';
    user.status = employee.status;
    await user.save();

    await employee.save();

    // Notify HR, Admin, and Super Admin about the completed onboarding (non-blocking)
    try {
        const notifyRoleCodes = ['HR', 'ADMIN', 'SUPER_ADMIN'];
        const notifyRoles = await Role.find({
            roleCode: { $in: notifyRoleCodes }
        }).select('_id');
        const notifyRoleIds = notifyRoles.map((r) => r._id);

        const notifyUsers = await User.find({
            roleId: { $in: notifyRoleIds },
            status: 'Active'
        }).select('email');

        const recipientEmails = notifyUsers.map((u) => u.email).filter(Boolean);

        if (recipientEmails.length > 0) {
            emailService
                .sendOnboardingCompletionNotification(recipientEmails, {
                    name: employee.name,
                    employeeId: employee.employeeId,
                    email: employee.email,
                    department: employee.department?.departmentName || '',
                    designation: employee.designation,
                    mobile: employee.mobile
                })
                .catch((err) => {
                    // Silently log — must not affect onboarding response
                    console.error(
                        '[Auth Service] Failed to send HR notification email:',
                        err.message
                    );
                });
        }
    } catch (notifyErr) {
        console.error(
            '[Auth Service] Could not fetch HR/Admin recipients for notification:',
            notifyErr.message
        );
    }

    return {
        message:
            'Account setup complete. Your access will be activated after HR completes joining details.',
        email: employee.email
    };
};

module.exports = {
    login,
    getOAuthAuthorizationUrl,
    completeOAuthLogin,
    forgotPassword,
    resetPassword,
    verifyOnboardingToken,
    completeOnboarding
};
