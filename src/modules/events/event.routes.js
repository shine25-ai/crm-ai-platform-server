const express = require('express');
const router = express.Router();
const eventController = require('./event.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('calendar:read'), eventController.getEvents);
router.post('/', authorize('calendar:write'), eventController.createEvent);
router.put('/:id', authorize('calendar:write'), eventController.updateEvent);
router.delete(
    '/:id',
    authorize('calendar:delete'),
    eventController.deleteEvent
);

module.exports = router;
