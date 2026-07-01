const express = require('express');
const router = express.Router();
const assetController = require('./asset.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('assets:read'), assetController.getAssets);
router.post('/', authorize('assets:write'), assetController.createAsset);

router.get('/:id', authorize('assets:read'), assetController.getAssetById);
router.put('/:id', authorize('assets:write'), assetController.updateAsset);
router.delete('/:id', authorize('assets:delete'), assetController.deleteAsset);

router.get(
    '/:id/history',
    authorize('assets:read'),
    assetController.getAssetHistory
);

module.exports = router;
