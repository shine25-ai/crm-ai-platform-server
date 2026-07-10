const Shift = require('../modules/shifts/shift.model');

const shiftSeedData = [
    {
        code: 'GENERAL-DAY',
        name: 'General Day Shift',
        description: 'Standard office-hours shift for weekday employees.',
        configurationType: 'SINGLE',
        timezone: 'Asia/Kolkata',
        workDays: [1, 2, 3, 4, 5],
        status: 'Active',
        segments: [
            {
                name: 'General Shift',
                startTime: '09:00',
                endTime: '18:00',
                unpaidBreakMinutes: 60,
                graceInMinutes: 10,
                graceOutMinutes: 5
            }
        ]
    },
    {
        code: 'TWO-SHIFT',
        name: 'Two Shift Operations',
        description:
            'Morning and evening operating pattern for extended business coverage.',
        configurationType: 'DOUBLE',
        timezone: 'Asia/Kolkata',
        workDays: [1, 2, 3, 4, 5, 6],
        status: 'Active',
        segments: [
            {
                name: 'Morning Shift',
                startTime: '06:00',
                endTime: '14:00',
                unpaidBreakMinutes: 30,
                graceInMinutes: 10,
                graceOutMinutes: 5
            },
            {
                name: 'Evening Shift',
                startTime: '14:00',
                endTime: '22:00',
                unpaidBreakMinutes: 30,
                graceInMinutes: 10,
                graceOutMinutes: 5
            }
        ]
    },
    {
        code: 'THREE-SHIFT',
        name: '24x7 Three Shift Operations',
        description:
            'Morning, evening, and overnight pattern for continuous operations.',
        configurationType: 'TRIPLE',
        timezone: 'Asia/Kolkata',
        workDays: [0, 1, 2, 3, 4, 5, 6],
        status: 'Active',
        segments: [
            {
                name: 'Morning Shift',
                startTime: '06:00',
                endTime: '14:00',
                unpaidBreakMinutes: 30,
                graceInMinutes: 10,
                graceOutMinutes: 5
            },
            {
                name: 'Evening Shift',
                startTime: '14:00',
                endTime: '22:00',
                unpaidBreakMinutes: 30,
                graceInMinutes: 10,
                graceOutMinutes: 5
            },
            {
                name: 'Night Shift',
                startTime: '22:00',
                endTime: '06:00',
                unpaidBreakMinutes: 30,
                graceInMinutes: 10,
                graceOutMinutes: 5
            }
        ]
    }
];

const seedShifts = async () => {
    try {
        for (const shift of shiftSeedData) {
            await Shift.updateOne(
                { code: shift.code },
                { $setOnInsert: shift },
                { upsert: true, runValidators: true }
            );
        }
        console.log('[Seeder] Shift Masters seeded successfully');
    } catch (error) {
        console.error('[Seeder] Error seeding Shift Masters:', error.message);
    }
};

module.exports = seedShifts;
