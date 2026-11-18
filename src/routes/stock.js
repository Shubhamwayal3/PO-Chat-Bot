import { Router } from 'express';
import { getStock, listStock } from '../services/stockService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listStock({
      article: req.query.article,
      site: req.query.site,
      q: req.query.q,
      limit: Number(req.query.limit || 100),
      offset: Number(req.query.offset || 0),
    });
    res.json(result);
  })
);

router.get(
  '/:articleCode/:siteCode',
  asyncHandler(async (req, res) => {
    const data = await getStock(req.params.articleCode, req.params.siteCode);
    res.json({ data });
  })
);

export default router;
