const ResourceAllocation = require('./resourceAllocation.model');
const Employee = require('../employees/employee.model');
const Project = require('../projects/project.model');
const AppError = require('../../shared/utils/appError');

const getAllocations = async (filters = {}) => {
    const query = {};
    if (filters.project) query.project = filters.project;
    if (filters.employee) query.employee = filters.employee;

    return ResourceAllocation.find(query)
        .populate('employee', 'name email designation department status skills')
        .populate('project', 'projectName status startDate endDate');
};

const getResourcesWorkload = async (filters = {}) => {
    // 1. Fetch all employees
    const empQuery = { status: 'Active' };
    if (filters.department) empQuery.department = filters.department;
    if (filters.designation) {
        empQuery.designation = { $regex: filters.designation, $options: 'i' };
    }
    if (filters.skill) {
        empQuery.skills = { $in: [filters.skill] };
    }

    const employees = await Employee.find(empQuery).populate(
        'department',
        'departmentName'
    );

    // 2. Fetch active projects
    const activeProjects = await Project.find({ status: 'Active' });
    const activeProjectIds = activeProjects.map((p) => String(p._id));

    // 3. Fetch all current allocations (within active projects)
    const today = new Date();
    const allocations = await ResourceAllocation.find({
        project: { $in: activeProjectIds }
    });

    // 4. Map allocations to employees and calculate workload
    const result = employees.map((emp) => {
        const empAllocations = allocations.filter(
            (a) => String(a.employee) === String(emp._id)
        );

        // Sum current allocation percentages
        const totalAllocation = empAllocations.reduce((acc, curr) => {
            const isCurrent =
                new Date(curr.startDate) <= today &&
                new Date(curr.endDate) >= today;
            return isCurrent ? acc + curr.allocationPercentage : acc;
        }, 0);

        let workload = 'Available';
        if (totalAllocation > 0 && totalAllocation < 100) {
            workload = 'Partially allocated';
        } else if (totalAllocation === 100) {
            workload = 'Fully allocated';
        } else if (totalAllocation > 100) {
            workload = 'Overallocated';
        }

        return {
            employee: emp,
            allocations: empAllocations,
            totalAllocation,
            workload
        };
    });

    // 5. Apply filters for workload and project if requested
    let filteredResult = result;
    if (filters.workload) {
        filteredResult = filteredResult.filter(
            (r) => r.workload.toLowerCase() === filters.workload.toLowerCase()
        );
    }
    if (filters.project) {
        filteredResult = filteredResult.filter((r) =>
            r.allocations.some(
                (a) => String(a.project) === String(filters.project)
            )
        );
    }

    return filteredResult;
};

const createAllocation = async (data, userId) => {
    const {
        employee: employeeId,
        project: projectId,
        allocationPercentage,
        startDate,
        endDate
    } = data;

    // Validate Project exists and is active
    const project = await Project.findById(projectId);
    if (!project) throw new AppError('Project not found', 404);

    // Calculate current allocations of this employee
    const activeProjects = await Project.find({ status: 'Active' });
    const activeProjectIds = activeProjects.map((p) => String(p._id));

    const existingAllocations = await ResourceAllocation.find({
        employee: employeeId,
        project: { $in: activeProjectIds }
    });

    const today = new Date();
    const totalCurrentAllocation = existingAllocations.reduce((acc, curr) => {
        const isCurrent =
            new Date(curr.startDate) <= today &&
            new Date(curr.endDate) >= today;
        return isCurrent ? acc + curr.allocationPercentage : acc;
    }, 0);

    // Permitting overallocation to support allocating a resource to multiple projects
    // if (totalCurrentAllocation + allocationPercentage > 100) {
    //     throw new AppError(
    //         `Cannot allocate resource. Total active allocation would exceed 100% (Current allocation: ${totalCurrentAllocation}%, attempted: ${allocationPercentage}%)`,
    //         400
    //     );
    // }

    const allocation = await ResourceAllocation.create({
        ...data,
        assignedBy: userId
    });

    // Track in Project Activity
    project.activityHistory.push({
        action: 'Resource Allocated',
        details: `Resource assigned with ${allocationPercentage}% allocation as ${data.role}.`,
        performedBy: userId
    });
    await project.save();

    return allocation;
};

const updateAllocation = async (id, data, userId) => {
    const allocation = await ResourceAllocation.findById(id);
    if (!allocation) throw new AppError('Allocation not found', 404);

    const { allocationPercentage } = data;
    if (
        allocationPercentage !== undefined &&
        allocationPercentage !== allocation.allocationPercentage
    ) {
        // Enforce the 100% limit
        const activeProjects = await Project.find({ status: 'Active' });
        const activeProjectIds = activeProjects.map((p) => String(p._id));

        const existingAllocations = await ResourceAllocation.find({
            employee: allocation.employee,
            project: { $in: activeProjectIds },
            _id: { $ne: id }
        });

        const today = new Date();
        const totalOtherAllocation = existingAllocations.reduce((acc, curr) => {
            const isCurrent =
                new Date(curr.startDate) <= today &&
                new Date(curr.endDate) >= today;
            return isCurrent ? acc + curr.allocationPercentage : acc;
        }, 0);

        if (totalOtherAllocation + allocationPercentage > 100) {
            throw new AppError(
                `Cannot update allocation. Total active allocation would exceed 100% (Current allocation from other assignments: ${totalOtherAllocation}%, attempted: ${allocationPercentage}%)`,
                400
            );
        }
    }

    Object.assign(allocation, data);
    await allocation.save();

    // Log update activity
    const project = await Project.findById(allocation.project);
    if (project) {
        project.activityHistory.push({
            action: 'Resource Allocation Updated',
            details: `Allocation for resource updated to ${allocation.allocationPercentage}% as ${allocation.role}.`,
            performedBy: userId
        });
        await project.save();
    }

    return allocation;
};

const deleteAllocation = async (id, userId) => {
    const allocation = await ResourceAllocation.findById(id);
    if (!allocation) throw new AppError('Allocation not found', 404);

    const project = await Project.findById(allocation.project);
    if (project) {
        project.activityHistory.push({
            action: 'Resource Deallocated',
            details: `Resource unassigned from project.`,
            performedBy: userId
        });
        await project.save();
    }

    await ResourceAllocation.findByIdAndDelete(id);
    return { success: true };
};

const getCalendarView = async () => {
    const allocations = await ResourceAllocation.find()
        .populate('employee', 'name email designation')
        .populate('project', 'projectName status');

    return allocations.map((a) => ({
        id: a._id,
        title: `${a.employee?.name || 'Resource'} - ${a.project?.projectName || 'Project'} (${a.allocationPercentage}%)`,
        start: a.startDate,
        end: a.endDate,
        resourceId: a.employee?._id,
        meta: {
            role: a.role,
            billingType: a.billingType,
            billingRate: a.billingRate
        }
    }));
};

module.exports = {
    getAllocations,
    getResourcesWorkload,
    createAllocation,
    updateAllocation,
    deleteAllocation,
    getCalendarView
};
