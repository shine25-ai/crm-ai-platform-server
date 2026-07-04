const expenseService = require('./expense.service');
const ApiResponse = require('../../shared/utils/response');

const listClaims = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Expense claims retrieved successfully',
            await expenseService.listClaims(req.query, req.user)
        );
    } catch (error) {
        next(error);
    }
};

const listMyClaims = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Employee expense claims retrieved successfully',
            await expenseService.listClaims(
                { ...req.query, own: true },
                req.user
            )
        );
    } catch (error) {
        next(error);
    }
};

const getClaim = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Expense claim retrieved successfully',
            await expenseService.getClaimById(req.params.id, req.user)
        );
    } catch (error) {
        next(error);
    }
};

const createClaim = async (req, res, next) => {
    try {
        const claim = await expenseService.createClaim(req.body, req.user);
        if (req.files?.length) {
            await expenseService.addAttachments(claim._id, req.files, req.user);
        }
        const shouldSubmit = String(req.body.submit).toLowerCase() === 'true';
        const result = shouldSubmit
            ? await expenseService.submitClaim(claim._id, req.user)
            : await expenseService.getClaimById(claim._id, req.user);
        return ApiResponse.success(
            res,
            shouldSubmit
                ? 'Expense claim submitted successfully'
                : 'Expense draft created successfully',
            result,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateClaim = async (req, res, next) => {
    try {
        await expenseService.updateClaim(req.params.id, req.body, req.user);
        return ApiResponse.success(
            res,
            'Expense claim updated successfully',
            await expenseService.getClaimById(req.params.id, req.user)
        );
    } catch (error) {
        next(error);
    }
};

const addAttachments = async (req, res, next) => {
    try {
        const attachments = await expenseService.addAttachments(
            req.params.id,
            req.files,
            req.user
        );
        return ApiResponse.success(
            res,
            'Expense receipts uploaded successfully',
            attachments,
            201
        );
    } catch (error) {
        next(error);
    }
};

const deleteAttachment = async (req, res, next) => {
    try {
        await expenseService.deleteAttachment(
            req.params.attachmentId,
            req.user
        );
        return ApiResponse.success(
            res,
            'Expense attachment deleted successfully'
        );
    } catch (error) {
        next(error);
    }
};

const submitClaim = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Expense claim submitted successfully',
            await expenseService.submitClaim(req.params.id, req.user)
        );
    } catch (error) {
        next(error);
    }
};

const reviewClaim = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Expense review saved successfully',
            await expenseService.reviewClaim(req.params.id, req.body, req.user)
        );
    } catch (error) {
        next(error);
    }
};

const cancelClaim = async (req, res, next) => {
    try {
        return ApiResponse.success(
            res,
            'Expense claim cancelled successfully',
            await expenseService.cancelClaim(req.params.id, req.user)
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listClaims,
    listMyClaims,
    getClaim,
    createClaim,
    updateClaim,
    addAttachments,
    deleteAttachment,
    submitClaim,
    reviewClaim,
    cancelClaim
};
