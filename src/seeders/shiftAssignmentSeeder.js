const Employee = require('../modules/employees/employee.model');
require('../modules/departments/department.model');
const Shift = require('../modules/shifts/shift.model');
const ShiftAssignment = require('../modules/shifts/shiftAssignment.model');
const Role = require('../modules/roles/role.model');
const User = require('../modules/users/user.model');

const chooseShiftCode = (employee) => {
    const department = String(
        employee.department?.departmentName || ''
    ).toLowerCase();
    const designation = String(employee.designation || '').toLowerCase();
    const context = `${department} ${designation}`;

    if (
        /operations|support|security|production|infrastructure|it\b/.test(
            context
        )
    ) {
        return 'THREE-SHIFT';
    }
    if (/sales|service|customer|marketing/.test(context)) {
        return 'TWO-SHIFT';
    }
    return 'GENERAL-DAY';
};

const seedShiftAssignments = async () => {
    try {
        const employees = await Employee.find({ status: 'Active' })
            .populate('department', 'departmentName')
            .sort({ employeeId: 1 });
        if (employees.length === 0) {
            console.log(
                '[Seeder] Shift assignment mapping skipped: no active employees'
            );
            return;
        }

        const shifts = await Shift.find({
            code: { $in: ['GENERAL-DAY', 'TWO-SHIFT', 'THREE-SHIFT'] },
            status: 'Active'
        });
        const shiftMap = new Map(shifts.map((shift) => [shift.code, shift]));
        const superAdminRole = await Role.findOne({
            roleCode: 'SUPER_ADMIN'
        });
        const assignedBy = superAdminRole
            ? await User.findOne({ roleId: superAdminRole._id })
            : null;
        const effectiveFrom = new Date().toISOString().slice(0, 10);
        let createdCount = 0;

        for (const [index, employee] of employees.entries()) {
            const hasAssignment = await ShiftAssignment.exists({
                employeeId: employee._id
            });
            if (hasAssignment) continue;

            const requestedCode = chooseShiftCode(employee);
            const shift =
                shiftMap.get(requestedCode) || shiftMap.get('GENERAL-DAY');
            if (!shift) continue;

            await ShiftAssignment.create({
                employeeId: employee._id,
                shiftId: shift._id,
                segmentIndex: index % shift.segments.length,
                effectiveFrom,
                effectiveTo: null,
                notes: 'Initial assignment created by feature-data seeder',
                status: 'Active',
                assignedBy: assignedBy?._id || null
            });
            createdCount += 1;
        }

        console.log(
            `[Seeder] Shift assignments created for ${createdCount} existing employee(s)`
        );
    } catch (error) {
        console.error('[Seeder] Error mapping employee shifts:', error.message);
    }
};

module.exports = seedShiftAssignments;
