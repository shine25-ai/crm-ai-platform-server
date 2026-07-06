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

const uploadHolidays = async (req, res, next) => {
    try {
        if (!req.file) {
            return res
                .status(400)
                .json({ success: false, message: 'No CSV file uploaded' });
        }

        const buffer = req.file.buffer;
        const text = buffer.toString('utf-8');
        const lines = text.split(/\r?\n/);
        if (lines.length === 0 || !lines[0].trim()) {
            return res
                .status(400)
                .json({ success: false, message: 'Uploaded CSV is empty' });
        }

        const parseRow = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            return values;
        };

        const headers = parseRow(lines[0]).map((h) =>
            h.toLowerCase().replace(/^["']|["']$/g, '')
        );
        const titleIndex = headers.findIndex(
            (h) => h.includes('title') || h === 'name'
        );
        const startIndex = headers.findIndex(
            (h) => h.includes('start') || h === 'date'
        );
        const endIndex = headers.findIndex((h) => h.includes('end'));
        const descIndex = headers.findIndex(
            (h) => h.includes('desc') || h.includes('detail')
        );

        if (titleIndex === -1 || startIndex === -1) {
            return res.status(400).json({
                success: false,
                message:
                    'Invalid CSV headers. Must include at least "Title" and "Start Date" or "Date" columns.'
            });
        }

        const eventsToCreate = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const values = parseRow(line);

            const title = values[titleIndex]
                ? values[titleIndex].replace(/^["']|["']$/g, '')
                : '';
            const startDateStr = values[startIndex]
                ? values[startIndex].replace(/^["']|["']$/g, '')
                : '';
            let endDateStr =
                endIndex !== -1 && values[endIndex]
                    ? values[endIndex].replace(/^["']|["']$/g, '')
                    : startDateStr;
            const description =
                descIndex !== -1 && values[descIndex]
                    ? values[descIndex].replace(/^["']|["']$/g, '')
                    : '';

            if (!title || !startDateStr) continue;

            const startDate = new Date(startDateStr);
            const endDate = new Date(endDateStr || startDateStr);

            if (isNaN(startDate.getTime())) continue;

            eventsToCreate.push({
                title,
                startDate,
                endDate: isNaN(endDate.getTime()) ? startDate : endDate,
                description
            });
        }

        if (eventsToCreate.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid holiday records found in the CSV.'
            });
        }

        const created = await eventService.bulkCreateHolidays(
            eventsToCreate,
            req.user
        );
        return ApiResponse.success(
            res,
            `Successfully uploaded ${created.length} holidays`,
            created
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    uploadHolidays
};
