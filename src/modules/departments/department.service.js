const Department = require('./department.model');
const AppError = require('../../shared/utils/appError');

const getAllDepartments = async () => {
    return await Department.find({});
};

const createDepartment = async (deptData) => {
    const { departmentName, departmentHead } = deptData;

    const exists = await Department.findOne({ departmentName });
    if (exists) {
        throw new AppError('Department already exists', 400);
    }

    const department = await Department.create({
        departmentName,
        departmentHead,
        employeeCount: 0,
        status: 'Active'
    });
    return department;
};

const updateDepartment = async (id, deptData) => {
    const department = await Department.findById(id);
    if (!department) {
        throw new AppError('Department not found', 404);
    }

    if (deptData.departmentName)
        department.departmentName = deptData.departmentName;
    if (deptData.departmentHead)
        department.departmentHead = deptData.departmentHead;
    if (deptData.employeeCount !== undefined)
        department.employeeCount = deptData.employeeCount;
    if (deptData.status) department.status = deptData.status;

    await department.save();
    return department;
};

const deleteDepartment = async (id) => {
    const department = await Department.findById(id);
    if (!department) {
        throw new AppError('Department not found', 404);
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
