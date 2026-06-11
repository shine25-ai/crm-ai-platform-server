/**
 * One-time migration script.
 * Converts plain string fields (department, departmentHead, manager)
 * to ObjectId references after upgrading the schemas.
 *
 * Run once with: node src/seeders/migrateToObjectIds.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Department = require('../modules/departments/department.model');
const Employee = require('../modules/employees/employee.model');

async function migrate() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm-ai';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // ------- Step 1: Migrate Employee.department (String → ObjectId) --------
    // Temporarily read raw documents (before schema enforces ObjectId)
    const EmployeeRaw = mongoose.model(
        'EmployeeRaw',
        new mongoose.Schema({}, { strict: false }),
        'employees'
    );
    const DepartmentRaw = mongoose.model(
        'DepartmentRaw',
        new mongoose.Schema({}, { strict: false }),
        'departments'
    );

    const rawEmployees = await EmployeeRaw.find({}).lean();
    const rawDepartments = await DepartmentRaw.find({}).lean();

    // Build lookup: departmentName → ObjectId
    const deptNameToId = {};
    for (const d of rawDepartments) {
        deptNameToId[d.departmentName] = d._id;
    }

    // Build lookup: employeeName → ObjectId
    const empNameToId = {};
    for (const e of rawEmployees) {
        empNameToId[e.name] = e._id;
    }

    let empDeptFixed = 0;
    let empMgrFixed = 0;
    let deptHeadFixed = 0;

    // Migrate Employee.department
    for (const emp of rawEmployees) {
        const updates = {};

        // If department is a string (not an ObjectId), convert it
        if (typeof emp.department === 'string') {
            const deptId = deptNameToId[emp.department];
            if (deptId) {
                updates.department = deptId;
                empDeptFixed++;
            } else {
                console.warn(
                    `⚠️  Employee "${emp.name}" — department "${emp.department}" not found in DB`
                );
            }
        }

        // If manager is a string name, convert to ObjectId
        if (
            emp.manager &&
            typeof emp.manager === 'string' &&
            emp.manager !== 'None' &&
            emp.manager !== ''
        ) {
            const mgrId = empNameToId[emp.manager];
            if (mgrId) {
                updates.manager = mgrId;
                empMgrFixed++;
            } else {
                updates.manager = null; // Clear invalid manager
                console.warn(
                    `⚠️  Employee "${emp.name}" — manager "${emp.manager}" not found, cleared`
                );
            }
        } else if (!emp.manager || emp.manager === 'None') {
            updates.manager = null;
        }

        if (Object.keys(updates).length > 0) {
            await EmployeeRaw.updateOne({ _id: emp._id }, { $set: updates });
        }
    }

    // Migrate Department.departmentHead
    const rawDepts2 = await DepartmentRaw.find({}).lean();
    for (const dept of rawDepts2) {
        if (dept.departmentHead && typeof dept.departmentHead === 'string') {
            const empId = empNameToId[dept.departmentHead];
            if (empId) {
                await DepartmentRaw.updateOne(
                    { _id: dept._id },
                    { $set: { departmentHead: empId } }
                );
                deptHeadFixed++;
            } else {
                // Clear invalid string head
                await DepartmentRaw.updateOne(
                    { _id: dept._id },
                    { $set: { departmentHead: null } }
                );
                console.warn(
                    `⚠️  Department "${dept.departmentName}" — head "${dept.departmentHead}" not found, cleared to null`
                );
            }
        }
    }

    console.log(`\n✅ Migration complete:`);
    console.log(`   Employee.department fixed: ${empDeptFixed}`);
    console.log(`   Employee.manager fixed:    ${empMgrFixed}`);
    console.log(`   Department.head fixed:     ${deptHeadFixed}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected');
}

migrate().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
