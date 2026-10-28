const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genreController');

router.get('/', genreController.listGenres);
router.get('/new', genreController.newGenreForm);
router.post('/', genreController.createGenre);
router.get('/:id', genreController.showGenre);
router.get('/:id/edit', genreController.editGenreForm);
router.post('/:id', genreController.updateGenre);
router.post('/:id/delete', genreController.deleteGenre);

module.exports = router;
