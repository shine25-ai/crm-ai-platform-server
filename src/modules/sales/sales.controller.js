const salesService = require('./sales.service');
const ApiResponse = require('../../shared/utils/response');

const wrap = (handler) => async (req, res, next) => {
    try {
        await handler(req, res);
    } catch (error) {
        next(error);
    }
};

const success = (res, message, data, status = 200) =>
    ApiResponse.success(res, message, data, status);

module.exports = {
    listOpportunities: wrap(async (req, res) =>
        success(
            res,
            'Opportunities retrieved successfully',
            await salesService.listOpportunities(req.query)
        )
    ),
    createOpportunity: wrap(async (req, res) =>
        success(
            res,
            'Opportunity created successfully',
            await salesService.createOpportunity(req.body),
            201
        )
    ),
    updateOpportunity: wrap(async (req, res) =>
        success(
            res,
            'Opportunity updated successfully',
            await salesService.updateOpportunity(req.params.id, req.body)
        )
    ),
    deleteOpportunity: wrap(async (req, res) =>
        success(
            res,
            'Opportunity deleted successfully',
            await salesService.deleteOpportunity(req.params.id)
        )
    ),
    moveOpportunityStage: wrap(async (req, res) =>
        success(
            res,
            'Opportunity stage moved successfully',
            await salesService.moveOpportunityStage(
                req.params.id,
                req.body.stage
            )
        )
    ),
    listQuotations: wrap(async (req, res) =>
        success(
            res,
            'Quotations retrieved successfully',
            await salesService.listQuotations()
        )
    ),
    createQuotation: wrap(async (req, res) =>
        success(
            res,
            'Quotation created successfully',
            await salesService.createQuotation(req.body),
            201
        )
    ),
    updateQuotation: wrap(async (req, res) =>
        success(
            res,
            'Quotation updated successfully',
            await salesService.updateQuotation(req.params.id, req.body)
        )
    ),
    deleteQuotation: wrap(async (req, res) =>
        success(
            res,
            'Quotation deleted successfully',
            await salesService.deleteQuotation(req.params.id)
        )
    ),
    sendQuotation: wrap(async (req, res) =>
        success(
            res,
            'Quotation sent successfully',
            await salesService.sendQuotation(req.params.id)
        )
    ),
    listFollowUps: wrap(async (req, res) =>
        success(
            res,
            'Follow-ups retrieved successfully',
            await salesService.listFollowUps(req.query)
        )
    ),
    createFollowUp: wrap(async (req, res) =>
        success(
            res,
            'Follow-up created successfully',
            await salesService.createFollowUp(req.body),
            201
        )
    ),
    updateFollowUp: wrap(async (req, res) =>
        success(
            res,
            'Follow-up updated successfully',
            await salesService.updateFollowUp(req.params.id, req.body)
        )
    ),
    deleteFollowUp: wrap(async (req, res) =>
        success(
            res,
            'Follow-up deleted successfully',
            await salesService.deleteFollowUp(req.params.id)
        )
    ),
    listMeetings: wrap(async (req, res) =>
        success(
            res,
            'Meetings retrieved successfully',
            await salesService.listMeetings(req.query)
        )
    ),
    createMeeting: wrap(async (req, res) =>
        success(
            res,
            'Meeting created successfully',
            await salesService.createMeeting(req.body),
            201
        )
    ),
    updateMeeting: wrap(async (req, res) =>
        success(
            res,
            'Meeting updated successfully',
            await salesService.updateMeeting(req.params.id, req.body)
        )
    ),
    deleteMeeting: wrap(async (req, res) =>
        success(
            res,
            'Meeting deleted successfully',
            await salesService.deleteMeeting(req.params.id)
        )
    )
};
