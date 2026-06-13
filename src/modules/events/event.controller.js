const eventService = require('./event.service');
const ApiResponse = require('../../shared/utils/response');

const getEvents = async (req, res, next) => {
    try {
        const events = await eventService.listEvents(req.query);
        return ApiResponse.success(
            res,
            'Events retrieved successfully',
            events
        );
    } catch (error) {
        next(error);
    }
};

const createEvent = async (req, res, next) => {
    try {
        const event = await eventService.createEvent(req.body, req.user);
        return ApiResponse.success(
            res,
            'Event created successfully',
            event,
            201
        );
    } catch (error) {
        next(error);
    }
};

const updateEvent = async (req, res, next) => {
    try {
        const event = await eventService.updateEvent(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Event updated successfully', event);
    } catch (error) {
        next(error);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        await eventService.deleteEvent(req.params.id, req.user);
        return ApiResponse.success(res, 'Event deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };
