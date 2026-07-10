const Project = require('./project.model');
const Task = require('../tasks/task.model');
const Issue = require('../issues/issue.model');
const Timesheet = require('../timesheets/timesheet.model');
const Invoice = require('../billing/invoice.model');
const ResourceAllocation = require('../resourcePlanning/resourceAllocation.model');
const AppError = require('../../shared/utils/appError');

const createProject = async (data, userId) => {
    // 1. Create Project with milestones automatically pre-seeded if not present
    const projectMilestones =
        data.milestones && data.milestones.length > 0
            ? data.milestones
            : [
                  {
                      name: 'Project Initiation & Setup',
                      description:
                          'Define requirements, initialize git repositories, and align design specs.',
                      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // +10 days
                      status: 'Completed'
                  },
                  {
                      name: 'Core API & System Integration',
                      description:
                          'Implement database schemas, controller models, and telemetry pipelines.',
                      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                      status: 'Pending'
                  },
                  {
                      name: 'Dashboard UI & Final Handover',
                      description:
                          'Build UI widgets, integrate widgets with API endpoints, and release platform extension.',
                      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 days
                      status: 'Pending'
                  }
              ];

    const project = await Project.create({
        ...data,
        milestones: projectMilestones,
        activityHistory: [
            {
                action: 'Project Created',
                details: `Project "${data.projectName}" initialized.`,
                performedBy: userId
            }
        ]
    });

    // 2. Seed Tasks associated with this project
    const assignee = data.projectManager || userId;
    const taskSeeds = [
        {
            title: 'Set up MongoDB schemas and project model structures',
            description:
                'Register schema definitions, configure index optimizations, and export modules.',
            assignedBy: userId,
            assignedTo: assignee,
            priority: 'High',
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            progress: 100,
            status: 'Completed',
            project: project._id
        },
        {
            title: 'Configure telemetry logs and API metrics collection',
            description:
                'Integrate logger middleware, trace performance metrics, and build endpoints.',
            assignedBy: userId,
            assignedTo: assignee,
            priority: 'Critical',
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            progress: 40,
            status: 'In Progress',
            project: project._id
        },
        {
            title: 'Design layouts and components for billing dashboard',
            description:
                'Standardize palette guidelines, build responsive widgets, and style typography.',
            assignedBy: userId,
            assignedTo: assignee,
            priority: 'Medium',
            dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
            progress: 0,
            status: 'Open',
            project: project._id
        }
    ];

    // Create Tasks in DB
    await Task.create(taskSeeds);

    // 3. Seed Documents associated with this project
    const Document = require('../documents/document.model'); // Import inside to prevent circular dependency
    const docSeeds = [
        {
            title: 'Project Charter & Technical Spec',
            category: 'Contract',
            relatedModule: 'Project',
            relatedId: project._id,
            fileName: 'project-charter.pdf',
            filePath:
                'https://crmai.s3.ap-south-1.amazonaws.com/employee-documents/mock-charter.pdf',
            fileSize: 1048576,
            mimeType: 'application/pdf',
            version: 1,
            versions: [
                {
                    versionNumber: 1,
                    filePath:
                        'https://crmai.s3.ap-south-1.amazonaws.com/employee-documents/mock-charter.pdf',
                    fileName: 'project-charter.pdf',
                    uploadedBy: userId,
                    uploadedDate: new Date()
                }
            ],
            accessLevel: 'Employee',
            uploadedBy: userId,
            auditHistory: [
                {
                    action: 'Uploaded',
                    performedBy: userId,
                    details: 'Initial project charter uploaded.'
                }
            ]
        },
        {
            title: 'API Endpoints & Metrics Spec',
            category: 'Proposal',
            relatedModule: 'Project',
            relatedId: project._id,
            fileName: 'api-spec.pdf',
            filePath:
                'https://crmai.s3.ap-south-1.amazonaws.com/employee-documents/mock-spec.pdf',
            fileSize: 524288,
            mimeType: 'application/pdf',
            version: 1,
            versions: [
                {
                    versionNumber: 1,
                    filePath:
                        'https://crmai.s3.ap-south-1.amazonaws.com/employee-documents/mock-spec.pdf',
                    fileName: 'api-spec.pdf',
                    uploadedBy: userId,
                    uploadedDate: new Date()
                }
            ],
            accessLevel: 'Employee',
            uploadedBy: userId,
            auditHistory: [
                {
                    action: 'Uploaded',
                    performedBy: userId,
                    details: 'Initial API spec doc uploaded.'
                }
            ]
        }
    ];

    // Create Documents in DB
    await Document.create(docSeeds);

    return project;
};

const getProjects = async (filters = {}) => {
    const query = {};
    if (filters.search) {
        query.projectName = { $regex: filters.search, $options: 'i' };
    }
    if (filters.customer) query.customer = filters.customer;
    if (filters.department) query.department = filters.department;
    if (filters.projectManager) query.projectManager = filters.projectManager;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.isArchived !== undefined) {
        query.isArchived =
            filters.isArchived === 'true' || filters.isArchived === true;
    } else {
        query.isArchived = false; // default to active
    }

    return Project.find(query)
        .populate('customer', 'customerName companyName')
        .populate('department', 'departmentName')
        .populate('projectManager', 'name email designation')
        .sort({ createdAt: -1 });
};

const getProjectById = async (id) => {
    const project = await Project.findById(id)
        .populate('customer', 'customerName companyName')
        .populate('department', 'departmentName')
        .populate('projectManager', 'name email designation');
    if (!project) throw new AppError('Project not found', 404);
    return project;
};

const updateProject = async (id, data, userId) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    const oldStatus = project.status;
    Object.assign(project, data);

    if (data.status && data.status !== oldStatus) {
        project.activityHistory.push({
            action: 'Status Changed',
            details: `Project status updated from "${oldStatus}" to "${data.status}".`,
            performedBy: userId
        });
    } else {
        project.activityHistory.push({
            action: 'Project Updated',
            details: `Project details updated.`,
            performedBy: userId
        });
    }

    await project.save();
    return project;
};

const toggleArchive = async (id, userId) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    project.isArchived = !project.isArchived;
    project.activityHistory.push({
        action: project.isArchived ? 'Project Archived' : 'Project Restored',
        details: project.isArchived
            ? 'Project moved to archive.'
            : 'Project restored from archive.',
        performedBy: userId
    });

    await project.save();
    return project;
};

const addMilestone = async (id, milestoneData, userId) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    project.milestones.push(milestoneData);
    project.activityHistory.push({
        action: 'Milestone Added',
        details: `Milestone "${milestoneData.name}" added.`,
        performedBy: userId
    });

    await project.save();
    return project;
};

const updateMilestone = async (id, milestoneId, milestoneData, userId) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) throw new AppError('Milestone not found', 404);

    const oldStatus = milestone.status;
    Object.assign(milestone, milestoneData);

    if (milestoneData.status && milestoneData.status !== oldStatus) {
        project.activityHistory.push({
            action: 'Milestone Updated',
            details: `Milestone "${milestone.name}" status updated to "${milestoneData.status}".`,
            performedBy: userId
        });
    } else {
        project.activityHistory.push({
            action: 'Milestone Updated',
            details: `Milestone "${milestone.name}" details updated.`,
            performedBy: userId
        });
    }

    await project.save();
    return project;
};

const deleteMilestone = async (id, milestoneId, userId) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    const milestone = project.milestones.id(milestoneId);
    if (!milestone) throw new AppError('Milestone not found', 404);

    project.milestones.pull(milestoneId);
    project.activityHistory.push({
        action: 'Milestone Deleted',
        details: `Milestone "${milestone.name}" deleted.`,
        performedBy: userId
    });

    await project.save();
    return project;
};

const getDashboardStats = async (id) => {
    const project = await Project.findById(id);
    if (!project) throw new AppError('Project not found', 404);

    // 1. Progress %
    let progress = 0;
    if (project.milestones && project.milestones.length > 0) {
        const completedMilestones = project.milestones.filter(
            (m) => m.status === 'Completed'
        ).length;
        progress = Math.round(
            (completedMilestones / project.milestones.length) * 100
        );
    } else {
        // Fallback: Tasks progress
        const tasks = await Task.find({ project: id, isDeleted: false });
        if (tasks.length > 0) {
            const completedTasks = tasks.filter(
                (t) => t.status === 'Completed'
            ).length;
            progress = Math.round((completedTasks / tasks.length) * 100);
        }
    }

    // 2. Pending Tasks
    const pendingTasks = await Task.countDocuments({
        project: id,
        status: { $in: ['Open', 'In Progress', 'On Hold'] },
        isDeleted: false
    });

    // 3. Open Issues
    const openIssues = await Issue.countDocuments({
        project: id,
        status: { $in: ['Open', 'In Progress', 'Reopened'] }
    });

    // 4. Logged Hours (from Approved timesheets)
    const approvedTimesheets = await Timesheet.find({
        project: id,
        status: 'Approved'
    });
    const loggedHours = approvedTimesheets.reduce(
        (acc, curr) => acc + curr.totalHours,
        0
    );

    // 5. Budget vs Actual
    // Compute actual spend from timesheets * allocation rate or generic rate
    const allocations = await ResourceAllocation.find({ project: id });
    let actualSpend = 0;

    // For each approved timesheet entry, determine the billing rate
    for (const ts of approvedTimesheets) {
        // Find allocation for that timesheet employee
        const alloc = allocations.find(
            (a) => String(a.employee) === String(ts.employee)
        );
        const rate = alloc ? alloc.billingRate : 50; // default rate of $50/hour if not found
        actualSpend += ts.totalHours * rate;
    }

    // 6. Billing Status (Total invoiced, Total paid)
    const invoices = await Invoice.find({ project: id });
    const totalInvoiced = invoices.reduce(
        (acc, curr) => acc + curr.totalAmount,
        0
    );
    const totalCollected = invoices.reduce(
        (acc, curr) => acc + curr.paidAmount,
        0
    );
    const outstandingAmount = totalInvoiced - totalCollected;

    return {
        progress,
        pendingTasks,
        openIssues,
        loggedHours,
        budget: project.budget,
        actualSpend,
        billingStatus: {
            totalInvoiced,
            totalCollected,
            outstandingAmount
        }
    };
};

module.exports = {
    createProject,
    getProjects,
    getProjectById,
    updateProject,
    toggleArchive,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    getDashboardStats
};
