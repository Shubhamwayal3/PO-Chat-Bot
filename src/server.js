import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachRole, blockAssociateCreates, requireRole } from './middleware/roles.js';
import healthRouter from './routes/health.js';
import articlesRouter from './routes/articles.js';
import vendorsRouter from './routes/vendors.js';
import sitesRouter from './routes/sites.js';
import purchaseOrdersRouter from './routes/purchaseOrders.js';
import stockRouter from './routes/stock.js';
import chatRouter from './routes/chatActions.js';
import { workbookExists } from './services/excelService.js';

const app = express();

app.use(cors({ exposedHeaders: ['X-User-Role'] }));
app.use(express.json());
app.use(express.static(path.join(config.root, 'public')));

app.use('/api/v1/health', healthRouter);

// All business APIs require a role header
app.use('/api/v1', attachRole, requireRole);

app.use('/api/v1/articles', blockAssociateCreates, articlesRouter);
app.use('/api/v1/vendors', blockAssociateCreates, vendorsRouter);
app.use('/api/v1/sites', blockAssociateCreates, sitesRouter);
app.use('/api/v1/purchase-orders', blockAssociateCreates, purchaseOrdersRouter);
app.use('/api/v1/stock', stockRouter); // stock has no POST create of master records
app.use('/api/v1/chat', chatRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`PO Cycle Chatbot API on http://localhost:${config.port}`);
  console.log(`Workbook: ${config.workbookPath}`);
  if (!workbookExists()) {
    console.warn('Workbook missing — run: npm run seed');
  }
});
