const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');

router.get('/', libraryController.listLibrary);
router.post('/', libraryController.addToLibrary);
router.get('/:id/edit', libraryController.editLibraryEntryForm);
router.post('/:id', libraryController.updateLibraryEntry);
router.post('/:id/delete', libraryController.deleteLibraryEntry);

module.exports = router;
