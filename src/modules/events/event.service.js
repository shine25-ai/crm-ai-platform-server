const Event = require('./event.model');
const AppError = require('../../shared/utils/appError');
const { logActivity } = require('../../shared/services/audit.service');

const listEvents = async (filters = {}) => {
    const query = {};
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.from || filters.to) {
        query.startDate = {};
        if (filters.from) query.startDate.$gte = new Date(filters.from);
        if (filters.to) query.startDate.$lte = new Date(filters.to);
    }
    return Event.find(query)
        .populate('createdBy', 'name email')
        .sort({ startDate: 1 });
};

const createEvent = async (data, user) => {
    const event = await Event.create({ ...data, createdBy: user.userId });
    await logActivity(
        user.userId,
        'CREATE',
        'Calendar',
        `Created event ${event.title}`
    );
    return Event.findById(event._id).populate('createdBy', 'name email');
};

const updateEvent = async (id, data, user) => {
    const event = await Event.findById(id);
    if (!event) throw new AppError('Event not found', 404);
    ['title', 'startDate', 'endDate', 'eventType', 'description'].forEach(
        (field) => {
            if (data[field] !== undefined) event[field] = data[field];
        }
    );
    await event.save();
    await logActivity(
        user.userId,
        'UPDATE',
        'Calendar',
        `Updated event ${event.title}`
    );
    return Event.findById(event._id).populate('createdBy', 'name email');
};

const deleteEvent = async (id, user) => {
    const event = await Event.findById(id);
    if (!event) throw new AppError('Event not found', 404);
    await Event.findByIdAndDelete(id);
    await logActivity(
        user.userId,
        'DELETE',
        'Calendar',
        `Deleted event ${event.title}`
    );
    return true;
};

const bulkCreateHolidays = async (eventsList, user) => {
    const records = eventsList.map((item) => ({
        ...item,
        eventType: 'Holiday',
        createdBy: user.userId
    }));
    const created = await Event.insertMany(records);
    await logActivity(
        user.userId,
        'CREATE',
        'Calendar',
        `Bulk uploaded ${created.length} holidays via CSV`
    );
    return created;
};

module.exports = {
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    bulkCreateHolidays
};
