import { Router } from 'express';
import { healthCheck } from '../services/excelService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const wb = await healthCheck();
    res.json({
      status: wb.exists ? 'ok' : 'degraded',
      workbook: wb.workbook,
      writable: wb.writable,
      queueDepth: wb.queueDepth,
    });
  })
);

export default router;
