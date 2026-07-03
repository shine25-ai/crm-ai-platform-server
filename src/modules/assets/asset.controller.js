const assetService = require('./asset.service');
const {
    validateCreateAsset,
    validateUpdateAsset,
    validateAssignAsset,
    validateReturnAsset
} = require('./asset.validation');
const {
    logActivity,
    logAudit
} = require('../../shared/services/audit.service');
const Asset = require('./asset.model');
const Employee = require('../employees/employee.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');

const checkEmployeeAccess = async (req, employeeId) => {
    const role = await Role.findById(req.user.roleId);
    if (role && role.roleCode === 'EMPLOYEE') {
        const emp = await Employee.findOne({ userId: req.user.userId });
        if (!emp || String(emp._id) !== String(employeeId)) {
            throw new AppError('Forbidden: Access is denied', 403);
        }
    }
};

const getAssets = async (req, res, next) => {
    try {
        const assets = await assetService.getAssets(req.query);
        res.status(200).json({
            success: true,
            data: assets
        });
    } catch (error) {
        next(error);
    }
};

const getAssetById = async (req, res, next) => {
    try {
        const result = await assetService.getAssetById(req.params.id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const createAsset = async (req, res, next) => {
    try {
        validateCreateAsset(req.body);
        const asset = await assetService.createAsset(req.body, req.user);

        await logActivity(
            req.user.userId,
            'CREATE',
            'Assets',
            `Created asset "${asset.assetName}" (${asset.assetTag})`,
            req
        );
        await logAudit(
            req.user.userId,
            'Assets',
            'Create',
            null,
            asset.toObject(),
            req
        );

        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            data: asset
        });
    } catch (error) {
        next(error);
    }
};

const updateAsset = async (req, res, next) => {
    try {
        validateUpdateAsset(req.body);
        const oldAsset = await Asset.findById(req.params.id);
        if (!oldAsset) throw new AppError('Asset not found', 404);

        const asset = await assetService.updateAsset(
            req.params.id,
            req.body,
            req.user
        );

        await logActivity(
            req.user.userId,
            'UPDATE',
            'Assets',
            `Updated asset "${asset.assetName}" (${asset.assetTag})`,
            req
        );
        await logAudit(
            req.user.userId,
            'Assets',
            'Update',
            oldAsset.toObject(),
            asset.toObject(),
            req
        );

        res.status(200).json({
            success: true,
            message: 'Asset updated successfully',
            data: asset
        });
    } catch (error) {
        next(error);
    }
};

const deleteAsset = async (req, res, next) => {
    try {
        const oldAsset = await Asset.findById(req.params.id);
        if (!oldAsset) throw new AppError('Asset not found', 404);

        await assetService.deleteAsset(req.params.id, req.user);

        await logActivity(
            req.user.userId,
            'DELETE',
            'Assets',
            `Deleted asset "${oldAsset.assetName}" (${oldAsset.assetTag})`,
            req
        );
        await logAudit(
            req.user.userId,
            'Assets',
            'Delete',
            oldAsset.toObject(),
            null,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Asset deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

const getEmployeeAssets = async (req, res, next) => {
    try {
        await checkEmployeeAccess(req, req.params.employeeId);
        const assets = await assetService.getEmployeeAssets(
            req.params.employeeId
        );
        res.status(200).json({
            success: true,
            data: assets
        });
    } catch (error) {
        next(error);
    }
};

const assignAsset = async (req, res, next) => {
    try {
        validateAssignAsset(req.body);
        const assignment = await assetService.assignAsset(
            req.params.employeeId,
            req.body,
            req.user
        );

        const asset = await Asset.findById(req.body.assetId);
        const employee = await Employee.findById(req.params.employeeId);

        await logActivity(
            req.user.userId,
            'ASSIGN_ASSET',
            'Assets',
            `Assigned asset "${asset?.assetName}" (${asset?.assetTag}) to employee "${employee?.name}"`,
            req
        );

        res.status(201).json({
            success: true,
            message: 'Asset assigned successfully',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

const updateAssetAssignment = async (req, res, next) => {
    try {
        const assignment = await assetService.updateAssetAssignment(
            req.params.employeeId,
            req.params.assignmentId,
            req.body,
            req.user
        );
        res.status(200).json({
            success: true,
            message: 'Asset assignment updated successfully',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

const returnAsset = async (req, res, next) => {
    try {
        validateReturnAsset(req.body);
        const assignment = await assetService.returnAsset(
            req.params.employeeId,
            req.params.assignmentId,
            req.body,
            req.user
        );

        const asset = await Asset.findById(assignment.assetId);
        const employee = await Employee.findById(req.params.employeeId);

        await logActivity(
            req.user.userId,
            'RETURN_ASSET',
            'Assets',
            `Returned asset "${asset?.assetName}" (${asset?.assetTag}) from employee "${employee?.name}". Status: ${req.body.status || 'Returned'}`,
            req
        );

        res.status(200).json({
            success: true,
            message: 'Asset return processed successfully',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

const getEmployeeAssetHistory = async (req, res, next) => {
    try {
        await checkEmployeeAccess(req, req.params.employeeId);
        const history = await assetService.getEmployeeAssetHistory(
            req.params.employeeId
        );
        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

const getAssetHistory = async (req, res, next) => {
    try {
        const history = await assetService.getAssetHistory(req.params.id);
        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        next(error);
    }
};

const reportAssetIssue = async (req, res, next) => {
    try {
        await checkEmployeeAccess(req, req.params.employeeId);
        if (!req.body.remarks) {
            throw new AppError('Issue description (remarks) is required', 400);
        }
        const assignment = await assetService.reportAssetIssue(
            req.params.employeeId,
            req.params.assignmentId,
            req.body,
            req.user
        );
        res.status(200).json({
            success: true,
            message: 'Issue reported successfully',
            data: assignment
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    getEmployeeAssets,
    assignAsset,
    updateAssetAssignment,
    returnAsset,
    reportAssetIssue,
    getEmployeeAssetHistory,
    getAssetHistory
};
