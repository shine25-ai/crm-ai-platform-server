const express = require('express');
const router = express.Router();
const leadController = require('./lead.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const authorize = require('../../shared/middleware/permission.middleware');
const upload = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

// Base CRUD
router.get('/', authorize('leads:read'), leadController.getLeads);
router.post('/', authorize('leads:write'), leadController.createLead);
router.get('/:id', authorize('leads:read'), leadController.getLead);
router.put('/:id', authorize('leads:write'), leadController.updateLead);
router.delete('/:id', authorize('leads:delete'), leadController.deleteLead);

// Operations
router.post(
    '/:id/assign',
    authorize('leads:assign', 'leads:write'),
    leadController.assignLead
);
router.post(
    '/:id/convert',
    authorize('leads:convert', 'leads:write'),
    leadController.convertLead
);

// Notes
router.post('/:id/notes', authorize('leads:write'), leadController.addNote);
router.put('/notes/:id', authorize('leads:write'), leadController.editNote);
router.delete(
    '/notes/:id',
    authorize('leads:write'),
    leadController.deleteNote
);

// Follow-ups
router.post(
    '/:id/followups',
    authorize('leads:write'),
    leadController.addFollowUp
);
router.put(
    '/followups/:id',
    authorize('leads:write'),
    leadController.editFollowUp
);
router.delete(
    '/followups/:id',
    authorize('leads:write'),
    leadController.deleteFollowUp
);

// Meetings
router.post(
    '/:id/meetings',
    authorize('leads:write'),
    leadController.addMeeting
);
router.put(
    '/meetings/:id',
    authorize('leads:write'),
    leadController.editMeeting
);
router.delete(
    '/meetings/:id',
    authorize('leads:write'),
    leadController.deleteMeeting
);

// Documents
router.post(
    '/:id/documents',
    authorize('leads:write'),
    upload.single('file'),
    leadController.addDocument
);
router.delete(
    '/documents/:id',
    authorize('leads:write'),
    leadController.deleteDocument
);

// Calls
router.post('/:id/calls', authorize('leads:write'), leadController.recordCall);

module.exports = router;
