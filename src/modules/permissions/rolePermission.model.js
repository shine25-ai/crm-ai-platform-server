const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
    {
        roleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Role',
            required: true
        },
        permissionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Permission',
            required: true
        }
    },
    { timestamps: true }
);

// Unique compound index to prevent duplicate role-permission assignments
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
