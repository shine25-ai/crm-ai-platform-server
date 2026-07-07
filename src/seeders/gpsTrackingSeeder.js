const bcrypt = require('bcryptjs');
const Department = require('../modules/departments/department.model');
const Employee = require('../modules/employees/employee.model');
const Role = require('../modules/roles/role.model');
const User = require('../modules/users/user.model');
const {
    GPSGeofence,
    GPSLocation,
    GPSSetting,
    GPSVisit
} = require('../modules/gpsTracking/gpsTracking.model');
const { ensureDemoEmployees } = require('./leaveDataSeeder');

const DEFAULT_PASSWORD = 'Password@123';

const demoPeople = [
    {
        employeeId: 'EMP-GPS-001',
        name: 'Rohan Mehta',
        email: 'rohan.field@optiflow.test',
        roleCode: 'SALES_EXECUTIVE',
        designation: 'Field Sales Executive',
        mobile: '9000000201',
        workLocation: 'Chennai',
        base: { latitude: 13.0827, longitude: 80.2707, address: 'Chennai HQ' },
        status: 'Moving',
        batteryLevel: 72
    },
    {
        employeeId: 'EMP-GPS-002',
        name: 'Kavya Rao',
        email: 'kavya.service@optiflow.test',
        roleCode: 'EMPLOYEE',
        designation: 'Customer Service Engineer',
        mobile: '9000000202',
        workLocation: 'Bengaluru',
        base: {
            latitude: 12.9716,
            longitude: 77.5946,
            address: 'Bengaluru Customer Site'
        },
        status: 'On Visit',
        batteryLevel: 38
    },
    {
        employeeId: 'EMP-GPS-003',
        name: 'Isha Kapoor',
        email: 'isha.routes@optiflow.test',
        roleCode: 'SALES_EXECUTIVE',
        designation: 'Route Sales Executive',
        mobile: '9000000203',
        workLocation: 'Mumbai',
        base: {
            latitude: 19.076,
            longitude: 72.8777,
            address: 'Mumbai Territory'
        },
        status: 'Idle',
        batteryLevel: 18
    },
    {
        employeeId: 'EMP-GPS-004',
        name: 'Farhan Ali',
        email: 'farhan.visit@optiflow.test',
        roleCode: 'EMPLOYEE',
        designation: 'Field Implementation Associate',
        mobile: '9000000204',
        workLocation: 'Hyderabad',
        base: {
            latitude: 17.385,
            longitude: 78.4867,
            address: 'Hyderabad Project Site'
        },
        status: 'Online',
        batteryLevel: 91
    }
];

const geofences = [
    {
        name: 'Chennai HQ',
        type: 'Office',
        latitude: 13.0827,
        longitude: 80.2707,
        radiusMeters: 350,
        address: 'Anna Salai, Chennai'
    },
    {
        name: 'Bengaluru Customer Zone',
        type: 'Customer',
        latitude: 12.9716,
        longitude: 77.5946,
        radiusMeters: 500,
        address: 'MG Road, Bengaluru'
    },
    {
        name: 'Mumbai Sales Territory',
        type: 'Customer',
        latitude: 19.076,
        longitude: 72.8777,
        radiusMeters: 700,
        address: 'Andheri East, Mumbai'
    },
    {
        name: 'Hyderabad Project Site',
        type: 'Project Site',
        latitude: 17.385,
        longitude: 78.4867,
        radiusMeters: 450,
        address: 'HITEC City, Hyderabad'
    }
];

const routeOffsets = [
    [0, 0],
    [0.004, 0.006],
    [0.009, 0.012],
    [0.014, 0.018],
    [0.019, 0.026]
];

const nowMinusMinutes = (minutes) => new Date(Date.now() - minutes * 60 * 1000);

const ensureRole = async (roleCode) => {
    const role = await Role.findOne({ roleCode });
    if (!role) throw new Error(`Missing role ${roleCode}`);
    return role;
};

const ensureUser = async ({ name, email, roleCode, userEmployeeId = null }) => {
    const role = await ensureRole(roleCode);
    return User.findOneAndUpdate(
        { email },
        {
            name,
            email,
            roleId: role._id,
            employeeId: userEmployeeId,
            status: 'Active',
            password: await bcrypt.hash(DEFAULT_PASSWORD, 10)
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
};

const ensureDepartment = () =>
    Department.findOneAndUpdate(
        { departmentName: 'Field Operations' },
        {
            departmentName: 'Field Operations',
            description:
                'Field sales, route tracking, customer visits, and service operations',
            status: 'Active'
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

const ensureGpsEmployees = async () => {
    const [hrEmployee, managerEmployee] = await ensureDemoEmployees();
    const department = await ensureDepartment();
    const employees = [];

    for (const person of demoPeople) {
        const user = await ensureUser(person);
        const employee = await Employee.findOneAndUpdate(
            { email: person.email },
            {
                employeeId: person.employeeId,
                name: person.name,
                email: person.email,
                department: department._id,
                designation: person.designation,
                manager: managerEmployee?._id || hrEmployee?._id || null,
                mobile: person.mobile,
                status: 'Active',
                userId: user._id,
                onboardingStatus: 'Completed',
                employmentInfo: {
                    joinDate: `${new Date().getFullYear()}-01-10`,
                    employeeType: 'Full Time',
                    salary: '720000',
                    workLocation: person.workLocation
                }
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        await User.updateOne({ _id: user._id }, { employeeId: employee._id });
        employees.push({ ...person, employee });
    }

    await Department.updateOne(
        { _id: department._id },
        {
            departmentHead: managerEmployee?._id || null,
            employeeCount: employees.length
        }
    );

    return employees;
};

const seedLocations = async (employees) => {
    await GPSLocation.deleteMany({
        employeeId: { $in: employees.map((item) => item.employee._id) }
    });

    const records = [];
    for (const person of employees) {
        routeOffsets.forEach(([latOffset, lonOffset], index) => {
            records.push({
                employeeId: person.employee._id,
                userId: person.employee.userId,
                location: {
                    latitude: Number(
                        (person.base.latitude + latOffset).toFixed(6)
                    ),
                    longitude: Number(
                        (person.base.longitude + lonOffset).toFixed(6)
                    ),
                    accuracy: 20 + index * 4,
                    address:
                        index === 0
                            ? person.base.address
                            : `${person.workLocation} route point ${index}`
                },
                status:
                    index === routeOffsets.length - 1
                        ? person.status
                        : 'Moving',
                speedKmph:
                    index === routeOffsets.length - 1 ? 0 : 28 + index * 3,
                batteryLevel: Math.max(person.batteryLevel - index, 5),
                source: 'Mobile App',
                recordedAt: nowMinusMinutes((routeOffsets.length - index) * 12)
            });
        });
    }

    await GPSLocation.insertMany(records);
};

const seedGeofences = async (employees) => {
    for (const fence of geofences) {
        await GPSGeofence.findOneAndUpdate(
            { name: fence.name },
            {
                name: fence.name,
                type: fence.type,
                location: {
                    latitude: fence.latitude,
                    longitude: fence.longitude,
                    accuracy: 10,
                    address: fence.address
                },
                radiusMeters: fence.radiusMeters,
                assignedEmployees: employees.map((item) => item.employee._id),
                status: 'Active'
            },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
    }
};

const seedVisits = async (employees) => {
    await GPSVisit.deleteMany({
        employeeId: { $in: employees.map((item) => item.employee._id) }
    });

    const visitPayloads = employees.map((person, index) => {
        const checkedIn = index === 1;
        const completed = index === 2;
        const location = {
            latitude: person.base.latitude + 0.01,
            longitude: person.base.longitude + 0.01,
            accuracy: 25,
            address: `${person.workLocation} customer visit location`
        };
        return {
            employeeId: person.employee._id,
            customerName: [
                'GreenTech Retail',
                'BluePeak Manufacturing',
                'Northstar Logistics',
                'MetroCare Hospital'
            ][index],
            purpose: [
                'Product demo and order discussion',
                'Service issue inspection',
                'Route sales follow-up',
                'Implementation site verification'
            ][index],
            scheduledAt: nowMinusMinutes(index * 30),
            status: completed
                ? 'Completed'
                : checkedIn
                  ? 'Checked In'
                  : 'Scheduled',
            checkIn:
                checkedIn || completed
                    ? {
                          time: nowMinusMinutes(35),
                          location,
                          notes: 'Customer location validated by GPS'
                      }
                    : undefined,
            checkOut: completed
                ? {
                      time: nowMinusMinutes(5),
                      location: {
                          ...location,
                          latitude: location.latitude + 0.003,
                          longitude: location.longitude + 0.004
                      },
                      notes: 'Visit completed successfully'
                  }
                : undefined,
            distanceMeters: completed ? 640 : 0
        };
    });

    await GPSVisit.insertMany(visitPayloads);
};

const seedSettings = async () =>
    GPSSetting.findOneAndUpdate(
        { key: 'global' },
        {
            key: 'global',
            trackingEnabled: true,
            trackingIntervalSeconds: 60,
            workingHoursOnly: true,
            backgroundTracking: true,
            minimumAccuracyMeters: 100,
            defaultGeofenceRadiusMeters: 300,
            lowBatteryThreshold: 20,
            enforceAttendanceGeofence: false
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

const seedGpsTracking = async () => {
    try {
        const employees = await ensureGpsEmployees();
        await seedSettings();
        await seedGeofences(employees);
        await seedLocations(employees);
        await seedVisits(employees);
        console.log(
            `[Seeder] GPS tracking demo data seeded for ${employees.length} field employee(s)`
        );
    } catch (error) {
        console.error(
            '[Seeder] Error seeding GPS tracking data:',
            error.message
        );
    }
};

module.exports = seedGpsTracking;
