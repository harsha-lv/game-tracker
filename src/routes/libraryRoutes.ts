import { Router } from 'express';
import * as libraryController from '../controllers/libraryController';

const router = Router();

router.get('/', libraryController.listLibrary);
router.post('/', libraryController.addToLibrary);
router.get('/:id/edit', libraryController.editLibraryEntryForm);
router.post('/:id', libraryController.updateLibraryEntry);
router.post('/:id/delete', libraryController.deleteLibraryEntry);

export default router;
