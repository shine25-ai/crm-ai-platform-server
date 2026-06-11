const moment = require('moment');

/**
 * Global Time Center using Moment.js
 */
class TimeCenter {
    /**
     * Get current moment instance
     * @returns {moment.Moment}
     */
    static now() {
        return moment();
    }

    /**
     * Get current time as a formatted string
     * @param {string} format - Default is 'YYYY-MM-DD HH:mm:ss'
     * @returns {string}
     */
    static currentFormatted(format = 'YYYY-MM-DD HH:mm:ss') {
        return moment().format(format);
    }

    /**
     * Format a specific date
     * @param {Date|string} date
     * @param {string} format - Default is 'YYYY-MM-DD HH:mm:ss'
     * @returns {string}
     */
    static format(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return moment(date).format(format);
    }

    /**
     * Check if a date is valid
     * @param {Date|string} date
     * @returns {boolean}
     */
    static isValid(date) {
        return moment(date).isValid();
    }

    /**
     * Get a future date
     * @param {number} amount
     * @param {moment.unitOfTime.DurationConstructor} unit (e.g. 'days', 'hours', 'months')
     * @returns {moment.Moment}
     */
    static add(amount, unit) {
        return moment().add(amount, unit);
    }

    /**
     * Get a past date
     * @param {number} amount
     * @param {moment.unitOfTime.DurationConstructor} unit (e.g. 'days', 'hours', 'months')
     * @returns {moment.Moment}
     */
    static subtract(amount, unit) {
        return moment().subtract(amount, unit);
    }

    /**
     * Get difference between two dates
     * @param {Date|string} date1
     * @param {Date|string} date2
     * @param {moment.unitOfTime.Diff} unit - Default is 'days'
     * @returns {number}
     */
    static diff(date1, date2, unit = 'days') {
        return moment(date1).diff(moment(date2), unit);
    }
}

module.exports = TimeCenter;
