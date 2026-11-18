import { Router } from 'express';
import {
  addPurchaseOrderItem,
  createAsnOnPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderItem,
} from '../services/poService.js';
import {
  createAsnSchema,
  poCreateSchema,
  poItemCreateSchema,
  poItemPatchSchema,
  poPatchSchema,
} from '../validation/schemas.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listPurchaseOrders({
      status: req.query.status,
      vendor: req.query.vendor,
      site: req.query.site,
      limit: Number(req.query.limit || 50),
      offset: Number(req.query.offset || 0),
    });
    res.json(result);
  })
);

router.get(
  '/:poNumber',
  asyncHandler(async (req, res) => {
    const data = await getPurchaseOrder(req.params.poNumber);
    res.json({ data });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = poCreateSchema.parse(req.body);
    const data = await createPurchaseOrder(payload);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:poNumber',
  asyncHandler(async (req, res) => {
    const patch = poPatchSchema.parse(req.body);
    const data = await updatePurchaseOrder(req.params.poNumber, patch);
    res.json({ data });
  })
);

router.post(
  '/:poNumber/items',
  asyncHandler(async (req, res) => {
    const item = poItemCreateSchema.parse(req.body);
    const data = await addPurchaseOrderItem(req.params.poNumber, item);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:poNumber/items/:poItem',
  asyncHandler(async (req, res) => {
    const patch = poItemPatchSchema.parse(req.body);
    const result = await updatePurchaseOrderItem(
      req.params.poNumber,
      req.params.poItem,
      patch
    );
    // GR updates return { po, stock, grDelta }; other patches return PO object
    if (result?.po) {
      return res.json({ data: result.po, stock: result.stock, grDelta: result.grDelta });
    }
    res.json({ data: result });
  })
);

router.post(
  '/:poNumber/asn',
  asyncHandler(async (req, res) => {
    const payload = createAsnSchema.parse(req.body);
    const result = await createAsnOnPurchaseOrder({
      PONumber: req.params.poNumber,
      ConfirmASNQty: payload.ConfirmASNQty,
      POItem: payload.POItem,
      ASNNumber: payload.ASNNumber,
    });
    res.status(201).json({ data: result.po, asn: result.asn });
  })
);

export default router;
