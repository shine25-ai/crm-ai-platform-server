const Department = require('./department.model');
const Employee = require('../employees/employee.model');
const AppError = require('../../shared/utils/appError');

/**
 * Get all departments with the departmentHead populated (name, designation, employeeId).
 */
const getAllDepartments = async () => {
    return await Department.find({})
        .populate('departmentHead', 'name designation employeeId')
        .sort({ createdAt: -1 });
};

/**
 * Create a new department.
 * departmentHead is optional — pass null or omit to create without a head.
 * This breaks the Employee↔Department circular dependency.
 */
const createDepartment = async (deptData) => {
    const { departmentName, description, departmentHead, status } = deptData;

    const exists = await Department.findOne({ departmentName });
    if (exists) {
        throw new AppError('Department already exists', 400);
    }

    // Validate departmentHead if provided
    if (departmentHead) {
        const emp = await Employee.findById(departmentHead);
        if (!emp) {
            throw new AppError(
                'Specified department head employee not found',
                404
            );
        }
    }

    const department = await Department.create({
        departmentName,
        description: description || '',
        departmentHead: departmentHead || null,
        employeeCount: 0,
        status: status || 'Active'
    });

    return await Department.findById(department._id).populate(
        'departmentHead',
        'name designation employeeId'
    );
};

/**
 * Update an existing department.
 * Pass departmentHead: null to explicitly remove the head.
 * Pass departmentHead: <ObjectId string> to assign a new head.
 */
const updateDepartment = async (id, deptData) => {
    const department = await Department.findById(id);
    if (!department) {
        throw new AppError('Department not found', 404);
    }

    // Validate new department head if provided
    if (deptData.departmentHead) {
        const emp = await Employee.findById(deptData.departmentHead);
        if (!emp) {
            throw new AppError(
                'Specified department head employee not found',
                404
            );
        }
    }

    if (deptData.departmentName !== undefined)
        department.departmentName = deptData.departmentName;
    if (deptData.description !== undefined)
        department.description = deptData.description;
    // Allow explicit null to remove head, or new ObjectId to assign
    if ('departmentHead' in deptData)
        department.departmentHead = deptData.departmentHead || null;
    if (deptData.employeeCount !== undefined)
        department.employeeCount = deptData.employeeCount;
    if (deptData.status) department.status = deptData.status;

    await department.save();

    return await Department.findById(department._id).populate(
        'departmentHead',
        'name designation employeeId'
    );
};

/**
 * Delete a department. Prevents deletion if employees are still assigned.
 */
const deleteDepartment = async (id) => {
    const department = await Department.findById(id);
    if (!department) {
        throw new AppError('Department not found', 404);
    }

    // Safety check — do not delete if employees are assigned
    if (department.employeeCount > 0) {
        throw new AppError(
            `Cannot delete department: ${department.employeeCount} employee(s) still assigned. Reassign them first.`,
            400
        );
    }

    await Department.findByIdAndDelete(id);
    return true;
};

module.exports = {
    getAllDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment
};
