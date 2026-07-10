const express = require('express');
const router = express.Router();
const documentController = require('./document.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const { taskUpload } = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

router.get('/', authorize('assets:read'), documentController.getDocuments);
router.post(
    '/',
    authorize('assets:read'),
    taskUpload.single('file'),
    documentController.uploadDocument
);
router.put(
    '/:id/version',
    authorize('assets:read'),
    taskUpload.single('file'),
    documentController.addVersion
);
router.delete(
    '/:id',
    authorize('assets:read'),
    documentController.deleteDocument
);
router.get(
    '/download/:id',
    authorize('assets:read'),
    documentController.downloadDocument
);

module.exports = router;
