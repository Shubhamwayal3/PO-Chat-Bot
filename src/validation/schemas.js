import { z } from 'zod';
import { PO_STATUSES } from '../config.js';

const statusMaster = z.enum(['Active', 'Inactive']);

export const articleCreateSchema = z.object({
  ArticleCode: z.string().min(1),
  ArticleDesc: z.string().min(1),
  UoM: z.string().min(1),
  MaterialGroup: z.string().optional().nullable(),
  BasePrice: z.coerce.number(),
  Currency: z.string().min(1),
  Status: statusMaster.default('Active'),
  LeadTimeDays: z.coerce.number().optional().nullable(),
});

export const articlePatchSchema = articleCreateSchema
  .omit({ ArticleCode: true })
  .partial();

export const vendorCreateSchema = z.object({
  VendorCode: z.string().min(1),
  VendorName: z.string().min(1),
  City: z.string().optional().nullable(),
  Country: z.string().min(1),
  PaymentTerms: z.string().optional().nullable(),
  Currency: z.string().min(1),
  ContactEmail: z.string().optional().nullable(),
  Status: statusMaster.default('Active'),
});

export const vendorPatchSchema = vendorCreateSchema
  .omit({ VendorCode: true })
  .partial();

export const siteCreateSchema = z.object({
  SiteCode: z.string().min(1),
  SiteName: z.string().min(1),
  City: z.string().optional().nullable(),
  Region: z.string().optional().nullable(),
  Country: z.string().min(1),
  StorageLocation: z.string().optional().nullable(),
  Status: statusMaster.default('Active'),
  Remarks: z.string().optional().nullable(),
});

export const sitePatchSchema = siteCreateSchema.omit({ SiteCode: true }).partial();

const poItemSchema = z.object({
  ArticleCode: z.string().min(1),
  Quantity: z.coerce.number().positive(),
  UoM: z.string().optional(),
  NetPrice: z.coerce.number().nonnegative().optional(),
  Currency: z.string().optional(),
  DeliveryDate: z.string().min(1),
  POItem: z.coerce.number().optional(),
  ASNNumber: z.string().optional().nullable(),
  ConfirmASNQty: z.coerce.number().nonnegative().optional().nullable(),
  GRQuantity: z.coerce.number().nonnegative().optional().nullable(),
});

export const poCreateSchema = z.object({
  PONumber: z.string().optional(),
  VendorCode: z.string().min(1),
  SiteCode: z.string().min(1),
  PODate: z.string().optional(),
  Status: z.enum(PO_STATUSES).default('Ordered'),
  CreatedBy: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export const poPatchSchema = z.object({
  Status: z.enum(PO_STATUSES).optional(),
  DeliveryDate: z.string().optional(),
  VendorCode: z.string().optional(),
  SiteCode: z.string().optional(),
});

export const poItemCreateSchema = poItemSchema;
export const poItemPatchSchema = z.object({
  Quantity: z.coerce.number().positive().optional(),
  NetPrice: z.coerce.number().nonnegative().optional(),
  DeliveryDate: z.string().optional(),
  UoM: z.string().optional(),
  Currency: z.string().optional(),
  ArticleCode: z.string().optional(),
  ASNNumber: z.string().optional().nullable(),
  ConfirmASNQty: z.coerce.number().nonnegative().optional().nullable(),
  GRQuantity: z.coerce.number().nonnegative().optional().nullable(),
});

export const createAsnSchema = z.object({
  ConfirmASNQty: z.coerce.number().positive(),
  POItem: z.coerce.number().optional(),
  ASNNumber: z.string().optional().nullable(),
});

export const chatActionSchema = z.object({
  action: z.string().min(1),
  slots: z.record(z.any()).default({}),
  confirm: z.boolean().optional().default(true),
});
