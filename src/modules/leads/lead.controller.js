const leadService = require('./lead.service');
const {
    validateCreateLead,
    validateUpdateLead,
    validateCreateFollowUp,
    validateCreateMeeting
} = require('./lead.validation');
const ApiResponse = require('../../shared/utils/response');

const getLeads = async (req, res, next) => {
    try {
        const result = await leadService.listLeads(req.user, req.query);
        return ApiResponse.success(res, 'Leads retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

const getLead = async (req, res, next) => {
    try {
        const result = await leadService.getLeadById(req.params.id, req.user);
        return ApiResponse.success(res, 'Lead retrieved successfully', result);
    } catch (error) {
        next(error);
    }
};

const createLead = async (req, res, next) => {
    try {
        validateCreateLead(req.body);
        const lead = await leadService.createLead(req.body, req.user);
        return ApiResponse.success(res, 'Lead created successfully', lead, 201);
    } catch (error) {
        next(error);
    }
};

const updateLead = async (req, res, next) => {
    try {
        validateUpdateLead(req.body);
        const lead = await leadService.updateLead(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Lead updated successfully', lead);
    } catch (error) {
        next(error);
    }
};

const deleteLead = async (req, res, next) => {
    try {
        await leadService.deleteLead(req.params.id, req.user);
        return ApiResponse.success(res, 'Lead deleted successfully');
    } catch (error) {
        next(error);
    }
};

const assignLead = async (req, res, next) => {
    try {
        const lead = await leadService.assignLead(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Lead assigned successfully', lead);
    } catch (error) {
        next(error);
    }
};

const convertLead = async (req, res, next) => {
    try {
        const result = await leadService.convertLead(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Lead converted successfully', result);
    } catch (error) {
        next(error);
    }
};

// Notes
const addNote = async (req, res, next) => {
    try {
        const note = await leadService.addNote(
            req.params.id,
            req.body.content,
            req.user
        );
        return ApiResponse.success(res, 'Note added successfully', note, 201);
    } catch (error) {
        next(error);
    }
};

const editNote = async (req, res, next) => {
    try {
        const note = await leadService.editNote(
            req.params.id,
            req.body.content,
            req.user
        );
        return ApiResponse.success(res, 'Note updated successfully', note);
    } catch (error) {
        next(error);
    }
};

const deleteNote = async (req, res, next) => {
    try {
        await leadService.deleteNote(req.params.id, req.user);
        return ApiResponse.success(res, 'Note deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Follow-ups
const addFollowUp = async (req, res, next) => {
    try {
        validateCreateFollowUp(req.body);
        const followUp = await leadService.addFollowUp(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Follow-up scheduled successfully',
            followUp,
            201
        );
    } catch (error) {
        next(error);
    }
};

const editFollowUp = async (req, res, next) => {
    try {
        const followUp = await leadService.editFollowUp(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Follow-up updated successfully',
            followUp
        );
    } catch (error) {
        next(error);
    }
};

const deleteFollowUp = async (req, res, next) => {
    try {
        await leadService.deleteFollowUp(req.params.id, req.user);
        return ApiResponse.success(res, 'Follow-up deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Meetings
const addMeeting = async (req, res, next) => {
    try {
        validateCreateMeeting(req.body);
        const meeting = await leadService.addMeeting(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Meeting scheduled successfully',
            meeting,
            201
        );
    } catch (error) {
        next(error);
    }
};

const editMeeting = async (req, res, next) => {
    try {
        const meeting = await leadService.editMeeting(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Meeting updated successfully',
            meeting
        );
    } catch (error) {
        next(error);
    }
};

const deleteMeeting = async (req, res, next) => {
    try {
        await leadService.deleteMeeting(req.params.id, req.user);
        return ApiResponse.success(res, 'Meeting deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Documents
const addDocument = async (req, res, next) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        const doc = await leadService.addDocument(
            req.params.id,
            req.file,
            req.user
        );
        return ApiResponse.success(
            res,
            'Document uploaded successfully',
            doc,
            201
        );
    } catch (error) {
        next(error);
    }
};

const deleteDocument = async (req, res, next) => {
    try {
        await leadService.deleteDocument(req.params.id, req.user);
        return ApiResponse.success(res, 'Document deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Calls
const recordCall = async (req, res, next) => {
    try {
        const call = await leadService.recordCall(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(
            res,
            'Call recorded successfully',
            call,
            201
        );
    } catch (error) {
        next(error);
    }
};

const reassignLead = async (req, res, next) => {
    try {
        const lead = await leadService.reassignLead(
            req.params.id,
            req.body,
            req.user
        );
        return ApiResponse.success(res, 'Lead reassigned successfully', lead);
    } catch (error) {
        next(error);
    }
};

const restoreLead = async (req, res, next) => {
    try {
        await leadService.restoreLead(req.params.id, req.user);
        return ApiResponse.success(res, 'Lead restored successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLeads,
    getLead,
    createLead,
    updateLead,
    deleteLead,
    restoreLead,
    assignLead,
    reassignLead,
    convertLead,
    addNote,
    editNote,
    deleteNote,
    addFollowUp,
    editFollowUp,
    deleteFollowUp,
    addMeeting,
    editMeeting,
    deleteMeeting,
    addDocument,
    deleteDocument,
    recordCall
};
