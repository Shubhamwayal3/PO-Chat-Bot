import { Router } from 'express';
import {
  createVendor,
  getVendor,
  listVendors,
  updateVendor,
} from '../services/vendorService.js';
import { vendorCreateSchema, vendorPatchSchema } from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listVendors({
      status: req.query.status,
      q: req.query.q,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });
    res.json(result);
  })
);

router.get(
  '/:vendorCode',
  asyncHandler(async (req, res) => {
    const data = await getVendor(req.params.vendorCode);
    res.json({ data });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = vendorCreateSchema.parse(req.body);
    const data = await createVendor(payload);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:vendorCode',
  asyncHandler(async (req, res) => {
    const patch = vendorPatchSchema.parse(req.body);
    const data = await updateVendor(req.params.vendorCode, patch);
    res.json({ data });
  })
);

export default router;
