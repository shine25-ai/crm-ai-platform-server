const Permission = require('./permission.model');

const getAllPermissions = async () => {
    return await Permission.find({});
};

module.exports = {
    getAllPermissions
};
