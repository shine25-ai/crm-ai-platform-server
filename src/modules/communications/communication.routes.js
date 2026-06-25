const express = require('express');
const router = express.Router();
const communicationController = require('./communication.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get(
    '/email-templates',
    authorize('communications:read'),
    communicationController.listEmailTemplates
);
router.post(
    '/email-templates',
    authorize('communications:write'),
    communicationController.createEmailTemplate
);
router.put(
    '/email-templates/:id',
    authorize('communications:write'),
    communicationController.updateEmailTemplate
);
router.delete(
    '/email-templates/:id',
    authorize('communications:write'),
    communicationController.deleteEmailTemplate
);

router.get(
    '/whatsapp-templates',
    authorize('communications:read'),
    communicationController.listWhatsappTemplates
);
router.post(
    '/whatsapp-templates',
    authorize('communications:write'),
    communicationController.createWhatsappTemplate
);
router.put(
    '/whatsapp-templates/:id',
    authorize('communications:write'),
    communicationController.updateWhatsappTemplate
);
router.delete(
    '/whatsapp-templates/:id',
    authorize('communications:write'),
    communicationController.deleteWhatsappTemplate
);

router
    .route('/email-logs')
    .get(
        authorize('communications:read'),
        communicationController.listEmailLogs
    )
    .post(
        authorize('communications:write'),
        communicationController.createEmailLog
    );

router
    .route('/whatsapp-logs')
    .get(
        authorize('communications:read'),
        communicationController.listWhatsappLogs
    )
    .post(
        authorize('communications:write'),
        communicationController.createWhatsappLog
    );

router.get(
    '/timeline',
    authorize('communications:read', 'leads:read', 'customers:read'),
    communicationController.getTimeline
);

module.exports = router;
