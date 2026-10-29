import { Router } from 'express';
import * as gameController from '../controllers/gameController';

const router = Router();

router.get('/', gameController.listGames);
router.get('/new', gameController.newGameForm);
router.post('/', gameController.createGame);
router.get('/:id', gameController.showGame);
router.get('/:id/edit', gameController.editGameForm);
router.post('/:id', gameController.updateGame);
router.post('/:id/delete', gameController.deleteGame);

export default router;
