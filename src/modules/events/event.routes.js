const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const { taskUpload } = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

router.get(
    '/',
    (req, res, next) => {
        if (req.query.eventType === 'Holiday') {
            return next();
        }
        return authorize('calendar:read')(req, res, next);
    },
    eventController.getEvents
);
router.post('/', authorize('calendar:write'), eventController.createEvent);
router.post(
    '/upload-holidays',
    authorize('calendar:write'),
    taskUpload.single('file'),
    eventController.uploadHolidays
);
router.put('/:id', authorize('calendar:write'), eventController.updateEvent);
router.delete(
    '/:id',
    authorize('calendar:delete'),
    eventController.deleteEvent
);

module.exports = router;
