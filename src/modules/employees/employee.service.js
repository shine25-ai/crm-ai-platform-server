const Employee = require('./employee.model');
const Department = require('../departments/department.model');
const AppError = require('../../shared/utils/appError');

const updateDepartmentCounts = async () => {
    const counts = await Employee.aggregate([
        { $match: { status: 'Active' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    await Department.updateMany({}, { employeeCount: 0 });

    for (const item of counts) {
        await Department.updateOne(
            { departmentName: item._id },
            { employeeCount: item.count }
        );
    }
};

const getAllEmployees = async () => {
    return await Employee.find({});
};

const createEmployee = async (empData) => {
    if (!empData.employeeId) {
        const count = await Employee.countDocuments();
        empData.employeeId = `EMP${String(count + 1).padStart(3, '0')}`;
    }

    const employee = await Employee.create(empData);
    await updateDepartmentCounts();
    return employee;
};

const updateEmployee = async (id, empData) => {
    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }

    Object.assign(employee, empData);
    await employee.save();

    await updateDepartmentCounts();
    return employee;
};

const deleteEmployee = async (id) => {
    const employee = await Employee.findById(id);
    if (!employee) {
        throw new AppError('Employee not found', 404);
    }
    await Employee.findByIdAndDelete(id);
    await updateDepartmentCounts();
    return true;
};

module.exports = {
    getAllEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    updateDepartmentCounts
};
