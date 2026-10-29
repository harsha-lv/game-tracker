import { Router } from 'express';
import * as genreController from '../controllers/genreController';

const router = Router();

router.get('/', genreController.listGenres);
router.get('/new', genreController.newGenreForm);
router.post('/', genreController.createGenre);
router.get('/:id', genreController.showGenre);
router.get('/:id/edit', genreController.editGenreForm);
router.post('/:id', genreController.updateGenre);
router.post('/:id/delete', genreController.deleteGenre);

export default router;
