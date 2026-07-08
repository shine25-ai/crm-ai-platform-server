const gpsService = require('./gpsTracking.service');

const ok = (res, data, message = 'Success') =>
    res.json({ success: true, message, data });

const created = (res, data, message = 'Created') =>
    res.status(201).json({ success: true, message, data });

const wrap = (handler) => async (req, res, next) => {
    try {
        await handler(req, res, next);
    } catch (error) {
        next(error);
    }
};

exports.dashboard = wrap(async (req, res) => {
    ok(res, await gpsService.listDashboard(req.query), 'GPS dashboard loaded');
});

exports.employees = wrap(async (req, res) => {
    ok(res, await gpsService.listEmployeesForTracking(), 'Employees loaded');
});

exports.recordLocation = wrap(async (req, res) => {
    created(
        res,
        await gpsService.recordLocation(req.body, req.user),
        'Location recorded'
    );
});

exports.routeHistory = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.listRouteHistory(req.query),
        'Route history loaded'
    );
});

exports.listGeofences = wrap(async (req, res) => {
    ok(res, await gpsService.listGeofences(), 'Geofences loaded');
});

exports.createGeofence = wrap(async (req, res) => {
    created(
        res,
        await gpsService.createGeofence(req.body, req.user),
        'Geofence created'
    );
});

exports.updateGeofence = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.updateGeofence(req.params.id, req.body),
        'Geofence updated'
    );
});

exports.workspaceVerification = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.listWorkspaceVerification(),
        'Workspace verification loaded'
    );
});

exports.listVisits = wrap(async (req, res) => {
    ok(res, await gpsService.listVisits(req.query), 'Visits loaded');
});

exports.createVisit = wrap(async (req, res) => {
    created(
        res,
        await gpsService.createVisit(req.body, req.user),
        'Visit created'
    );
});

exports.checkInVisit = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.checkInVisit(req.params.id, req.body),
        'Visit checked in'
    );
});

exports.checkOutVisit = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.checkOutVisit(req.params.id, req.body),
        'Visit checked out'
    );
});

exports.nearbyCustomers = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.getNearbyCustomers(req.query),
        'Nearby customers loaded'
    );
});

exports.optimizeRoute = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.optimizeRoute(req.query),
        'Optimized route loaded'
    );
});

exports.reports = wrap(async (req, res) => {
    ok(res, await gpsService.getReports(req.query), 'GPS reports loaded');
});

exports.getSettings = wrap(async (req, res) => {
    ok(res, await gpsService.getSettings(), 'GPS settings loaded');
});

exports.updateSettings = wrap(async (req, res) => {
    ok(
        res,
        await gpsService.updateSettings(req.body, req.user),
        'GPS settings updated'
    );
});
