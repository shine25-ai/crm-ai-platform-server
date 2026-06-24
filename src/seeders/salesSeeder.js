const Customer = require('../modules/customers/customer.model');
const User = require('../modules/users/user.model');
const {
    SalesOpportunity,
    SalesQuotation,
    SalesFollowUp,
    SalesMeeting
} = require('../modules/sales/sales.model');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const calculateItems = (items) => {
    let subTotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    const nextItems = items.map((item) => {
        const lineBase =
            Number(item.quantity || 0) * Number(item.unitPrice || 0);
        const lineTax = (lineBase * Number(item.taxRate || 0)) / 100;
        const discount = Number(item.discount || 0);
        const total = lineBase + lineTax - discount;
        subTotal += lineBase;
        taxAmount += lineTax;
        discountAmount += discount;
        return { ...item, total };
    });

    return {
        items: nextItems,
        subTotal,
        taxAmount,
        discountAmount,
        totalAmount: subTotal + taxAmount - discountAmount
    };
};

const seedSales = async () => {
    try {
        const [customers, users] = await Promise.all([
            Customer.find().sort({ createdAt: 1 }).lean(),
            User.find({ status: 'Active' }).lean()
        ]);

        if (customers.length === 0 || users.length === 0) {
            console.log('Sales seed skipped: customers or users missing');
            return;
        }

        const pickCustomer = (index) => customers[index % customers.length];
        const pickUser = (index) => users[index % users.length];

        const opportunities = [
            {
                opportunityName: 'Retail Analytics Expansion',
                customerId: pickCustomer(0)._id,
                dealValue: 650000,
                stage: 'Proposal',
                probability: 65,
                expectedClosingDate: daysFromNow(21),
                assignedTo: pickUser(0)._id,
                status: 'Open',
                notes: 'Expansion opportunity for warehouse analytics.'
            },
            {
                opportunityName: 'Partner Enterprise Rollout',
                customerId: pickCustomer(1)._id,
                dealValue: 1250000,
                stage: 'Negotiation',
                probability: 72,
                expectedClosingDate: daysFromNow(34),
                assignedTo: pickUser(1)._id,
                status: 'Open',
                notes: 'Joint rollout with channel partner.'
            },
            {
                opportunityName: 'WhatsApp Automation Upgrade',
                customerId: pickCustomer(2)._id,
                dealValue: 88000,
                stage: 'Discovery',
                probability: 45,
                expectedClosingDate: daysFromNow(18),
                assignedTo: pickUser(2)._id,
                status: 'Open',
                notes: 'Upgrade for automated follow-up journeys.'
            },
            {
                opportunityName: 'Distributor Reactivation Plan',
                customerId: pickCustomer(3)._id,
                dealValue: 410000,
                stage: 'Qualification',
                probability: 25,
                expectedClosingDate: daysFromNow(45),
                assignedTo: pickUser(3)._id,
                status: 'On Hold',
                notes: 'Dependent on outstanding payment clearance.'
            }
        ];

        const savedOpportunities = [];
        for (const opportunity of opportunities) {
            const saved = await SalesOpportunity.findOneAndUpdate(
                { opportunityName: opportunity.opportunityName },
                opportunity,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            savedOpportunities.push(saved);
        }

        const quotationSeed = [
            {
                quotationNumber: 'QT-2026-1001',
                customerId: pickCustomer(0)._id,
                opportunityId: savedOpportunities[0]._id,
                quotationDate: daysAgo(4),
                validUntil: daysFromNow(26),
                status: 'Sent',
                sentAt: daysAgo(3),
                items: [
                    {
                        name: 'Analytics Expansion License',
                        description: 'Additional warehouse analytics seats',
                        quantity: 1,
                        unitPrice: 520000,
                        taxRate: 18,
                        discount: 20000
                    },
                    {
                        name: 'Implementation Services',
                        description: 'Configuration and onboarding',
                        quantity: 1,
                        unitPrice: 95000,
                        taxRate: 18,
                        discount: 0
                    }
                ]
            },
            {
                quotationNumber: 'QT-2026-1002',
                customerId: pickCustomer(1)._id,
                opportunityId: savedOpportunities[1]._id,
                quotationDate: daysAgo(2),
                validUntil: daysFromNow(28),
                status: 'Draft',
                items: [
                    {
                        name: 'Enterprise Rollout Package',
                        description: 'Partner implementation bundle',
                        quantity: 1,
                        unitPrice: 980000,
                        taxRate: 18,
                        discount: 50000
                    }
                ]
            }
        ];

        for (const quotation of quotationSeed) {
            await SalesQuotation.findOneAndUpdate(
                { quotationNumber: quotation.quotationNumber },
                { ...quotation, ...calculateItems(quotation.items) },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }

        const followUps = [
            {
                relatedType: 'Opportunity',
                opportunityId: savedOpportunities[0]._id,
                followUpType: 'Call',
                followUpDate: daysFromNow(1),
                followUpTime: '10:30',
                assignedTo: pickUser(0)._id,
                priority: 'High',
                notes: 'Confirm procurement review and budget approval.',
                status: 'Pending'
            },
            {
                relatedType: 'Customer',
                customerId: pickCustomer(1)._id,
                followUpType: 'Email',
                followUpDate: daysFromNow(3),
                followUpTime: '14:00',
                assignedTo: pickUser(1)._id,
                priority: 'Medium',
                notes: 'Share revised partner commercial terms.',
                status: 'Pending'
            },
            {
                relatedType: 'Customer',
                customerId: pickCustomer(2)._id,
                followUpType: 'Demo',
                followUpDate: daysAgo(1),
                followUpTime: '16:30',
                assignedTo: pickUser(2)._id,
                priority: 'Medium',
                notes: 'Completed mobile workflow walkthrough.',
                status: 'Completed'
            }
        ];

        for (const followUp of followUps) {
            await SalesFollowUp.findOneAndUpdate(
                {
                    notes: followUp.notes,
                    assignedTo: followUp.assignedTo
                },
                followUp,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }

        const meetings = [
            {
                meetingTitle: 'Northstar Analytics Proposal Review',
                relatedType: 'Customer',
                customerId: pickCustomer(0)._id,
                meetingDate: daysFromNow(2),
                startTime: '11:00',
                endTime: '11:45',
                meetingType: 'Online',
                locationOrLink: 'https://meet.example.com/northstar-review',
                assignedTo: pickUser(0)._id,
                meetingNotes:
                    'Review pricing, rollout timeline, and success criteria.',
                outcome: '',
                status: 'Scheduled'
            },
            {
                meetingTitle: 'BluePeak Partner Commercial Discussion',
                relatedType: 'Customer',
                customerId: pickCustomer(1)._id,
                meetingDate: daysFromNow(5),
                startTime: '15:00',
                endTime: '16:00',
                meetingType: 'Online',
                locationOrLink: 'https://meet.example.com/bluepeak-commercials',
                assignedTo: pickUser(1)._id,
                meetingNotes: 'Finalize enterprise rollout scope.',
                outcome: '',
                status: 'Scheduled'
            },
            {
                meetingTitle: 'Patel Hardware Training Review',
                relatedType: 'Customer',
                customerId: pickCustomer(2)._id,
                meetingDate: daysAgo(4),
                startTime: '12:00',
                endTime: '12:30',
                meetingType: 'Phone',
                locationOrLink: '+91 98220 11445',
                assignedTo: pickUser(2)._id,
                meetingNotes: 'Reviewed staff adoption and pending questions.',
                outcome: 'Training checklist completed.',
                status: 'Completed'
            }
        ];

        for (const meeting of meetings) {
            await SalesMeeting.findOneAndUpdate(
                {
                    meetingTitle: meeting.meetingTitle,
                    customerId: meeting.customerId
                },
                meeting,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }

        console.log('Sales sample data seeded');
    } catch (error) {
        console.error('Error seeding sales sample data:', error);
    }
};

module.exports = seedSales;
