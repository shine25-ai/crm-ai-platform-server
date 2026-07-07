const express = require('express');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const gpsController = require('./gpsTracking.controller');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', authorize('gps:read'), gpsController.dashboard);
router.get('/employees', authorize('gps:read'), gpsController.employees);
router.post(
    '/locations',
    authorize('gps:write', 'gps:read'),
    gpsController.recordLocation
);
router.get('/routes', authorize('gps:read'), gpsController.routeHistory);

router.get('/geofences', authorize('gps:read'), gpsController.listGeofences);
router.post('/geofences', authorize('gps:write'), gpsController.createGeofence);
router.put(
    '/geofences/:id',
    authorize('gps:write'),
    gpsController.updateGeofence
);

router.get('/visits', authorize('gps:read'), gpsController.listVisits);
router.post('/visits', authorize('gps:write'), gpsController.createVisit);
router.post(
    '/visits/:id/check-in',
    authorize('gps:write', 'gps:read'),
    gpsController.checkInVisit
);
router.post(
    '/visits/:id/check-out',
    authorize('gps:write', 'gps:read'),
    gpsController.checkOutVisit
);

router.get(
    '/nearby-customers',
    authorize('gps:read'),
    gpsController.nearbyCustomers
);
router.get(
    '/route-optimization',
    authorize('gps:read'),
    gpsController.optimizeRoute
);
router.get('/reports', authorize('gps:read'), gpsController.reports);
router.get('/settings', authorize('gps:read'), gpsController.getSettings);
router.put('/settings', authorize('gps:write'), gpsController.updateSettings);

module.exports = router;
