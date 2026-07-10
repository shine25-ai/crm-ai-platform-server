const mongoose = require('mongoose');
const Customer = require('../modules/customers/customer.model');
const Employee = require('../modules/employees/employee.model');
const Department = require('../modules/departments/department.model');
const User = require('../modules/users/user.model');
const Project = require('../modules/projects/project.model');
const ResourceAllocation = require('../modules/resourcePlanning/resourceAllocation.model');
const Invoice = require('../modules/billing/invoice.model');
const Timesheet = require('../modules/timesheets/timesheet.model');
const Document = require('../modules/documents/document.model');
const Issue = require('../modules/issues/issue.model');

const seedPhase5 = async () => {
    try {
        console.log('🌱 Seeding Phase 5: Projects & Operations...');

        // Clear existing Phase 5 data
        await Project.deleteMany({});
        await ResourceAllocation.deleteMany({});
        await Invoice.deleteMany({});
        await Timesheet.deleteMany({});
        await Document.deleteMany({});
        await Issue.deleteMany({});

        // Fetch dependent records
        const customers = await Customer.find({});
        const employees = await Employee.find({});
        const departments = await Department.find({});
        const users = await User.find({});

        if (
            customers.length === 0 ||
            employees.length === 0 ||
            departments.length === 0 ||
            users.length === 0
        ) {
            console.log(
                '⚠️ Missing prerequisites: make sure roles, users, employees, departments, and customers are seeded first.'
            );
            return;
        }

        const customer = customers[0];
        const department = departments[0];
        const projectManager =
            employees.find((e) =>
                e.designation.toLowerCase().includes('manager')
            ) || employees[0];
        const adminUser =
            users.find((u) => u.email === 'asjawahartsy@gmail.com') || users[0];

        // 1. Seed Projects
        const projects = await Project.create([
            {
                projectName: 'Alpha Portal Development',
                customer: customer._id,
                department: department._id,
                projectManager: projectManager._id,
                startDate: new Date('2026-06-01'),
                endDate: new Date('2026-12-31'),
                priority: 'High',
                status: 'Active',
                budget: 150000,
                description:
                    'End-to-end development of the customer-facing core service dashboard.',
                milestones: [
                    {
                        name: 'Wireframes & UI Design',
                        status: 'Completed',
                        dueDate: new Date('2026-06-30')
                    },
                    {
                        name: 'Backend Core APIs',
                        status: 'Completed',
                        dueDate: new Date('2026-08-30')
                    },
                    {
                        name: 'Beta Launch',
                        status: 'Pending',
                        dueDate: new Date('2026-10-31')
                    },
                    {
                        name: 'Final Delivery',
                        status: 'Pending',
                        dueDate: new Date('2026-12-15')
                    }
                ],
                activityHistory: [
                    {
                        action: 'Project Created',
                        details: 'Project initialized.',
                        performedBy: adminUser._id
                    }
                ]
            },
            {
                projectName: 'Beta Mobile App QA',
                customer: customer._id,
                department: department._id,
                projectManager: projectManager._id,
                startDate: new Date('2026-07-01'),
                endDate: new Date('2026-09-30'),
                priority: 'Medium',
                status: 'Planned',
                budget: 50000,
                description:
                    'Regression testing and performance QA for iOS and Android apps.',
                milestones: [
                    {
                        name: 'Test Plan Approval',
                        status: 'Completed',
                        dueDate: new Date('2026-07-15')
                    },
                    {
                        name: 'Sprint 1 Bug Hunt',
                        status: 'Pending',
                        dueDate: new Date('2026-08-15')
                    }
                ],
                activityHistory: [
                    {
                        action: 'Project Created',
                        details: 'Project QA roadmap created.',
                        performedBy: adminUser._id
                    }
                ]
            }
        ]);
        console.log(`✅ Seeded ${projects.length} Projects.`);

        // 2. Seed Resource Allocations
        const project = projects[0];
        const qaProject = projects[1];

        // Seed skills to employees for visual search
        const skillSets = [
            'React',
            'NodeJS',
            'QA Testing',
            'UI Design',
            'Figma',
            'AWS'
        ];
        for (let i = 0; i < employees.length; i++) {
            const index1 = i % skillSets.length;
            const index2 = (i + 2) % skillSets.length;
            employees[i].skills = [skillSets[index1], skillSets[index2]];
            await employees[i].save();
        }

        const allocations = await ResourceAllocation.create([
            {
                employee: employees[0]._id,
                project: project._id,
                allocationPercentage: 60,
                role: 'Lead Frontend Developer',
                startDate: new Date('2026-06-01'),
                endDate: new Date('2026-12-31'),
                billingType: 'Billable',
                billingRate: 75,
                assignedBy: adminUser._id
            },
            {
                employee: employees[1 % employees.length]._id,
                project: project._id,
                allocationPercentage: 40,
                role: 'Senior UI/UX Designer',
                startDate: new Date('2026-06-01'),
                endDate: new Date('2026-08-30'),
                billingType: 'Billable',
                billingRate: 60,
                assignedBy: adminUser._id
            },
            {
                employee: employees[0]._id,
                project: qaProject._id,
                allocationPercentage: 30, // total allocation for employee[0] is 60+30 = 90% (<100%)
                role: 'QA Engineer',
                startDate: new Date('2026-07-01'),
                endDate: new Date('2026-09-30'),
                billingType: 'Billable',
                billingRate: 50,
                assignedBy: adminUser._id
            }
        ]);
        console.log(`✅ Seeded ${allocations.length} Resource Allocations.`);

        // 3. Seed Timesheets
        const timesheets = await Timesheet.create([
            {
                employee: employees[0]._id,
                project: project._id,
                activity: 'UI Core Implementation',
                date: new Date('2026-07-01'),
                startTime: '09:00',
                endTime: '17:00',
                totalHours: 8,
                billingType: 'Billable',
                description:
                    'Integrated theme system and sidebar layout components.',
                status: 'Approved',
                submittedAt: new Date('2026-07-01T17:00:00Z'),
                approvedBy: adminUser._id,
                approvedAt: new Date('2026-07-02T10:00:00Z')
            },
            {
                employee: employees[0]._id,
                project: project._id,
                activity: 'API Integration',
                date: new Date('2026-07-02'),
                startTime: '09:00',
                endTime: '18:00',
                totalHours: 9,
                billingType: 'Billable',
                description:
                    'Linked dashboard charts with real-time sales APIs.',
                status: 'Submitted',
                submittedAt: new Date('2026-07-02T18:00:00Z')
            },
            {
                employee: employees[1 % employees.length]._id,
                project: project._id,
                activity: 'High-Fi Mockups',
                date: new Date('2026-06-15'),
                startTime: '10:00',
                endTime: '16:00',
                totalHours: 6,
                billingType: 'Billable',
                description: 'Polished glassmorphism styles and color schemes.',
                status: 'Approved',
                submittedAt: new Date('2026-06-15T16:00:00Z'),
                approvedBy: adminUser._id,
                approvedAt: new Date('2026-06-16T09:00:00Z')
            }
        ]);
        console.log(`✅ Seeded ${timesheets.length} Timesheet records.`);

        // 4. Seed Invoices (Billing)
        const invoices = await Invoice.create([
            {
                invoiceNumber: 'INV-2026-0001',
                project: project._id,
                customer: customer._id,
                billingType: 'Fixed cost',
                paymentSchedule: 'Advance payment',
                amount: 15000,
                taxRate: 18,
                taxAmount: 2700,
                totalAmount: 17700,
                paidAmount: 17700,
                status: 'Paid',
                issueDate: new Date('2026-06-05'),
                dueDate: new Date('2026-06-20'),
                template: 'Standard',
                paymentHistory: [
                    {
                        paymentDate: new Date('2026-06-10'),
                        amount: 17700,
                        paymentMode: 'Bank Transfer',
                        referenceNumber: 'TXN-982341235',
                        notes: 'Initial project kickoff payment.'
                    }
                ],
                notes: 'Welcome invoice for project setup.',
                createdBy: adminUser._id
            },
            {
                invoiceNumber: 'INV-2026-0002',
                project: project._id,
                customer: customer._id,
                billingType: 'Milestone billing',
                paymentSchedule: 'Milestone payment',
                amount: 25000,
                taxRate: 18,
                taxAmount: 4500,
                totalAmount: 29500,
                paidAmount: 0,
                status: 'Sent',
                issueDate: new Date('2026-07-01'),
                dueDate: new Date('2026-07-15'),
                template: 'Professional',
                paymentHistory: [],
                notes: 'Invoiced upon completion of wireframe design milestone.',
                createdBy: adminUser._id
            }
        ]);
        console.log(`✅ Seeded ${invoices.length} Invoices.`);

        // 5. Seed Documents
        const documents = await Document.create([
            {
                title: 'Project Kickoff Charter',
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
                        uploadedBy: adminUser._id,
                        uploadedDate: new Date()
                    }
                ],
                accessLevel: 'Employee',
                uploadedBy: adminUser._id,
                auditHistory: [
                    {
                        action: 'Uploaded',
                        performedBy: adminUser._id,
                        details: 'Initial project charter uploaded.'
                    }
                ]
            }
        ]);
        console.log(`✅ Seeded ${documents.length} Documents.`);

        // 6. Seed Issues
        const issues = await Issue.create([
            {
                title: 'Header responsive rendering lag',
                description:
                    'The dashboard header clips on iOS Safari when rotating to landscape mode.',
                project: project._id,
                reportedBy: adminUser._id,
                assignedTo: adminUser._id,
                priority: 'High',
                severity: 'Medium',
                status: 'Open',
                dueDate: new Date('2026-07-20'),
                attachments: [],
                comments: [
                    {
                        comment:
                            'Investigating if CSS transition styles are conflicting.',
                        createdBy: adminUser._id
                    }
                ],
                activityHistory: [
                    {
                        action: 'Issue Created',
                        details: 'Header bug reported.',
                        performedBy: adminUser._id
                    }
                ]
            },
            {
                title: 'Timesheet submission check-in crash',
                description:
                    'App crashes if an employee does not have any attendance record for the day and submits a timesheet with blank hours.',
                project: project._id,
                reportedBy: adminUser._id,
                assignedTo: adminUser._id,
                priority: 'Critical',
                severity: 'Blocker',
                status: 'In Progress',
                dueDate: new Date('2026-07-10'),
                attachments: [],
                comments: [],
                activityHistory: [
                    {
                        action: 'Issue Created',
                        details: 'Critical crash logged.',
                        performedBy: adminUser._id
                    }
                ]
            }
        ]);
        console.log(`✅ Seeded ${issues.length} Issues.`);
    } catch (error) {
        console.error('❌ Phase 5 Seeding failed:', error);
    }
};

module.exports = seedPhase5;
