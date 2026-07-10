const mongoose = require('mongoose');

const coordinateSchema = new mongoose.Schema(
    {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        accuracy: { type: Number, default: null },
        address: { type: String, default: '' }
    },
    { _id: false }
);

const gpsLocationSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        location: { type: coordinateSchema, required: true },
        status: {
            type: String,
            enum: ['Online', 'Offline', 'Moving', 'Idle', 'On Visit'],
            default: 'Online'
        },
        speedKmph: { type: Number, default: 0 },
        batteryLevel: { type: Number, default: null },
        source: {
            type: String,
            enum: ['Browser', 'Mobile App', 'Manual', 'System'],
            default: 'Browser'
        },
        recordedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const geofenceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['Office', 'Customer', 'Project Site', 'Branch', 'Custom'],
            default: 'Custom'
        },
        location: { type: coordinateSchema, required: true },
        radiusMeters: { type: Number, default: 250 },
        assignedEmployees: [
            { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
        ],
        assignedDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department',
            default: null
        },
        status: {
            type: String,
            enum: ['Active', 'Inactive'],
            default: 'Active'
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const gpsVisitSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null
        },
        customerName: { type: String, default: '' },
        purpose: { type: String, default: '' },
        scheduledAt: { type: Date, default: null },
        status: {
            type: String,
            enum: [
                'Scheduled',
                'Checked In',
                'Completed',
                'Missed',
                'Cancelled'
            ],
            default: 'Scheduled'
        },
        checkIn: {
            time: { type: Date, default: null },
            location: { type: coordinateSchema, default: null },
            notes: { type: String, default: '' }
        },
        checkOut: {
            time: { type: Date, default: null },
            location: { type: coordinateSchema, default: null },
            notes: { type: String, default: '' }
        },
        distanceMeters: { type: Number, default: 0 },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

const gpsSettingSchema = new mongoose.Schema(
    {
        key: { type: String, unique: true, default: 'global' },
        trackingEnabled: { type: Boolean, default: true },
        trackingIntervalSeconds: { type: Number, default: 120 },
        workingHoursOnly: { type: Boolean, default: true },
        backgroundTracking: { type: Boolean, default: true },
        minimumAccuracyMeters: { type: Number, default: 100 },
        defaultGeofenceRadiusMeters: { type: Number, default: 250 },
        lowBatteryThreshold: { type: Number, default: 20 },
        enforceAttendanceGeofence: { type: Boolean, default: false },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        }
    },
    { timestamps: true }
);

gpsLocationSchema.index({ employeeId: 1, recordedAt: -1 });
gpsVisitSchema.index({ employeeId: 1, scheduledAt: -1 });

module.exports = {
    GPSLocation: mongoose.model('GPSLocation', gpsLocationSchema),
    GPSGeofence: mongoose.model('GPSGeofence', geofenceSchema),
    GPSVisit: mongoose.model('GPSVisit', gpsVisitSchema),
    GPSSetting: mongoose.model('GPSSetting', gpsSettingSchema)
};
