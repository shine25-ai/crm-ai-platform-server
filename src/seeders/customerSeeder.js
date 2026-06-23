const Customer = require('../modules/customers/customer.model');
const User = require('../modules/users/user.model');

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const sampleFileUrl = (name) =>
    `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf#${name}`;

const buildAddress = (city, state, postalCode) => ({
    line1: 'Plot 42, Business Park',
    line2: 'Phase II',
    city,
    state,
    postalCode,
    country: 'India'
});

const buildDocument = (uploadedBy, documentName, documentType, fileName) => ({
    documentName,
    documentType,
    fileName,
    filePath: sampleFileUrl(fileName),
    fileSize: 13264,
    mimeType: 'application/pdf',
    uploadedBy,
    uploadedDate: daysAgo(8)
});

const seedCustomers = async () => {
    try {
        const users = await User.find({ status: 'Active' }).lean();
        if (users.length === 0) {
            console.log('Customer seed skipped: no active users found');
            return;
        }

        const assignedUsers = users.slice(0, 4);
        const fallbackUser = assignedUsers[0];
        const pickUser = (index) =>
            assignedUsers[index % assignedUsers.length]?._id ||
            fallbackUser._id;

        const customerSeedData = [
            {
                customerName: 'Aarav Sharma',
                companyName: 'Northstar Retail Pvt Ltd',
                mobileNumber: '+91 98765 43011',
                email: 'accounts@northstarretail.in',
                customerType: 'Company',
                status: 'Active',
                assignedTo: pickUser(0),
                gstNumber: '29AABCN1234M1Z5',
                panNumber: 'AABCN1234M',
                billingAddress: buildAddress(
                    'Bengaluru',
                    'Karnataka',
                    '560037'
                ),
                shippingAddress: buildAddress(
                    'Bengaluru',
                    'Karnataka',
                    '560048'
                ),
                revenueSummary: {
                    totalRevenue: 2480000,
                    outstandingAmount: 185000,
                    lastTransactionDate: daysAgo(12)
                },
                orderSummary: {
                    totalOrders: 18,
                    lastOrderDate: daysAgo(12),
                    transactions: [
                        {
                            title: 'Retail CRM implementation phase 2',
                            amount: 420000,
                            date: daysAgo(12),
                            status: 'Completed'
                        },
                        {
                            title: 'Support renewal',
                            amount: 185000,
                            date: daysAgo(32),
                            status: 'Pending'
                        }
                    ]
                },
                openOpportunities: [
                    {
                        title: 'Warehouse automation add-on',
                        value: 650000,
                        stage: 'Proposal',
                        expectedCloseDate: daysFromNow(21)
                    }
                ],
                contacts: [
                    {
                        contactName: 'Priya Nair',
                        designation: 'Finance Manager',
                        department: 'Finance',
                        mobileNumber: '+91 98800 12011',
                        email: 'priya.nair@northstarretail.in',
                        isPrimaryContact: true
                    },
                    {
                        contactName: 'Rohan Iyer',
                        designation: 'Operations Lead',
                        department: 'Operations',
                        mobileNumber: '+91 98800 12012',
                        email: 'rohan.iyer@northstarretail.in',
                        isPrimaryContact: false
                    }
                ],
                followUps: [
                    {
                        title: 'Payment follow-up',
                        note: 'Finance team requested revised payment schedule.',
                        date: daysAgo(3),
                        createdBy: pickUser(0)
                    },
                    {
                        title: 'Expansion discussion',
                        note: 'Customer is evaluating inventory analytics.',
                        date: daysAgo(14),
                        createdBy: pickUser(0)
                    }
                ],
                meetings: [
                    {
                        title: 'Quarterly business review',
                        note: 'Reviewed support SLA, adoption, and next quarter plan.',
                        date: daysAgo(7),
                        createdBy: pickUser(1)
                    }
                ],
                documents: [
                    buildDocument(
                        pickUser(0),
                        'GST Certificate',
                        'GST Certificate',
                        'northstar-gst.pdf'
                    ),
                    buildDocument(
                        pickUser(0),
                        'Master Service Agreement',
                        'Agreement',
                        'northstar-msa.pdf'
                    )
                ]
            },
            {
                customerName: 'Meera Krishnan',
                companyName: 'BluePeak Consulting',
                mobileNumber: '+91 98450 76022',
                email: 'meera@bluepeakconsulting.com',
                customerType: 'Partner',
                status: 'Prospect',
                assignedTo: pickUser(1),
                gstNumber: '27AABCB9087P1Z2',
                panNumber: 'AABCB9087P',
                billingAddress: buildAddress('Mumbai', 'Maharashtra', '400076'),
                shippingAddress: buildAddress(
                    'Mumbai',
                    'Maharashtra',
                    '400076'
                ),
                revenueSummary: {
                    totalRevenue: 780000,
                    outstandingAmount: 0,
                    lastTransactionDate: daysAgo(45)
                },
                orderSummary: {
                    totalOrders: 6,
                    lastOrderDate: daysAgo(45),
                    transactions: [
                        {
                            title: 'Partner onboarding package',
                            amount: 210000,
                            date: daysAgo(45),
                            status: 'Completed'
                        }
                    ]
                },
                openOpportunities: [
                    {
                        title: 'Joint enterprise rollout',
                        value: 1250000,
                        stage: 'Negotiation',
                        expectedCloseDate: daysFromNow(34)
                    },
                    {
                        title: 'Channel enablement program',
                        value: 320000,
                        stage: 'Discovery',
                        expectedCloseDate: daysFromNow(12)
                    }
                ],
                contacts: [
                    {
                        contactName: 'Meera Krishnan',
                        designation: 'Founder',
                        department: 'Leadership',
                        mobileNumber: '+91 98450 76022',
                        email: 'meera@bluepeakconsulting.com',
                        isPrimaryContact: true
                    }
                ],
                followUps: [
                    {
                        title: 'Proposal reminder',
                        note: 'Send updated partner margin model.',
                        date: daysAgo(2),
                        createdBy: pickUser(1)
                    }
                ],
                meetings: [
                    {
                        title: 'Partner qualification call',
                        note: 'Discussed joint pipeline and support expectations.',
                        date: daysAgo(9),
                        createdBy: pickUser(1)
                    }
                ],
                documents: [
                    buildDocument(
                        pickUser(1),
                        'Partner NDA',
                        'Agreement',
                        'bluepeak-nda.pdf'
                    )
                ]
            },
            {
                customerName: 'Sanjay Patel',
                companyName: 'Patel Hardware Mart',
                mobileNumber: '+91 98220 11445',
                email: 'sanjay@patelhardware.in',
                customerType: 'Individual',
                status: 'Active',
                assignedTo: pickUser(2),
                gstNumber: '24AAECP4455R1Z1',
                panNumber: 'AAECP4455R',
                billingAddress: buildAddress('Ahmedabad', 'Gujarat', '380015'),
                shippingAddress: buildAddress('Ahmedabad', 'Gujarat', '380015'),
                revenueSummary: {
                    totalRevenue: 430000,
                    outstandingAmount: 32000,
                    lastTransactionDate: daysAgo(5)
                },
                orderSummary: {
                    totalOrders: 11,
                    lastOrderDate: daysAgo(5),
                    transactions: [
                        {
                            title: 'Annual CRM license',
                            amount: 96000,
                            date: daysAgo(5),
                            status: 'Completed'
                        }
                    ]
                },
                openOpportunities: [
                    {
                        title: 'WhatsApp automation upgrade',
                        value: 88000,
                        stage: 'Open',
                        expectedCloseDate: daysFromNow(18)
                    }
                ],
                contacts: [
                    {
                        contactName: 'Sanjay Patel',
                        designation: 'Owner',
                        department: 'Management',
                        mobileNumber: '+91 98220 11445',
                        email: 'sanjay@patelhardware.in',
                        isPrimaryContact: true
                    },
                    {
                        contactName: 'Kavita Patel',
                        designation: 'Accounts',
                        department: 'Finance',
                        mobileNumber: '+91 98220 11446',
                        email: 'accounts@patelhardware.in',
                        isPrimaryContact: false
                    }
                ],
                followUps: [
                    {
                        title: 'Training confirmation',
                        note: 'Schedule staff training for mobile app workflow.',
                        date: daysAgo(1),
                        createdBy: pickUser(2)
                    }
                ],
                meetings: [
                    {
                        title: 'Store visit',
                        note: 'Reviewed lead capture and follow-up process.',
                        date: daysAgo(20),
                        createdBy: pickUser(2)
                    }
                ],
                documents: [
                    buildDocument(
                        pickUser(2),
                        'PAN Card',
                        'PAN Card',
                        'patel-pan.pdf'
                    ),
                    buildDocument(
                        pickUser(2),
                        'Recent Invoice',
                        'Invoice',
                        'patel-invoice.pdf'
                    )
                ]
            },
            {
                customerName: 'Nisha Rao',
                companyName: 'Vertex Distribution Co',
                mobileNumber: '+91 99002 88991',
                email: 'ops@vertexdistribution.in',
                customerType: 'Reseller',
                status: 'Inactive',
                assignedTo: pickUser(3),
                gstNumber: '33AAECV7788L1Z7',
                panNumber: 'AAECV7788L',
                billingAddress: buildAddress('Chennai', 'Tamil Nadu', '600096'),
                shippingAddress: buildAddress(
                    'Chennai',
                    'Tamil Nadu',
                    '600097'
                ),
                revenueSummary: {
                    totalRevenue: 1120000,
                    outstandingAmount: 410000,
                    lastTransactionDate: daysAgo(88)
                },
                orderSummary: {
                    totalOrders: 9,
                    lastOrderDate: daysAgo(88),
                    transactions: [
                        {
                            title: 'Distributor license block',
                            amount: 410000,
                            date: daysAgo(88),
                            status: 'Overdue'
                        }
                    ]
                },
                openOpportunities: [],
                contacts: [
                    {
                        contactName: 'Nisha Rao',
                        designation: 'Business Head',
                        department: 'Sales',
                        mobileNumber: '+91 99002 88991',
                        email: 'nisha@vertexdistribution.in',
                        isPrimaryContact: true
                    }
                ],
                followUps: [
                    {
                        title: 'Reactivation check',
                        note: 'Account is inactive due to delayed payment.',
                        date: daysAgo(30),
                        createdBy: pickUser(3)
                    }
                ],
                meetings: [
                    {
                        title: 'Renewal escalation',
                        note: 'Discussed payment plan and revised rollout date.',
                        date: daysAgo(42),
                        createdBy: pickUser(3)
                    }
                ],
                documents: [
                    buildDocument(
                        pickUser(3),
                        'Outstanding Invoice',
                        'Invoice',
                        'vertex-outstanding-invoice.pdf'
                    )
                ]
            }
        ];

        for (const customerData of customerSeedData) {
            const existing = await Customer.findOne({
                email: customerData.email
            });

            if (existing) {
                existing.set(customerData);
                await existing.save();
                continue;
            }

            await Customer.create(customerData);
        }

        console.log('Customer sample data seeded');
    } catch (error) {
        console.error('Error seeding customer sample data:', error);
    }
};

module.exports = seedCustomers;
