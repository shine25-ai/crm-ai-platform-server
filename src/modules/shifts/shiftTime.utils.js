const MINUTE_MS = 60 * 1000;

const timeToMinutes = (time) => {
    const [hours, minutes] = String(time).split(':').map(Number);
    return hours * 60 + minutes;
};

const getSegmentMinutes = (segment) => {
    const start = timeToMinutes(segment.startTime);
    let end = timeToMinutes(segment.endTime);
    if (end <= start) end += 24 * 60;
    return end - start;
};

const getExpectedMinutes = (segment) =>
    Math.max(
        0,
        getSegmentMinutes(segment) - Number(segment.unpaidBreakMinutes || 0)
    );

const getZonedParts = (date, timezone) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    });
    return Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, Number(part.value)])
    );
};

const zonedDateTime = (dateValue, timeValue, timezone) => {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hour, minute] = timeValue.split(':').map(Number);
    const target = Date.UTC(year, month - 1, day, hour, minute, 0);
    let guess = target;

    for (let iteration = 0; iteration < 3; iteration += 1) {
        const parts = getZonedParts(new Date(guess), timezone);
        const rendered = Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second
        );
        guess += target - rendered;
    }

    return new Date(guess);
};

const addDays = (dateValue, days) => {
    const date = new Date(`${dateValue}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
};

const buildScheduleWindow = (shiftDate, segment, timezone) => {
    const scheduledStart = zonedDateTime(
        shiftDate,
        segment.startTime,
        timezone
    );
    const overnight =
        timeToMinutes(segment.endTime) <= timeToMinutes(segment.startTime);
    const scheduledEnd = zonedDateTime(
        overnight ? addDays(shiftDate, 1) : shiftDate,
        segment.endTime,
        timezone
    );

    return {
        scheduledStart,
        scheduledEnd,
        expectedMinutes: getExpectedMinutes(segment),
        overnight
    };
};

const calculateTimesheet = ({
    checkIn,
    checkOut,
    breakMinutes = 0,
    scheduledStart,
    scheduledEnd,
    expectedMinutes,
    graceInMinutes = 0,
    graceOutMinutes = 0
}) => {
    if (!checkIn || !checkOut) {
        return {
            grossMinutes: 0,
            breakMinutes: Math.max(0, Math.round(breakMinutes)),
            workedMinutes: 0,
            overtimeMinutes: 0,
            deficitMinutes: 0,
            lateMinutes: 0,
            earlyDepartureMinutes: 0,
            timesheetStatus: 'Open'
        };
    }

    const grossMinutes = Math.max(
        0,
        Math.round((new Date(checkOut) - new Date(checkIn)) / MINUTE_MS)
    );
    const normalizedBreakMinutes = Math.max(0, Math.round(breakMinutes));
    const workedMinutes = Math.max(0, grossMinutes - normalizedBreakMinutes);
    const expected = Math.max(0, Math.round(expectedMinutes || 0));
    const overtimeMinutes = Math.max(0, workedMinutes - expected);
    const deficitMinutes = Math.max(0, expected - workedMinutes);
    const lateMinutes = scheduledStart
        ? Math.max(
              0,
              Math.round(
                  (new Date(checkIn) - new Date(scheduledStart)) / MINUTE_MS
              ) - Number(graceInMinutes || 0)
          )
        : 0;
    const earlyDepartureMinutes = scheduledEnd
        ? Math.max(
              0,
              Math.round(
                  (new Date(scheduledEnd) - new Date(checkOut)) / MINUTE_MS
              ) - Number(graceOutMinutes || 0)
          )
        : 0;

    return {
        grossMinutes,
        breakMinutes: normalizedBreakMinutes,
        workedMinutes,
        overtimeMinutes,
        deficitMinutes,
        lateMinutes,
        earlyDepartureMinutes,
        timesheetStatus:
            overtimeMinutes > 0
                ? 'Overtime'
                : deficitMinutes > 0
                  ? 'Under Hours'
                  : 'Complete'
    };
};

module.exports = {
    timeToMinutes,
    getSegmentMinutes,
    getExpectedMinutes,
    buildScheduleWindow,
    calculateTimesheet
};
