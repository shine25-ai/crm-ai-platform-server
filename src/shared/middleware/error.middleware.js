const ApiResponse = require('../utils/response');

module.exports = (err, req, res, next) => {
    console.error(err);

    return ApiResponse.error(
        res,
        err.message || 'Internal Server Error',
        null,
        err.statusCode || 500
    );
};
