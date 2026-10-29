import { Router } from 'express';
import * as developerController from '../controllers/developerController';

const router = Router();

router.get('/', developerController.listDevelopers);
router.get('/new', developerController.newDeveloperForm);
router.post('/', developerController.createDeveloper);
router.get('/:id', developerController.showDeveloper);
router.get('/:id/edit', developerController.editDeveloperForm);
router.post('/:id', developerController.updateDeveloper);
router.post('/:id/delete', developerController.deleteDeveloper);

export default router;
