/**
 * Flexible business NLU for P2P chatbot.
 * Extracts intent + slots from varied phrasing (not only fixed templates).
 */

function extractPo(msg) {
  return msg.match(/\b(45\d{8})\b/)?.[1];
}

function extractCode(msg, prefix) {
  const re = new RegExp(`\\b(${prefix}\\d+)\\b`, 'i');
  return msg.match(re)?.[1]?.toUpperCase();
}

function extractCount(msg) {
  const m =
    msg.match(/\b(\d+)\s+(?:new\s+)?(?:articles?|materials?|items?|vendors?|sites?|plants?)\b/i) ||
    msg.match(/\b(?:create|add|generate)\s+(\d+)\b/i);
  const n = Number(m?.[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function extractCategory(msg) {
  const m =
    msg.match(
      /(?:category|material\s*group|group|of\s+type|type)\s+([a-z0-9][\w\s\-/]{1,40}?)(?:\s+(?:with|uom|price|currency|qty|quantity)|$)/i
    ) || msg.match(/\bof\s+category\s+([a-z0-9][\w\s\-/]{1,40}?)(?:\s|$)/i);
  return m?.[1]?.trim();
}

function extractNamedValue(msg, labels) {
  for (const label of labels) {
    const re = new RegExp(
      `${label}\\s*[:=]?\\s*([A-Za-z0-9][\\w\\s.&'\\-]{0,60}?)(?=\\s+(?:in|at|country|city|currency|region|uom|price|qty|quantity|email|code|group|category|vendor|site|article|delivery|status)\\b|$)`,
      'i'
    );
    const m = msg.match(re);
    if (m) return m[1].trim();
  }
  return undefined;
}

function extractPrice(msg) {
  const m = msg.match(/(?:price|rate|@)\s*(\d+(?:\.\d+)?)/i);
  const n = Number(m?.[1]);
  return Number.isFinite(n) ? n : undefined;
}

function extractCurrency(msg) {
  const m = msg.match(/\b(INR|USD|EUR|GBP|AED|JPY)\b/i);
  return m?.[1]?.toUpperCase();
}

function extractCountry(msg) {
  const m =
    msg.match(/country\s+([A-Za-z]{2,})\b/i) ||
    msg.match(/\b(IN|US|UK|AE|DE|CN)\b/);
  return m?.[1]?.length === 2 ? m[1].toUpperCase() : m?.[1];
}

function extractUom(msg) {
  const m = msg.match(/\b(?:uom|unit)\s*[:=]?\s*([A-Za-z]{1,5})\b/i);
  if (m) return m[1].toUpperCase();
  if (/\b(each|ea)\b/i.test(msg)) return 'EA';
  if (/\bkg\b/i.test(msg)) return 'KG';
  if (/\bbox(es)?\b/i.test(msg)) return 'BOX';
  return undefined;
}

function extractQty(msg) {
  const m =
    msg.match(/(?:of|qty|quantity)\s+(\d+(?:\.\d+)?)\s*(?:quantity|qty)?/i) ||
    msg.match(/(\d+(?:\.\d+)?)\s*(?:quantity|qty)\b/i);
  const n = Number(m?.[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isCreate(msg) {
  return /\b(create|add|new|register|maintain|generate|setup|set\s*up)\b/i.test(msg);
}

function isList(msg) {
  return /\b(list|show\s+all|display\s+all|what\s+are)\b/i.test(msg);
}

function mentionsArticles(msg) {
  return /\b(articles?|materials?|skus?|products?)\b/i.test(msg);
}

function mentionsVendors(msg) {
  return /\b(vendors?|suppliers?|creditors?)\b/i.test(msg);
}

function mentionsSites(msg) {
  return /\b(sites?|plants?|warehouses?|dc\b|distribution\s*cent(?:er|re)s?)\b/i.test(msg);
}

function mentionsPo(msg) {
  return /\b(purchase\s*orders?|\bpos?\b|po\b)\b/i.test(msg);
}

/**
 * @returns {{ action: string, slots: object, confidence?: number }}
 */
export function parseBusinessUtterance(text) {
  const msg = String(text || '').trim();
  const lower = msg.toLowerCase();
  if (!msg) return { action: 'help', slots: {} };

  if (/^(help|hi|hello|hey|what can you do|capabilities)/i.test(msg)) {
    return { action: 'help', slots: {} };
  }

  const poNumber = extractPo(msg);

  // --- Reads / lists ---
  if (isList(msg) || (/^show\b/i.test(msg) && !poNumber)) {
    if (/\bstock\b/i.test(msg) || /\binventory\b/i.test(msg)) {
      return {
        action: 'list_stock',
        slots: {
          article: extractCode(msg, 'A'),
          site: extractCode(msg, 'S'),
        },
      };
    }
    if (mentionsArticles(msg) && !/create|add|new/.test(lower)) {
      return {
        action: 'list_articles',
        slots: {
          status: /active/.test(lower) ? 'Active' : undefined,
          q: extractCategory(msg) || extractNamedValue(msg, ['category', 'group']),
        },
      };
    }
    if (mentionsVendors(msg)) return { action: 'list_vendors', slots: {} };
    if (mentionsSites(msg)) return { action: 'list_sites', slots: {} };
    if (mentionsPo(msg) || /purchase/.test(lower)) {
      return {
        action: 'list_pos',
        slots: { vendor: extractCode(msg, 'V') },
      };
    }
  }

  if (poNumber && /\b(show|display|get|status|open)\b/i.test(msg) && !/asn|cancel/.test(lower)) {
    return { action: 'get_po', slots: { PONumber: poNumber } };
  }
  if (poNumber && /\bcancel\b/i.test(msg)) {
    return { action: 'update_po_status', slots: { PONumber: poNumber, Status: 'Cancelled' } };
  }

  const articleCode = extractCode(msg, 'A');
  if (articleCode && mentionsArticles(msg) && !isCreate(msg)) {
    return { action: 'get_article', slots: { ArticleCode: articleCode } };
  }
  const vendorCode = extractCode(msg, 'V');
  if (vendorCode && mentionsVendors(msg) && !isCreate(msg) && !mentionsPo(msg)) {
    return { action: 'get_vendor', slots: { VendorCode: vendorCode } };
  }
  const siteCode = extractCode(msg, 'S');
  if (siteCode && mentionsSites(msg) && !isCreate(msg)) {
    return { action: 'get_site', slots: { SiteCode: siteCode } };
  }

  // --- ASN ---
  if (/\basn\b/i.test(msg) || /advance\s*ship/i.test(msg)) {
    return {
      action: 'create_asn',
      slots: {
        PONumber: poNumber,
        ConfirmASNQty: extractQty(msg),
        POItem: Number(msg.match(/item\s+(\d+)/i)?.[1]) || undefined,
        ASNNumber: msg.match(/\b(ASN\d+)\b/i)?.[1]?.toUpperCase(),
      },
    };
  }

  // --- GR quantity update ---
  if (/\b(gr|goods\s*receipt|receive|received)\b/i.test(msg) && (poNumber || mentionsPo(msg))) {
    const qty = extractQty(msg) || Number(msg.match(/\b(\d+(?:\.\d+)?)\b/)?.[1]);
    return {
      action: 'update_gr',
      slots: {
        PONumber: poNumber,
        GRQuantity: Number.isFinite(qty) ? qty : undefined,
        POItem: Number(msg.match(/item\s+(\d+)/i)?.[1]) || undefined,
      },
    };
  }

  // --- Updates ---
  if (/\b(update|change|modify|edit|deactivate)\b/i.test(msg)) {
    if (/\basn\b/i.test(msg)) {
      return {
        action: 'update_asn',
        slots: {
          PONumber: poNumber,
          ConfirmASNQty: extractQty(msg),
        },
      };
    }
    if (mentionsPo(msg) || poNumber) {
      return {
        action: 'update_po',
        slots: {
          PONumber: poNumber,
          Status: msg.match(/\b(Draft|Ordered|PartiallyReceived|Closed|Cancelled)\b/i)?.[1],
        },
      };
    }
    if (mentionsArticles(msg)) {
      return { action: 'update_article', slots: { ArticleCode: articleCode } };
    }
    if (mentionsVendors(msg)) {
      return { action: 'update_vendor', slots: { VendorCode: vendorCode } };
    }
    if (mentionsSites(msg)) {
      return { action: 'update_site', slots: { SiteCode: siteCode } };
    }
  }

  // --- Create masters ---
  if (isCreate(msg) && mentionsArticles(msg) && !mentionsPo(msg)) {
    const count = extractCount(msg) || 1;
    const category = extractCategory(msg);
    const slots = {
      count,
      MaterialGroup: category,
      ArticleDesc: extractNamedValue(msg, ['description', 'desc', 'name']) ||
        (category ? undefined : extractNamedValue(msg, ['article', 'material'])),
      ArticleCode: articleCode,
      UoM: extractUom(msg),
      BasePrice: extractPrice(msg),
      Currency: extractCurrency(msg) || 'INR',
      Status: 'Active',
    };
    // "create 10 new articles of category shoes"
    if (count > 1 || (!articleCode && category && !slots.ArticleDesc)) {
      return { action: 'create_articles', slots };
    }
    return { action: 'create_article', slots };
  }

  if (isCreate(msg) && mentionsVendors(msg) && !mentionsPo(msg)) {
    const name =
      extractNamedValue(msg, ['vendor', 'supplier', 'name', 'called']) ||
      msg.match(/vendor\s+([A-Za-z][\w\s.&'-]{1,40}?)(?:\s+in\b|\s+country\b|$)/i)?.[1]?.trim();
    return {
      action: 'create_vendor',
      slots: {
        VendorCode: vendorCode,
        VendorName: name,
        City: extractNamedValue(msg, ['city', 'in']) || msg.match(/\bin\s+([A-Za-z][\w\s-]{1,30}?)(?:\s+country|\s+currency|$)/i)?.[1]?.trim(),
        Country: extractCountry(msg) || 'IN',
        Currency: extractCurrency(msg) || 'INR',
        PaymentTerms: extractNamedValue(msg, ['payment\\s*terms', 'terms']),
        ContactEmail: msg.match(/([\w.+-]+@[\w.-]+\.\w+)/)?.[1],
        Status: 'Active',
      },
    };
  }

  if (isCreate(msg) && mentionsSites(msg) && !mentionsPo(msg)) {
    const name =
      extractNamedValue(msg, ['site', 'plant', 'name', 'called']) ||
      msg.match(/(?:site|plant)\s+([A-Za-z][\w\s.&'-]{1,40}?)(?:\s+city|\s+in\b|\s+country|$)/i)?.[1]?.trim();
    return {
      action: 'create_site',
      slots: {
        SiteCode: siteCode,
        SiteName: name,
        City: extractNamedValue(msg, ['city']) || msg.match(/\bcity\s+([A-Za-z][\w\s-]{1,30})/i)?.[1]?.trim(),
        Region: extractNamedValue(msg, ['region', 'state', 'zone']),
        Country: extractCountry(msg) || 'IN',
        StorageLocation: extractNamedValue(msg, ['storage\\s*location', 'sloc']) || '0001',
        Status: 'Active',
      },
    };
  }

  // --- Create PO ---
  if (
    (isCreate(msg) && mentionsPo(msg)) ||
    /create\s+purchase\s+order/i.test(msg) ||
    /^create\s+po\b/i.test(msg) ||
    /^create$/i.test(msg)
  ) {
    const slots = {
      VendorCode: extractCode(msg, 'V') || msg.match(/vendor\s+(V\d+)/i)?.[1]?.toUpperCase(),
      SiteCode: extractCode(msg, 'S') || msg.match(/site\s+(S\d+)/i)?.[1]?.toUpperCase(),
      items: [],
    };
    const article = extractCode(msg, 'A') || msg.match(/article\s+(A\d+)/i)?.[1]?.toUpperCase();
    const qty = extractQty(msg);
    const price = extractPrice(msg);
    const delivery =
      msg.match(/delivery\s+(\d{4}-\d{2}-\d{2})/i)?.[1] ||
      msg.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    const item = {};
    if (article) item.ArticleCode = article;
    if (qty) item.Quantity = qty;
    if (price != null) {
      item.NetPrice = price;
      slots._priceSkipped = true;
    }
    if (delivery) item.DeliveryDate = delivery;
    if (Object.keys(item).length) slots.items.push(item);
    return { action: 'create_po', slots };
  }

  return { action: 'unknown', slots: {}, message: msg };
}
