const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developerController');

router.get('/', developerController.listDevelopers);
router.get('/new', developerController.newDeveloperForm);
router.post('/', developerController.createDeveloper);
router.get('/:id', developerController.showDeveloper);
router.get('/:id/edit', developerController.editDeveloperForm);
router.post('/:id', developerController.updateDeveloper);
router.post('/:id/delete', developerController.deleteDeveloper);

module.exports = router;
