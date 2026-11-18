import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { config } from '../config.js';

let writeChain = Promise.resolve();
let queueDepth = 0;

function cellValue(cell) {
  if (cell == null || cell.value == null) return null;
  const v = cell.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (v.text != null) return String(v.text);
    if (v.result != null) return v.result;
    if (v.richText) return v.richText.map((t) => t.text).join('');
  }
  return v;
}

async function loadWorkbook() {
  if (!fs.existsSync(config.workbookPath)) {
    const err = new Error(`Workbook not found at ${config.workbookPath}. Run npm run seed.`);
    err.code = 'WORKBOOK_MISSING';
    throw err;
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(config.workbookPath);
  return workbook;
}

async function saveWorkbook(workbook) {
  await workbook.xlsx.writeFile(config.workbookPath);
}

export function getQueueDepth() {
  return queueDepth;
}

export function workbookExists() {
  return fs.existsSync(config.workbookPath);
}

/** Serialize all mutating workbook operations. */
export function withWriteLock(fn) {
  queueDepth += 1;
  const run = writeChain.then(async () => {
    try {
      return await fn();
    } finally {
      queueDepth -= 1;
    }
  });
  writeChain = run.catch(() => {});
  return run;
}

export async function readSheet(sheetName) {
  const workbook = await loadWorkbook();
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) {
    const err = new Error(`Sheet ${sheetName} not found`);
    err.code = 'SHEET_NOT_FOUND';
    throw err;
  }

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col] = String(cellValue(cell) ?? '').trim();
  });

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    let empty = true;
    for (let col = 1; col < headers.length; col += 1) {
      const key = headers[col];
      if (!key) continue;
      const val = cellValue(row.getCell(col));
      if (val !== null && val !== '') empty = false;
      obj[key] = val;
    }
    if (!empty) {
      obj.__rowNumber = rowNumber;
      rows.push(obj);
    }
  });
  return rows;
}

function buildSheetContext(sheet) {
  const headerRow = sheet.getRow(1);
  const headers = [];
  const headerIndex = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const name = String(cellValue(cell) ?? '').trim();
    headers[col] = name;
    if (name) headerIndex[name] = col;
  });

  return {
    sheet,
    headers,
    headerIndex,
    readRows() {
      const rows = [];
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj = {};
        let empty = true;
        for (let col = 1; col < headers.length; col += 1) {
          const key = headers[col];
          if (!key) continue;
          const val = cellValue(row.getCell(col));
          if (val !== null && val !== '') empty = false;
          obj[key] = val;
        }
        if (!empty) {
          obj.__rowNumber = rowNumber;
          rows.push(obj);
        }
      });
      return rows;
    },
    appendRow(data) {
      const values = [];
      Object.entries(headerIndex).forEach(([key, col]) => {
        values[col] = data[key] ?? null;
      });
      const row = sheet.addRow(values);
      return row.number;
    },
    updateRow(rowNumber, patch) {
      const row = sheet.getRow(rowNumber);
      Object.entries(patch).forEach(([key, value]) => {
        const col = headerIndex[key];
        if (col) row.getCell(col).value = value ?? null;
      });
      row.commit();
    },
  };
}

export async function mutateSheet(sheetName, mutator) {
  return withWriteLock(async () => {
    const workbook = await loadWorkbook();
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) {
      const err = new Error(`Sheet ${sheetName} not found`);
      err.code = 'SHEET_NOT_FOUND';
      throw err;
    }

    const result = await mutator(buildSheetContext(sheet));
    await saveWorkbook(workbook);
    return result;
  });
}

/** Mutate one or more sheets in a single locked save (e.g. PO GR + Stock). */
export async function mutateWorkbook(mutator) {
  return withWriteLock(async () => {
    const workbook = await loadWorkbook();
    const api = {
      workbook,
      getSheet(name) {
        const sheet = workbook.getWorksheet(name);
        if (!sheet) {
          const err = new Error(`Sheet ${name} not found`);
          err.code = 'SHEET_NOT_FOUND';
          throw err;
        }
        return buildSheetContext(sheet);
      },
      ensureSheet(name, columns) {
        let sheet = workbook.getWorksheet(name);
        if (!sheet) {
          sheet = workbook.addWorksheet(name);
          sheet.addRow(columns);
          sheet.getRow(1).font = { bold: true };
          columns.forEach((_, i) => {
            sheet.getColumn(i + 1).width = 16;
          });
        }
        return buildSheetContext(sheet);
      },
    };
    const result = await mutator(api);
    await saveWorkbook(workbook);
    return result;
  });
}

export async function healthCheck() {
  const exists = workbookExists();
  return {
    workbook: config.workbookPath,
    exists,
    writable: exists,
    queueDepth: getQueueDepth(),
  };
}
