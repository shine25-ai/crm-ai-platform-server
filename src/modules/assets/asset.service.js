const mongoose = require('mongoose');
const Asset = require('./asset.model');
const EmployeeAsset = require('./employeeAsset.model');
const AssetAssignmentHistory = require('./assetAssignmentHistory.model');
const Employee = require('../employees/employee.model');
const User = require('../users/user.model');
const Role = require('../roles/role.model');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');

const getAssets = async (query = {}) => {
    const { search, category, status } = query;
    const filter = {};

    if (search) {
        filter.$or = [
            { assetName: { $regex: search, $options: 'i' } },
            { assetTag: { $regex: search, $options: 'i' } },
            { serialNumber: { $regex: search, $options: 'i' } }
        ];
    }
    if (category) {
        filter.assetCategory = category;
    }
    if (status) {
        filter.currentStatus = status;
    }

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, parseInt(query.limit) || 10);
    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
        Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Asset.countDocuments(filter)
    ]);

    return {
        assets,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};

const getAssetById = async (id) => {
    const asset = await Asset.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);

    // Get current assignment
    const currentAssignment = await EmployeeAsset.findOne({
        assetId: id,
        status: 'Assigned'
    }).populate('employeeId', 'name employeeId email designation');

    return {
        asset,
        currentAssignment
    };
};

const createAsset = async (data, user) => {
    // Check uniqueness of assetTag and serialNumber
    const existingTag = await Asset.findOne({ assetTag: data.assetTag });
    if (existingTag) throw new AppError('Asset Tag must be unique', 400);

    const existingSerial = await Asset.findOne({
        serialNumber: data.serialNumber
    });
    if (existingSerial) throw new AppError('Serial Number must be unique', 400);

    const asset = await Asset.create({
        assetName: data.assetName.trim(),
        assetCategory: data.assetCategory.trim(),
        assetTag: data.assetTag.trim(),
        serialNumber: data.serialNumber.trim(),
        model: data.model || '',
        brand: data.brand || '',
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry
            ? new Date(data.warrantyExpiry)
            : null,
        currentStatus: 'Available'
    });

    return asset;
};

const updateAsset = async (id, data, user) => {
    const asset = await Asset.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);

    if (data.assetTag && data.assetTag !== asset.assetTag) {
        const existingTag = await Asset.findOne({ assetTag: data.assetTag });
        if (existingTag) throw new AppError('Asset Tag must be unique', 400);
        asset.assetTag = data.assetTag;
    }

    if (data.serialNumber && data.serialNumber !== asset.serialNumber) {
        const existingSerial = await Asset.findOne({
            serialNumber: data.serialNumber
        });
        if (existingSerial)
            throw new AppError('Serial Number must be unique', 400);
        asset.serialNumber = data.serialNumber;
    }

    const fields = [
        'assetName',
        'assetCategory',
        'model',
        'brand',
        'purchaseDate',
        'warrantyExpiry'
    ];
    fields.forEach((f) => {
        if (data[f] !== undefined) asset[f] = data[f];
    });

    // Special status transition for available/repair
    if (data.currentStatus && data.currentStatus !== asset.currentStatus) {
        asset.currentStatus = data.currentStatus;

        // If changed to Available, we might also want to ensure no active assignments
        if (data.currentStatus === 'Available') {
            await EmployeeAsset.updateMany(
                { assetId: id, status: 'Assigned' },
                { status: 'Returned', actualReturnDate: new Date() }
            );
        }
    }

    await asset.save();
    return asset;
};

const deleteAsset = async (id, user) => {
    const asset = await Asset.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);

    // Prevent deletion if currently assigned
    if (asset.currentStatus === 'Assigned') {
        throw new AppError(
            'Cannot delete asset while it is assigned to an employee',
            400
        );
    }

    await Asset.findByIdAndDelete(id);
    // Remove employee assignments for this asset
    await EmployeeAsset.deleteMany({ assetId: id });
    await AssetAssignmentHistory.deleteMany({ assetId: id });
    return true;
};

const getEmployeeAssets = async (employeeId) => {
    return EmployeeAsset.find({ employeeId, status: 'Assigned' }).populate(
        'assetId'
    );
};

const assignAsset = async (employeeId, data, user) => {
    const asset = await Asset.findById(data.assetId);
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.currentStatus !== 'Available') {
        throw new AppError(
            `Asset is not available for assignment (Current status: ${asset.currentStatus})`,
            400
        );
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new AppError('Employee not found', 404);

    // Create assignment
    const assignment = await EmployeeAsset.create({
        employeeId,
        assetId: data.assetId,
        assignedDate: data.assignedDate
            ? new Date(data.assignedDate)
            : new Date(),
        expectedReturnDate: data.expectedReturnDate
            ? new Date(data.expectedReturnDate)
            : null,
        status: 'Assigned',
        assignedBy: user.userId,
        remarks: data.remarks || ''
    });

    // Update asset status
    asset.currentStatus = 'Assigned';
    await asset.save();

    // Log history
    await AssetAssignmentHistory.create({
        assetId: data.assetId,
        employeeId,
        actionType: 'Assigned',
        previousStatus: 'Available',
        currentStatus: 'Assigned',
        actionBy: user.userId,
        remarks: data.remarks || 'Asset assigned to employee'
    });

    // Notify employee if user account exists
    if (employee.userId) {
        await notificationService.createNotification(
            employee.userId,
            'Asset Assigned',
            `You have been assigned the asset: ${asset.assetName} (${asset.assetTag}).`,
            'Asset Assigned',
            {
                referenceId: asset._id,
                referenceType: 'Asset',
                actionUrl: '/employee/assets'
            }
        );
    }

    return assignment;
};

const returnAsset = async (employeeId, assignmentId, data, user) => {
    const assignment = await EmployeeAsset.findById(assignmentId);
    if (!assignment)
        throw new AppError('Asset assignment record not found', 404);
    if (assignment.status !== 'Assigned') {
        throw new AppError(
            'Asset is already returned or is not currently active',
            400
        );
    }

    const returnStatus = data.status || 'Returned'; // Returned, Lost, Damaged, Under Repair
    const remarks = data.remarks || 'Asset returned';

    // Update assignment
    assignment.status = returnStatus;
    assignment.actualReturnDate = data.returnDate
        ? new Date(data.returnDate)
        : new Date();
    assignment.remarks = remarks;
    await assignment.save();

    // Map return status to master asset status
    const asset = await Asset.findById(assignment.assetId);
    let newMasterStatus = 'Available';
    if (returnStatus === 'Lost') newMasterStatus = 'Lost';
    else if (returnStatus === 'Damaged') newMasterStatus = 'Damaged';
    else if (returnStatus === 'Under Repair') newMasterStatus = 'Under Repair';

    const previousStatus = asset.currentStatus;
    asset.currentStatus = newMasterStatus;
    await asset.save();

    // Log history
    await AssetAssignmentHistory.create({
        assetId: assignment.assetId,
        employeeId,
        actionType: returnStatus,
        previousStatus,
        currentStatus: newMasterStatus,
        actionBy: user.userId,
        remarks: remarks
    });

    // Notify Employee
    const employee = await Employee.findById(employeeId);
    if (employee && employee.userId) {
        await notificationService.createNotification(
            employee.userId,
            'Asset Returned',
            `Your return of asset ${asset.assetName} (${asset.assetTag}) was processed. Status: ${returnStatus}`,
            'Asset Returned',
            { referenceId: asset._id, referenceType: 'Asset' }
        );
    }

    // Notify HR / Admins
    await notifyHrAndAdmins(
        `Asset ${returnStatus}`,
        `Asset ${asset.assetName} (${asset.assetTag}) assigned to ${employee?.name || 'Employee'} has been processed as ${returnStatus}.`,
        asset._id
    );

    return assignment;
};

const updateAssetAssignment = async (employeeId, assignmentId, data, user) => {
    const assignment = await EmployeeAsset.findById(assignmentId);
    if (!assignment) throw new AppError('Assignment not found', 404);

    if (data.expectedReturnDate !== undefined) {
        assignment.expectedReturnDate = data.expectedReturnDate
            ? new Date(data.expectedReturnDate)
            : null;
    }
    if (data.remarks !== undefined) {
        assignment.remarks = data.remarks;
    }

    await assignment.save();
    return assignment;
};

const getEmployeeAssetHistory = async (employeeId) => {
    return AssetAssignmentHistory.find({ employeeId })
        .populate('assetId')
        .populate('actionBy', 'name')
        .sort({ actionDate: -1 });
};

const getAssetHistory = async (assetId) => {
    return AssetAssignmentHistory.find({ assetId })
        .populate('employeeId', 'name employeeId')
        .populate('actionBy', 'name')
        .sort({ actionDate: -1 });
};

const notifyHrAndAdmins = async (title, message, referenceId) => {
    try {
        const roles = await Role.find({
            roleCode: { $in: ['ADMIN', 'SUPER_ADMIN', 'HR'] }
        });
        const roleIds = roles.map((r) => r._id);
        const users = await User.find({ roleId: { $in: roleIds } });
        for (const u of users) {
            await notificationService.createNotification(
                u._id,
                title,
                message,
                'Asset Status Updated',
                { referenceId, referenceType: 'Asset' }
            );
        }
    } catch (err) {
        console.error('Failed to notify HR/Admins', err);
    }
};

const reportAssetIssue = async (employeeId, assignmentId, data, user) => {
    const assignment = await EmployeeAsset.findById(assignmentId);
    if (!assignment)
        throw new AppError('Asset assignment record not found', 404);
    if (assignment.status !== 'Assigned') {
        throw new AppError(
            'Cannot report issue on an inactive asset assignment',
            400
        );
    }

    const remarks = data.remarks || 'Issue reported';
    const issueType = data.issueType || 'Technical Problem';

    const asset = await Asset.findById(assignment.assetId);
    if (!asset) throw new AppError('Asset not found', 404);

    await AssetAssignmentHistory.create({
        assetId: assignment.assetId,
        employeeId,
        actionType: 'Issue Reported',
        previousStatus: asset.currentStatus,
        currentStatus: asset.currentStatus,
        actionBy: user.userId,
        remarks: `[${issueType}] ${remarks}`
    });

    const employee = await Employee.findById(employeeId);
    await notifyHrAndAdmins(
        `Asset Issue: ${issueType}`,
        `Employee ${employee?.name || 'Staff'} reported an issue on ${asset.assetName} (${asset.assetTag}): "${remarks}"`,
        asset._id
    );

    return assignment;
};

module.exports = {
    getAssets,
    getAssetById,
    createAsset,
    updateAsset,
    deleteAsset,
    getEmployeeAssets,
    assignAsset,
    returnAsset,
    reportAssetIssue,
    updateAssetAssignment,
    getEmployeeAssetHistory,
    getAssetHistory
};
