const express = require('express');
const router = express.Router();
const salesController = require('./sales.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

router
    .route('/opportunities')
    .get(salesController.listOpportunities)
    .post(salesController.createOpportunity);
router
    .route('/opportunities/:id')
    .put(salesController.updateOpportunity)
    .delete(salesController.deleteOpportunity);
router.patch('/opportunities/:id/stage', salesController.moveOpportunityStage);

router
    .route('/quotations')
    .get(salesController.listQuotations)
    .post(salesController.createQuotation);
router
    .route('/quotations/:id')
    .put(salesController.updateQuotation)
    .delete(salesController.deleteQuotation);
router.post('/quotations/:id/send', salesController.sendQuotation);

router
    .route('/follow-ups')
    .get(salesController.listFollowUps)
    .post(salesController.createFollowUp);
router
    .route('/follow-ups/:id')
    .put(salesController.updateFollowUp)
    .delete(salesController.deleteFollowUp);

router
    .route('/meetings')
    .get(salesController.listMeetings)
    .post(salesController.createMeeting);
router
    .route('/meetings/:id')
    .put(salesController.updateMeeting)
    .delete(salesController.deleteMeeting);

module.exports = router;
