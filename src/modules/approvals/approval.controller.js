const approvalService = require('./approval.service');
const ApprovalAttachment = require('./approvalAttachment.model');
const ApiResponse = require('../../shared/utils/response');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const getApprovals = async (req, res, next) => {
    try {
        const result = await approvalService.listApprovals(req.query, req.user);
        return ApiResponse.success(
            res,
            'Approvals retrieved successfully',
            result
        );
    } catch (error) {
        next(error);
    }
};

const getApprovalDetails = async (req, res, next) => {
    try {
        const details = await approvalService.getApprovalById(
            req.params.id,
            req.user
        );
        return ApiResponse.success(
            res,
            'Approval details retrieved successfully',
            details
        );
    } catch (error) {
        next(error);
    }
};

const createApproval = async (req, res, next) => {
    try {
        const approval = await approvalService.createApproval(
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Approval request created successfully',
            approval,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateApproval = async (req, res, next) => {
    try {
        const approval = await approvalService.updateApproval(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Approval request updated successfully',
            approval
        );
    } catch (error) {
        next(error);
    }
};

const addComment = async (req, res, next) => {
    try {
        const comment = await approvalService.addComment(
            req.params.id,
            req.user.userId,
            req.body.commentText
        );
        return ApiResponse.success(
            res,
            'Comment added successfully',
            comment,
            201
        );
    } catch (error) {
        next(error);
    }
};

const addAttachment = async (req, res, next) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, message: 'No file uploaded' });
        }

        // Ensure destination dir exists locally
        const destDir = path.join(__dirname, '../../../uploads/approvals');
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Generate safe unique filename
        const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '-');
        const filename = `${uniqueSuffix}-${safeName}`;
        const filePath = path.join(destDir, filename);

        // Write memory buffer to disk
        fs.writeFileSync(filePath, req.file.buffer);

        // Map file format for the attachments collection
        const fileData = {
            originalname: req.file.originalname,
            path: `/uploads/approvals/${filename}`, // relative static web URL path
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        const attachment = await approvalService.addAttachment(
            req.params.id,
            fileData,
            req.user.userId
        );

        return ApiResponse.success(
            res,
            'Attachment uploaded successfully',
            attachment,
            201
        );
    } catch (error) {
        next(error);
    }
};

const deleteAttachment = async (req, res, next) => {
    try {
        const attachment = await ApprovalAttachment.findById(
            req.params.attachmentId
        );
        if (attachment) {
            // Delete local physical file if it exists
            const physicalPath = path.join(
                __dirname,
                '../../../',
                attachment.fileUrl
            );
            if (fs.existsSync(physicalPath)) {
                try {
                    fs.unlinkSync(physicalPath);
                } catch (unlinkErr) {
                    console.error(
                        '[Approval Controller] Failed to unlink physical file:',
                        unlinkErr.message
                    );
                }
            }
        }

        await approvalService.deleteAttachment(
            req.params.attachmentId,
            req.user.userId
        );
        return ApiResponse.success(
            res,
            'Attachment deleted successfully',
            null
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getApprovals,
    getApprovalDetails,
    createApproval,
    updateApproval,
    addComment,
    addAttachment,
    deleteAttachment
};
