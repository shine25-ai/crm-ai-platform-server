const Asset = require('../modules/assets/asset.model');
const EmployeeAsset = require('../modules/assets/employeeAsset.model');
const AssetAssignmentHistory = require('../modules/assets/assetAssignmentHistory.model');
const Employee = require('../modules/employees/employee.model');
const User = require('../modules/users/user.model');

const seedAssets = async () => {
    try {
        console.log('🌱 Seeding assets...');

        // Clear existing assets, assignments, and histories to ensure clean state
        await Asset.deleteMany({});
        await EmployeeAsset.deleteMany({});
        await AssetAssignmentHistory.deleteMany({});

        // Fetch demo admin user for assigning assets
        const adminUser = await User.findOne().sort({ createdAt: 1 });
        if (!adminUser) {
            console.log(
                '⚠️ No system users found. Skipping assignment seeder.'
            );
            return;
        }

        // Fetch demo employees
        let aarav = await Employee.findOne({
            email: 'aarav.nair@optiflow.test'
        });
        let vikram = await Employee.findOne({
            email: 'vikram.manager@optiflow.test'
        });
        let priya = await Employee.findOne({ email: 'priya.hr@optiflow.test' });

        // Fallback: If demo employees are not found, assign to any available employee
        if (!aarav || !vikram || !priya) {
            const allEmployees = await Employee.find({ status: 'Active' });
            if (allEmployees.length > 0) {
                aarav = aarav || allEmployees[0];
                vikram = vikram || allEmployees[1] || allEmployees[0];
                priya = priya || allEmployees[2] || allEmployees[0];
            }
        }

        const assetsToCreate = [
            {
                assetName: 'MacBook Pro 16" (M3 Pro)',
                assetCategory: 'Laptop',
                assetTag: 'AST-LAP-001',
                serialNumber: 'C02FP188Q05D',
                brand: 'Apple',
                model: 'MacBook Pro 16-inch (M3 Pro, 18GB, 512GB)',
                purchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
                warrantyExpiry: new Date(
                    Date.now() + 365 * 24 * 60 * 60 * 1000
                ), // 1 year from now
                currentStatus: aarav ? 'Assigned' : 'Available'
            },
            {
                assetName: 'Dell UltraSharp 27" 4K Monitor',
                assetCategory: 'Monitor',
                assetTag: 'AST-MON-001',
                serialNumber: 'CN0YV7M77D200',
                brand: 'Dell',
                model: 'U2723QE',
                purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
                warrantyExpiry: new Date(
                    Date.now() + 540 * 24 * 60 * 60 * 1000
                ), // 1.5 years from now
                currentStatus: aarav ? 'Assigned' : 'Available'
            },
            {
                assetName: 'iPhone 15 Pro Max',
                assetCategory: 'Mobile Phone',
                assetTag: 'AST-PHN-001',
                serialNumber: 'DX3L2901F099',
                brand: 'Apple',
                model: 'iPhone 15 Pro Max (256GB, Black Titanium)',
                purchaseDate: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000), // 9 months ago
                warrantyExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months from now
                currentStatus: vikram ? 'Assigned' : 'Available'
            },
            {
                assetName: 'Logitech MX Master 3S Mouse',
                assetCategory: 'Accessories',
                assetTag: 'AST-ACC-001',
                serialNumber: 'LZ338AA019',
                brand: 'Logitech',
                model: 'MX Master 3S',
                purchaseDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                currentStatus: 'Available'
            },
            {
                assetName: 'ThinkPad T14 Gen 4',
                assetCategory: 'Laptop',
                assetTag: 'AST-LAP-002',
                serialNumber: 'PF4EH992',
                brand: 'Lenovo',
                model: 'ThinkPad T14 Gen 4 (AMD Ryzen 7, 32GB, 1TB)',
                purchaseDate: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000),
                currentStatus: 'Under Repair'
            },
            {
                assetName: 'Corporate ID Smartcard',
                assetCategory: 'ID Card',
                assetTag: 'AST-CRD-001',
                serialNumber: 'SC991002',
                brand: 'HID Global',
                model: 'iCLASS Seos',
                purchaseDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
                currentStatus: 'Lost'
            },
            {
                assetName: 'iPad Pro 11"',
                assetCategory: 'Tablet',
                assetTag: 'AST-TAB-001',
                serialNumber: 'GG7FP001Q1',
                brand: 'Apple',
                model: 'iPad Pro 11-inch (M2, 128GB, Cellular)',
                purchaseDate: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
                currentStatus: 'Available'
            },
            {
                assetName: 'Dell Latitude 5440',
                assetCategory: 'Laptop',
                assetTag: 'AST-LAP-003',
                serialNumber: 'DELL-5440-SN1',
                brand: 'Dell',
                model: 'Latitude 5440 (Intel i7, 16GB, 512GB)',
                purchaseDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                currentStatus: 'Available'
            }
        ];

        const createdAssets = await Asset.insertMany(assetsToCreate);
        console.log(`✅ Seeded ${createdAssets.length} assets successfully.`);

        // Map assignments
        for (const asset of createdAssets) {
            if (asset.assetTag === 'AST-LAP-001' && aarav) {
                // Assign MacBook to Aarav
                await EmployeeAsset.create({
                    employeeId: aarav._id,
                    assetId: asset._id,
                    assignedDate: new Date(
                        Date.now() - 120 * 24 * 60 * 60 * 1000
                    ), // 4 months ago
                    expectedReturnDate: new Date(
                        Date.now() + 240 * 24 * 60 * 60 * 1000
                    ),
                    status: 'Assigned',
                    assignedBy: adminUser._id,
                    remarks: 'Standard workstation issue for developer role.'
                });

                // Add history
                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: aarav._id,
                    actionType: 'Assigned',
                    previousStatus: 'Available',
                    currentStatus: 'Assigned',
                    actionBy: adminUser._id,
                    remarks: 'Assigned upon joining the engineering team.',
                    actionDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
                });
            }

            if (asset.assetTag === 'AST-MON-001' && aarav) {
                // Assign Monitor to Aarav
                await EmployeeAsset.create({
                    employeeId: aarav._id,
                    assetId: asset._id,
                    assignedDate: new Date(
                        Date.now() - 120 * 24 * 60 * 60 * 1000
                    ), // 4 months ago
                    status: 'Assigned',
                    assignedBy: adminUser._id,
                    remarks: 'Dual screen developer workspace setup.'
                });

                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: aarav._id,
                    actionType: 'Assigned',
                    previousStatus: 'Available',
                    currentStatus: 'Assigned',
                    actionBy: adminUser._id,
                    remarks: 'Standard monitor accessory request.',
                    actionDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
                });
            }

            if (asset.assetTag === 'AST-PHN-001' && vikram) {
                // Assign iPhone to Vikram
                await EmployeeAsset.create({
                    employeeId: vikram._id,
                    assetId: asset._id,
                    assignedDate: new Date(
                        Date.now() - 90 * 24 * 60 * 60 * 1000
                    ), // 3 months ago
                    status: 'Assigned',
                    assignedBy: adminUser._id,
                    remarks: 'Corporate phone setup for managers.'
                });

                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: vikram._id,
                    actionType: 'Assigned',
                    previousStatus: 'Available',
                    currentStatus: 'Assigned',
                    actionBy: adminUser._id,
                    remarks: 'Assigned for manager business operations.',
                    actionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                });
            }

            if (asset.assetTag === 'AST-TAB-001' && priya) {
                // Seed assignment history for iPad being assigned and then returned
                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: priya._id,
                    actionType: 'Assigned',
                    previousStatus: 'Available',
                    currentStatus: 'Assigned',
                    actionBy: adminUser._id,
                    remarks: 'Tablet assigned for design reviews.',
                    actionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                });

                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: priya._id,
                    actionType: 'Returned',
                    previousStatus: 'Assigned',
                    currentStatus: 'Available',
                    actionBy: adminUser._id,
                    remarks: 'Returned in clean working condition.',
                    actionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                });
            }

            if (asset.currentStatus === 'Under Repair') {
                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: adminUser.employeeId || adminUser._id,
                    actionType: 'Under Repair',
                    previousStatus: 'Available',
                    currentStatus: 'Under Repair',
                    actionBy: adminUser._id,
                    remarks:
                        'Keyboard keys stuck, sent to Lenovo repair service.',
                    actionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
                });
            }

            if (asset.currentStatus === 'Lost') {
                await AssetAssignmentHistory.create({
                    assetId: asset._id,
                    employeeId: adminUser.employeeId || adminUser._id,
                    actionType: 'Lost',
                    previousStatus: 'Available',
                    currentStatus: 'Lost',
                    actionBy: adminUser._id,
                    remarks: 'Reported lost by employee on field duty.',
                    actionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                });
            }
        }

        console.log('✅ Asset assignments and histories seeded successfully.');
    } catch (error) {
        console.error('❌ Error seeding assets:', error);
    }
};

module.exports = seedAssets;
