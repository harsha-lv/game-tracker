const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

router.get('/', gameController.listGames);
router.get('/new', gameController.newGameForm);
router.post('/', gameController.createGame);
router.get('/:id', gameController.showGame);
router.get('/:id/edit', gameController.editGameForm);
router.post('/:id', gameController.updateGame);
router.post('/:id/delete', gameController.deleteGame);

module.exports = router;
