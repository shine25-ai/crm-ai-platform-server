const bcrypt = require('bcryptjs');
const User = require('../modules/users/user.model');
const Role = require('../modules/roles/role.model');
const Lead = require('../modules/leads/lead.model');
const LeadActivity = require('../modules/leads/leadActivity.model');
const LeadNote = require('../modules/leads/leadNote.model');
const LeadFollowUp = require('../modules/leads/leadFollowUp.model');
const LeadMeeting = require('../modules/leads/leadMeeting.model');

const seedLeads = async () => {
    try {
        // 1. Get Roles
        const managerRole = await Role.findOne({ roleCode: 'SALES_MANAGER' });
        const execRole = await Role.findOne({ roleCode: 'SALES_EXECUTIVE' });

        if (!managerRole || !execRole) {
            console.log(
                '⚠️ Sales Manager or Sales Executive roles not found. Ensure roleSeeder runs first.'
            );
            return;
        }

        // 2. Create default Sales Manager user if not exists
        let salesManager = await User.findOne({
            email: 'sales.manager@company.com'
        });
        if (!salesManager) {
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            salesManager = await User.create({
                name: 'Sarah Jenkins',
                email: 'sales.manager@company.com',
                password: hashedPassword,
                roleId: managerRole._id,
                status: 'Active'
            });
            console.log('` salesManager created: sales.manager@company.com');
        }

        // 3. Create default Sales Executive user if not exists
        let salesExec = await User.findOne({ email: 'sales.exec@company.com' });
        if (!salesExec) {
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            salesExec = await User.create({
                name: 'Alex Rivera',
                email: 'sales.exec@company.com',
                password: hashedPassword,
                roleId: execRole._id,
                status: 'Active'
            });
            console.log('` salesExec created: sales.exec@company.com');
        }

        // 4. Clear existing leads to ensure clean re-seeding
        await Lead.deleteMany({});
        await LeadActivity.deleteMany({});
        await LeadNote.deleteMany({});
        await LeadFollowUp.deleteMany({});
        await LeadMeeting.deleteMany({});
        console.log('🧹 Cleared existing leads and histories.');

        const mockLeads = [
            {
                leadNumber: 'LEAD-2026-0001',
                name: 'Michael Scott',
                companyName: 'Dunder Mifflin Paper Co.',
                mobile: '570-555-0143',
                email: 'michael.scott@dundermifflin.com',
                website: 'www.dundermifflin.com',
                source: 'Referral',
                status: 'New',
                priority: 'High',
                assignedTo: null,
                industry: 'Paper & Printing',
                address: {
                    street: '1725 Slough Avenue',
                    city: 'Scranton',
                    state: 'Pennsylvania',
                    zip: '18505',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Bulk paper supply for regional offices',
                    productInterest: 'Premium Copier Paper',
                    estimatedBudget: 8500,
                    expectedTimeline: '1 Month'
                }
            },
            {
                leadNumber: 'LEAD-2026-0002',
                name: 'Bruce Wayne',
                companyName: 'Wayne Enterprises',
                mobile: '607-555-9988',
                email: 'bwayne@waynecorp.com',
                website: 'www.wayneenterprises.com',
                source: 'Website',
                status: 'Assigned',
                priority: 'Critical',
                assignedTo: salesExec._id,
                industry: 'Technology & Defense',
                address: {
                    street: '1007 Mountain Drive',
                    city: 'Gotham City',
                    state: 'New Jersey',
                    zip: '07001',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Satellite tracking software and security infrastructure upgrade',
                    productInterest: 'Enterprise Security Suite',
                    estimatedBudget: 750000,
                    expectedTimeline: 'Immediate'
                }
            },
            {
                leadNumber: 'LEAD-2026-0003',
                name: 'Tony Stark',
                companyName: 'Stark Industries',
                mobile: '310-555-4680',
                email: 'tony@starkindustries.com',
                website: 'www.starkindustries.com',
                source: 'Partner',
                status: 'Contacted',
                priority: 'Critical',
                assignedTo: salesExec._id,
                industry: 'Energy & Tech',
                address: {
                    street: '10880 Malibu Point',
                    city: 'Malibu',
                    state: 'California',
                    zip: '90265',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Clean energy distribution monitoring system integration',
                    productInterest: 'IoT Central Platform',
                    estimatedBudget: 250000,
                    expectedTimeline: '3 Months'
                }
            },
            {
                leadNumber: 'LEAD-2026-0004',
                name: 'Peter Parker',
                companyName: 'Daily Bugle',
                mobile: '718-555-0199',
                email: 'pparker@dailybugle.com',
                website: 'www.dailybugle.com',
                source: 'Cold Call',
                status: 'Qualified',
                priority: 'Low',
                assignedTo: salesExec._id,
                industry: 'Media & News',
                address: {
                    street: '234 West 44th Street',
                    city: 'New York',
                    state: 'New York',
                    zip: '10036',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Digital media asset storage and distribution management tool',
                    productInterest: 'Cloud Storage & CDN Pack',
                    estimatedBudget: 1200,
                    expectedTimeline: '6 Months'
                }
            },
            {
                leadNumber: 'LEAD-2026-0005',
                name: 'Clark Kent',
                companyName: 'Daily Planet',
                mobile: '202-555-0112',
                email: 'ckent@dailyplanet.com',
                website: 'www.dailyplanet.com',
                source: 'Social Media',
                status: 'Won',
                priority: 'Medium',
                assignedTo: salesManager._id,
                industry: 'Media & News',
                address: {
                    street: '80 L Street',
                    city: 'Metropolis',
                    state: 'Delaware',
                    zip: '19901',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Collaborative cloud editing platform licenses',
                    productInterest: 'SaaS Editing Workspace',
                    estimatedBudget: 4500,
                    expectedTimeline: '1 Month'
                }
            },
            {
                leadNumber: 'LEAD-2026-0006',
                name: 'Lara Croft',
                companyName: 'Croft Holdings',
                mobile: '206-555-0187',
                email: 'lara.croft@croftholdings.com',
                website: 'www.croftholdings.com',
                source: 'Partner',
                status: 'New',
                priority: 'High',
                assignedTo: null,
                industry: 'Archaeology & Heritage',
                address: {
                    street: 'Abbingdon Manor',
                    city: 'Guildford',
                    state: 'Surrey',
                    zip: 'GU5 9QQ',
                    country: 'UK'
                },
                requirements: {
                    businessRequirement:
                        'Security system tracking and asset logging tool',
                    productInterest: 'Secure Asset Register',
                    estimatedBudget: 95000,
                    expectedTimeline: '2 Months'
                }
            },
            {
                leadNumber: 'LEAD-2026-0007',
                name: 'Diana Prince',
                companyName: 'Themyscira Antiques',
                mobile: '202-555-0177',
                email: 'diana@themyscira.org',
                website: 'www.themyscira.org',
                source: 'Referral',
                status: 'Assigned',
                priority: 'Medium',
                assignedTo: salesExec._id,
                industry: 'Art & Antiquities',
                address: {
                    street: '1200 Gateway Blvd',
                    city: 'Washington',
                    state: 'DC',
                    zip: '20001',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Inventory database with encrypted cloud backup',
                    productInterest: 'Database Cloud Backup',
                    estimatedBudget: 15000,
                    expectedTimeline: '3 Months'
                }
            },
            {
                leadNumber: 'LEAD-2026-0008',
                name: 'Barry Allen',
                companyName: 'S.T.A.R. Labs',
                mobile: '503-555-0155',
                email: 'ballen@starlabs.com',
                website: 'www.starlabs.com',
                source: 'Website',
                status: 'Proposal Sent',
                priority: 'High',
                assignedTo: salesExec._id,
                industry: 'Research & Science',
                address: {
                    street: '2000 Central Ave',
                    city: 'Central City',
                    state: 'Ohio',
                    zip: '44001',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'High-speed data compute log tools and dashboard analytics',
                    productInterest: 'Data Analytics Engine',
                    estimatedBudget: 120000,
                    expectedTimeline: '1 Month'
                }
            },
            {
                leadNumber: 'LEAD-2026-0009',
                name: 'Arthur Curry',
                companyName: 'Atlantis Seafoods',
                mobile: '207-555-0166',
                email: 'acurry@atlantisseafoods.com',
                website: 'www.atlantisseafoods.com',
                source: 'Other',
                status: 'Negotiation',
                priority: 'Low',
                assignedTo: salesExec._id,
                industry: 'Logistics & Food Service',
                address: {
                    street: '1 Lighthouse Point',
                    city: 'Amnesty Bay',
                    state: 'Maine',
                    zip: '04001',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Cold chain supply logistics tracking integration',
                    productInterest: 'Logistics Tracker Pro',
                    estimatedBudget: 45000,
                    expectedTimeline: '3 Months'
                }
            },
            {
                leadNumber: 'LEAD-2026-0010',
                name: 'Hal Jordan',
                companyName: 'Ferris Aircraft',
                mobile: '213-555-0122',
                email: 'hjordan@ferrisaircraft.com',
                website: 'www.ferrisaircraft.com',
                source: 'Partner',
                status: 'Lost',
                priority: 'Medium',
                assignedTo: salesManager._id,
                industry: 'Aerospace & Aviation',
                address: {
                    street: '7000 Airport Road',
                    city: 'Coast City',
                    state: 'California',
                    zip: '90045',
                    country: 'USA'
                },
                requirements: {
                    businessRequirement:
                        'Flight simulation telemetry data hosting package',
                    productInterest: 'Cloud Telemetry Vault',
                    estimatedBudget: 85000,
                    expectedTimeline: '6 Months'
                }
            }
        ];

        const seededLeads = await Lead.insertMany(mockLeads);
        console.log(`✅ Seeded ${seededLeads.length} mock leads successfully.`);

        // 5. Seed Activities, Notes, Meetings, and Followups for the seeded leads to populate tabs
        for (const lead of seededLeads) {
            // Log creation activity
            await LeadActivity.create({
                leadId: lead._id,
                activityType: 'Lead Created',
                description: `Lead created from source: ${lead.source}`,
                createdBy: salesManager._id
            });

            if (lead.assignedTo) {
                // Log assignment activity
                await LeadActivity.create({
                    leadId: lead._id,
                    activityType: 'Assignment Changed',
                    description: `Lead assigned to user: ${lead.assignedTo.toString() === salesManager._id.toString() ? 'Sarah Jenkins' : 'Alex Rivera'}`,
                    createdBy: salesManager._id
                });
            }

            if (
                lead.status === 'Contacted' ||
                lead.status === 'Qualified' ||
                lead.status === 'Won' ||
                lead.status === 'Proposal Sent' ||
                lead.status === 'Negotiation'
            ) {
                // Note
                const note = await LeadNote.create({
                    leadId: lead._id,
                    content:
                        'Initial call completed. Requester showed heavy interest in enterprise license features.',
                    createdBy: salesExec._id
                });

                await LeadActivity.create({
                    leadId: lead._id,
                    activityType: 'Note Added',
                    description: `Logged a note: "${note.content.substring(0, 40)}..."`,
                    createdBy: salesExec._id
                });

                // FollowUp
                await LeadFollowUp.create({
                    leadId: lead._id,
                    followUpDate: new Date(
                        Date.now() + 3 * 24 * 60 * 60 * 1000
                    ), // 3 days in future
                    type: 'Call',
                    comments: 'Follow up on the pricing structures sheet sent.',
                    status: 'Scheduled',
                    createdBy: salesExec._id
                });

                await LeadActivity.create({
                    leadId: lead._id,
                    activityType: 'Follow-Up Scheduled',
                    description: 'Scheduled follow-up call in 3 days',
                    createdBy: salesExec._id
                });
            }

            if (
                lead.status === 'Qualified' ||
                lead.status === 'Won' ||
                lead.status === 'Negotiation'
            ) {
                // Meeting log
                await LeadMeeting.create({
                    leadId: lead._id,
                    meetingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
                    location: 'Zoom Conference',
                    participants: [lead.name, 'Alex Rivera'],
                    outcome:
                        'BANT criteria verified. Customer budget matches high-tier pricing tier.',
                    createdBy: salesExec._id
                });

                await LeadActivity.create({
                    leadId: lead._id,
                    activityType: 'Meeting Completed',
                    description:
                        'Completed technical qualification alignment meeting via Zoom',
                    createdBy: salesExec._id
                });
            }
        }

        console.log(
            '✅ Lead sub-items and history log timeline seeded successfully.'
        );
    } catch (error) {
        console.error('❌ Error seeding leads:', error);
    }
};

module.exports = seedLeads;
