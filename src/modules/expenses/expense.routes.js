const express = require('express');
const expenseController = require('./expense.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const { expenseUpload } = require('../../shared/middleware/upload.middleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/my', authorize('expenses:read'), expenseController.listMyClaims);
router.get('/', authorize('expenses:review'), expenseController.listClaims);
router.post(
    '/',
    authorize('expenses:write'),
    expenseUpload.array('attachments', 5),
    expenseController.createClaim
);
router.get(
    '/:id',
    authorize('expenses:read', 'expenses:review'),
    expenseController.getClaim
);
router.put('/:id', authorize('expenses:write'), expenseController.updateClaim);
router.post(
    '/:id/attachments',
    authorize('expenses:write'),
    expenseUpload.array('attachments', 5),
    expenseController.addAttachments
);
router.delete(
    '/attachments/:attachmentId',
    authorize('expenses:write'),
    expenseController.deleteAttachment
);
router.post(
    '/:id/submit',
    authorize('expenses:write'),
    expenseController.submitClaim
);
router.post(
    '/:id/cancel',
    authorize('expenses:write'),
    expenseController.cancelClaim
);
router.post(
    '/:id/review',
    authorize('expenses:review'),
    expenseController.reviewClaim
);

module.exports = router;
