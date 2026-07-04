const express = require('express');
const router = express.Router();
const noteController = require('./note.controller');
const authMiddleware = require('../../shared/middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', noteController.getNotes);
router.post('/', noteController.createNote);
router.put('/:id', noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
