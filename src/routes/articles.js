import { Router } from 'express';
import {
  createArticle,
  getArticle,
  listArticles,
  updateArticle,
} from '../services/articleService.js';
import { articleCreateSchema, articlePatchSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listArticles({
      status: req.query.status,
      q: req.query.q,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });
    res.json(result);
  })
);

router.get(
  '/:articleCode',
  asyncHandler(async (req, res) => {
    const data = await getArticle(req.params.articleCode);
    res.json({ data });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = articleCreateSchema.parse(req.body);
    const data = await createArticle(payload);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:articleCode',
  asyncHandler(async (req, res) => {
    const patch = articlePatchSchema.parse(req.body);
    const data = await updateArticle(req.params.articleCode, patch);
    res.json({ data });
  })
);

export default router;
