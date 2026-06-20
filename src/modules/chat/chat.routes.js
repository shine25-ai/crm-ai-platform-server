const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');
const { chatUpload } = require('../../shared/middleware/upload.middleware');

router.use(authMiddleware);

// Contacts & Summary Directory
router.get('/contacts', chatController.getContacts);
router.get('/summary', chatController.getChatSummary);

// Messaging history & manual endpoints
router.get('/messages/:otherUserId', chatController.getMessages);
router.post('/mark-read/:senderId', chatController.markRead);
router.post('/send', chatUpload.single('file'), chatController.sendMessage);

// Message Reactions
router.post('/reactions', chatController.toggleReaction);

// Files Uploading
router.post(
    '/upload',
    chatUpload.single('file'),
    chatController.uploadAttachment
);

// Group Chat CRUD and Management
router.post('/groups', chatController.createGroup);
router.put('/groups/:id', chatController.updateGroup);
router.get('/groups/:id/members', chatController.getGroupMembers);
router.post('/groups/:id/members', chatController.addGroupMembers);
router.delete('/groups/:id/members/:userId', chatController.removeGroupMember);

module.exports = router;
