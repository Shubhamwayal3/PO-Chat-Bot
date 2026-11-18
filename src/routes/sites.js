import { Router } from 'express';
import { createSite, getSite, listSites, updateSite } from '../services/siteService.js';
import { siteCreateSchema, sitePatchSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listSites({
      status: req.query.status,
      q: req.query.q,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });
    res.json(result);
  })
);

router.get(
  '/:siteCode',
  asyncHandler(async (req, res) => {
    const data = await getSite(req.params.siteCode);
    res.json({ data });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = siteCreateSchema.parse(req.body);
    const data = await createSite(payload);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:siteCode',
  asyncHandler(async (req, res) => {
    const patch = sitePatchSchema.parse(req.body);
    const data = await updateSite(req.params.siteCode, patch);
    res.json({ data });
  })
);

export default router;
