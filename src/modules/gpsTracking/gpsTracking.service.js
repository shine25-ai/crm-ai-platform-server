const mongoose = require('mongoose');
const Employee = require('../employees/employee.model');
const Customer = require('../customers/customer.model');
const {
    GPSLocation,
    GPSGeofence,
    GPSVisit,
    GPSSetting
} = require('./gpsTracking.model');

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLocation = (value = {}) => ({
    latitude: toNumber(value.latitude),
    longitude: toNumber(value.longitude),
    accuracy: value.accuracy === undefined ? null : toNumber(value.accuracy),
    address: value.address || ''
});

const distanceMeters = (from, to) => {
    if (!from || !to) return 0;
    const lat1 = toNumber(from.latitude);
    const lon1 = toNumber(from.longitude);
    const lat2 = toNumber(to.latitude);
    const lon2 = toNumber(to.longitude);
    const radius = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const dateRange = (query = {}) => {
    const now = new Date();
    const start = query.startDate
        ? new Date(query.startDate)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = query.endDate
        ? new Date(query.endDate)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start, end };
};

const latestLocations = async (filter = {}) => {
    const match = {};
    if (filter.employeeId) {
        match.employeeId = new mongoose.Types.ObjectId(filter.employeeId);
    }
    const rows = await GPSLocation.aggregate([
        { $match: match },
        { $sort: { recordedAt: -1 } },
        {
            $group: {
                _id: '$employeeId',
                latest: { $first: '$$ROOT' }
            }
        },
        { $replaceRoot: { newRoot: '$latest' } },
        { $sort: { recordedAt: -1 } }
    ]);
    return GPSLocation.populate(rows, {
        path: 'employeeId',
        select: 'name employeeId designation department mobile profilePhoto',
        populate: { path: 'department', select: 'departmentName' }
    });
};

const listDashboard = async (query = {}) => {
    const [locations, geofences, visits, settings] = await Promise.all([
        latestLocations(query),
        GPSGeofence.find({ status: 'Active' })
            .populate('assignedEmployees', 'name employeeId designation')
            .populate('assignedDepartment', 'departmentName')
            .sort({ createdAt: -1 })
            .limit(20),
        GPSVisit.find({})
            .populate('employeeId', 'name employeeId designation')
            .populate('customerId', 'customerName')
            .sort({ updatedAt: -1 })
            .limit(20),
        getSettings()
    ]);

    const moving = locations.filter((item) => item.status === 'Moving').length;
    const onVisit = locations.filter(
        (item) => item.status === 'On Visit'
    ).length;
    const lowBattery = locations.filter(
        (item) =>
            item.batteryLevel !== null &&
            item.batteryLevel <= settings.lowBatteryThreshold
    ).length;

    return {
        summary: {
            trackedEmployees: locations.length,
            moving,
            onVisit,
            lowBattery,
            activeGeofences: geofences.length,
            openVisits: visits.filter((visit) =>
                ['Scheduled', 'Checked In'].includes(visit.status)
            ).length
        },
        liveLocations: locations,
        geofences,
        visits,
        settings
    };
};

const recordLocation = async (payload = {}, user = {}) => {
    const employeeId = payload.employeeId || user.employeeId;
    if (!employeeId) throw new Error('Employee is required for GPS update');
    const location = await GPSLocation.create({
        employeeId,
        userId: user.userId || user._id || null,
        location: normalizeLocation(payload.location || payload),
        status: payload.status || 'Online',
        speedKmph: toNumber(payload.speedKmph),
        batteryLevel:
            payload.batteryLevel === undefined
                ? null
                : toNumber(payload.batteryLevel),
        source: payload.source || 'Browser',
        recordedAt: payload.recordedAt
            ? new Date(payload.recordedAt)
            : new Date()
    });
    return location.populate('employeeId', 'name employeeId designation');
};

const listRouteHistory = async (query = {}) => {
    const { start, end } = dateRange(query);
    const filter = { recordedAt: { $gte: start, $lte: end } };
    if (query.employeeId) filter.employeeId = query.employeeId;
    const points = await GPSLocation.find(filter)
        .populate('employeeId', 'name employeeId designation')
        .sort({ recordedAt: 1 });
    let totalDistanceMeters = 0;
    for (let index = 1; index < points.length; index += 1) {
        totalDistanceMeters += distanceMeters(
            points[index - 1].location,
            points[index].location
        );
    }
    return {
        points,
        totalDistanceMeters,
        totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2)),
        timeline: buildTimeline(points, [])
    };
};

const validateAgainstGeofence = async (employeeId, location = {}) => {
    const normalizedLocation = normalizeLocation(location);
    if (!normalizedLocation.latitude || !normalizedLocation.longitude) {
        return {
            ...normalizedLocation,
            validated: false,
            validationMessage: 'Latitude and longitude are required'
        };
    }

    const employee = employeeId ? await Employee.findById(employeeId) : null;
    const geofences = await GPSGeofence.find({
        status: 'Active',
        $or: [
            { assignedEmployees: employeeId },
            { assignedEmployees: { $size: 0 } },
            ...(employee?.department
                ? [{ assignedDepartment: employee.department }]
                : [])
        ]
    }).sort({ createdAt: -1 });

    if (!geofences.length) {
        return {
            ...normalizedLocation,
            validated: Boolean(location.validated),
            validationMessage: 'No active GPS geofence configured'
        };
    }

    const nearest = geofences
        .map((geofence) => ({
            geofence,
            distance: distanceMeters(normalizedLocation, geofence.location)
        }))
        .sort((a, b) => a.distance - b.distance)[0];
    const validated = nearest.distance <= nearest.geofence.radiusMeters;

    return {
        ...normalizedLocation,
        geofenceId: nearest.geofence._id,
        geofenceName: nearest.geofence.name,
        geofenceType: nearest.geofence.type,
        geofenceRadiusMeters: nearest.geofence.radiusMeters,
        distanceFromGeofenceMeters: nearest.distance,
        validated,
        validationMessage: validated
            ? `Within ${nearest.geofence.name} geofence`
            : `Outside ${nearest.geofence.name} geofence by ${Math.max(
                  0,
                  nearest.distance - nearest.geofence.radiusMeters
              )} meters`
    };
};

const normalizeObjectIdArray = (values = []) =>
    Array.isArray(values) ? values.filter(Boolean) : [];

const createGeofence = async (payload = {}, user = {}) => {
    const geofence = await GPSGeofence.create({
        name: payload.name,
        type: payload.type || 'Custom',
        location: normalizeLocation(payload.location || payload),
        radiusMeters: toNumber(payload.radiusMeters, 250),
        assignedEmployees: normalizeObjectIdArray(payload.assignedEmployees),
        assignedDepartment: payload.assignedDepartment || null,
        status: payload.status || 'Active',
        createdBy: user.userId || null
    });

    return GPSGeofence.findById(geofence._id)
        .populate('assignedEmployees', 'name employeeId designation')
        .populate('assignedDepartment', 'departmentName');
};

const listGeofences = () =>
    GPSGeofence.find({})
        .populate('assignedEmployees', 'name employeeId')
        .populate('assignedDepartment', 'departmentName')
        .sort({ createdAt: -1 });

const updateGeofence = (id, payload = {}) =>
    GPSGeofence.findByIdAndUpdate(
        id,
        {
            ...payload,
            ...(payload.radiusMeters !== undefined
                ? { radiusMeters: toNumber(payload.radiusMeters, 250) }
                : {}),
            ...(payload.assignedEmployees !== undefined
                ? {
                      assignedEmployees: normalizeObjectIdArray(
                          payload.assignedEmployees
                      )
                  }
                : {}),
            ...(payload.assignedDepartment !== undefined
                ? { assignedDepartment: payload.assignedDepartment || null }
                : {}),
            ...(payload.location
                ? { location: normalizeLocation(payload.location) }
                : {})
        },
        { new: true }
    )
        .populate('assignedEmployees', 'name employeeId designation')
        .populate('assignedDepartment', 'departmentName');

const resolveWorkspaceEmployees = async (geofence, allEmployees) => {
    if (geofence.assignedEmployees?.length) return geofence.assignedEmployees;

    if (geofence.assignedDepartment?._id) {
        return allEmployees.filter(
            (employee) =>
                String(employee.department?._id || employee.department) ===
                String(geofence.assignedDepartment._id)
        );
    }

    return allEmployees;
};

const listWorkspaceVerification = async () => {
    const [geofences, locations, allEmployees] = await Promise.all([
        GPSGeofence.find({ status: 'Active' })
            .populate(
                'assignedEmployees',
                'name employeeId designation department'
            )
            .populate('assignedDepartment', 'departmentName')
            .sort({ createdAt: -1 }),
        latestLocations(),
        Employee.find({ status: 'Active' })
            .select('name employeeId designation department')
            .populate('department', 'departmentName')
            .sort({ name: 1 })
    ]);

    const latestByEmployee = new Map(
        locations.map((item) => [String(item.employeeId?._id), item])
    );

    const workspaces = await Promise.all(
        geofences.map(async (geofence) => {
            const assignedEmployees = await resolveWorkspaceEmployees(
                geofence,
                allEmployees
            );
            const verifications = assignedEmployees.map((employee) => {
                const latestLocation = latestByEmployee.get(
                    String(employee._id)
                );
                const distance = latestLocation?.location
                    ? distanceMeters(latestLocation.location, geofence.location)
                    : null;
                const inside =
                    distance !== null && distance <= geofence.radiusMeters;

                return {
                    employee,
                    latestLocation,
                    distanceMeters: distance,
                    insideBoundary: inside,
                    status: latestLocation
                        ? inside
                            ? 'Inside'
                            : 'Outside'
                        : 'No GPS',
                    validationMessage: latestLocation
                        ? inside
                            ? `Inside ${geofence.name} boundary`
                            : `Outside ${geofence.name} by ${Math.max(
                                  0,
                                  distance - geofence.radiusMeters
                              )} meters`
                        : 'No latest GPS location available'
                };
            });

            return {
                geofence,
                assignedEmployeeCount: assignedEmployees.length,
                insideCount: verifications.filter(
                    (item) => item.status === 'Inside'
                ).length,
                outsideCount: verifications.filter(
                    (item) => item.status === 'Outside'
                ).length,
                missingGpsCount: verifications.filter(
                    (item) => item.status === 'No GPS'
                ).length,
                verifications
            };
        })
    );

    return {
        summary: {
            workspaces: workspaces.length,
            mappedEmployees: workspaces.reduce(
                (total, item) => total + item.assignedEmployeeCount,
                0
            ),
            inside: workspaces.reduce(
                (total, item) => total + item.insideCount,
                0
            ),
            outside: workspaces.reduce(
                (total, item) => total + item.outsideCount,
                0
            ),
            missingGps: workspaces.reduce(
                (total, item) => total + item.missingGpsCount,
                0
            )
        },
        workspaces
    };
};

const createVisit = async (payload = {}, user = {}) => {
    const customer = payload.customerId
        ? await Customer.findById(payload.customerId).select('customerName')
        : null;
    return GPSVisit.create({
        employeeId: payload.employeeId,
        customerId: payload.customerId || null,
        customerName: payload.customerName || customer?.customerName || '',
        purpose: payload.purpose || '',
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        status: payload.status || 'Scheduled',
        createdBy: user.userId || null
    });
};

const listVisits = (query = {}) => {
    const filter = {};
    if (query.employeeId) filter.employeeId = query.employeeId;
    if (query.status) filter.status = query.status;
    return GPSVisit.find(filter)
        .populate('employeeId', 'name employeeId designation')
        .populate('customerId', 'customerName')
        .sort({ scheduledAt: -1, updatedAt: -1 });
};

const checkInVisit = async (id, payload = {}) =>
    GPSVisit.findByIdAndUpdate(
        id,
        {
            status: 'Checked In',
            checkIn: {
                time: new Date(),
                location: normalizeLocation(payload.location || payload),
                notes: payload.notes || ''
            }
        },
        { new: true }
    );

const checkOutVisit = async (id, payload = {}) => {
    const visit = await GPSVisit.findById(id);
    if (!visit) return null;
    const checkoutLocation = normalizeLocation(payload.location || payload);
    const travelled = visit.checkIn?.location
        ? distanceMeters(visit.checkIn.location, checkoutLocation)
        : 0;
    visit.status = 'Completed';
    visit.checkOut = {
        time: new Date(),
        location: checkoutLocation,
        notes: payload.notes || ''
    };
    visit.distanceMeters = travelled;
    await visit.save();
    return visit;
};

const getNearbyCustomers = async (query = {}) => {
    const latitude = toNumber(query.latitude);
    const longitude = toNumber(query.longitude);
    const radiusKm = toNumber(query.radiusKm, 10);
    const customers = await Customer.find({}).limit(100);
    const customerResults = customers
        .map((customer) => {
            const lat = customer.location?.latitude || customer.geo?.latitude;
            const lon = customer.location?.longitude || customer.geo?.longitude;
            const hasCoords = lat !== undefined && lon !== undefined;
            const distance = hasCoords
                ? distanceMeters(
                      { latitude, longitude },
                      { latitude: lat, longitude: lon }
                  )
                : null;
            return {
                type: 'Customer',
                name: customer.customerName || customer.name || 'Customer',
                customer,
                location: hasCoords ? { latitude: lat, longitude: lon } : null,
                distanceMeters: distance
            };
        })
        .filter((item) => item.distanceMeters !== null);

    const visitTargets = await GPSVisit.find({
        $or: [
            { 'checkIn.location.latitude': { $exists: true } },
            { 'checkOut.location.latitude': { $exists: true } }
        ]
    }).limit(100);
    const visitResults = visitTargets.map((visit) => {
        const location = visit.checkIn?.location || visit.checkOut?.location;
        return {
            type: 'Visit Location',
            name: visit.customerName || 'Customer Visit',
            visitId: visit._id,
            purpose: visit.purpose,
            location,
            distanceMeters: distanceMeters({ latitude, longitude }, location)
        };
    });

    const geofenceResults = await GPSGeofence.find({
        type: { $in: ['Customer', 'Project Site'] },
        status: 'Active'
    }).then((items) =>
        items.map((geofence) => ({
            type: geofence.type,
            name: geofence.name,
            geofenceId: geofence._id,
            location: geofence.location,
            distanceMeters: distanceMeters(
                { latitude, longitude },
                geofence.location
            )
        }))
    );

    return [...customerResults, ...visitResults, ...geofenceResults]
        .filter((item) => item.distanceMeters <= radiusKm * 1000)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 20);
};

const optimizeRoute = async (query = {}) => {
    const origin = query.latitude
        ? {
              latitude: toNumber(query.latitude),
              longitude: toNumber(query.longitude)
          }
        : null;
    let stops = await getNearbyCustomers({
        latitude: origin?.latitude || 13.0827,
        longitude: origin?.longitude || 80.2707,
        radiusKm: query.radiusKm || 1000
    });

    stops = stops.filter((stop) => stop.location).slice(0, 12);
    if (!stops.length) return { stops: [], totalDistanceMeters: 0 };

    const ordered = [];
    let current = origin || stops[0].location;
    let remaining = [...stops];
    let totalDistanceMeters = 0;

    while (remaining.length) {
        const next = remaining
            .map((stop) => ({
                stop,
                distance: distanceMeters(current, stop.location)
            }))
            .sort((a, b) => a.distance - b.distance)[0];
        ordered.push({ ...next.stop, legDistanceMeters: next.distance });
        totalDistanceMeters += next.distance;
        current = next.stop.location;
        remaining = remaining.filter((stop) => stop !== next.stop);
    }

    return {
        stops: ordered,
        totalDistanceMeters,
        totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2))
    };
};

const buildTimeline = (points = [], visits = []) =>
    [
        ...points.map((point) => ({
            type: 'Location Update',
            employee: point.employeeId?.name,
            status: point.status,
            time: point.recordedAt,
            location: point.location
        })),
        ...visits.flatMap((visit) => {
            const employee = visit.employeeId?.name;
            return [
                visit.checkIn?.time
                    ? {
                          type: 'Customer Check-In',
                          employee,
                          status: visit.status,
                          customer: visit.customerName,
                          time: visit.checkIn.time,
                          location: visit.checkIn.location
                      }
                    : null,
                visit.checkOut?.time
                    ? {
                          type: 'Customer Check-Out',
                          employee,
                          status: visit.status,
                          customer: visit.customerName,
                          time: visit.checkOut.time,
                          location: visit.checkOut.location
                      }
                    : null
            ].filter(Boolean);
        })
    ].sort((a, b) => new Date(a.time) - new Date(b.time));

const getReports = async (query = {}) => {
    const { start, end } = dateRange(query);
    const match = { recordedAt: { $gte: start, $lte: end } };
    if (query.employeeId)
        match.employeeId = new mongoose.Types.ObjectId(query.employeeId);
    const route = await listRouteHistory(query);
    const visits = await GPSVisit.find({
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        updatedAt: { $gte: start, $lte: end }
    }).populate('employeeId', 'name employeeId');
    const timeline = buildTimeline(route.points, visits);
    return {
        dateRange: { start, end },
        distanceKm: route.totalDistanceKm,
        locationUpdates: route.points.length,
        visitsCompleted: visits.filter((visit) => visit.status === 'Completed')
            .length,
        visits,
        timeline
    };
};

const getSettings = async () => {
    let settings = await GPSSetting.findOne({ key: 'global' });
    if (!settings) settings = await GPSSetting.create({ key: 'global' });
    return settings;
};

const updateSettings = async (payload = {}, user = {}) =>
    GPSSetting.findOneAndUpdate(
        { key: 'global' },
        { ...payload, key: 'global', updatedBy: user.userId || null },
        { new: true, upsert: true }
    );

const listEmployeesForTracking = () =>
    Employee.find({ status: 'Active' })
        .select('name employeeId designation department mobile profilePhoto')
        .populate('department', 'departmentName')
        .sort({ name: 1 });

module.exports = {
    listDashboard,
    recordLocation,
    listRouteHistory,
    createGeofence,
    listGeofences,
    updateGeofence,
    listWorkspaceVerification,
    createVisit,
    listVisits,
    checkInVisit,
    checkOutVisit,
    getNearbyCustomers,
    optimizeRoute,
    validateAgainstGeofence,
    getReports,
    getSettings,
    updateSettings,
    listEmployeesForTracking,
    distanceMeters
};
