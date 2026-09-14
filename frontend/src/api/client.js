import { readExcelFile, parseOrdersCsv, parseCostsExcel, generateCostsExcel, extractUniqueSkus } from "../services/parser";
import { computePnl as computePnlService } from "../services/calculator";
import {
  loadCosts,
  updateSingleSku,
  saveCosts
} from "../services/skuCosts";

// Memory storage for uploaded files during the session
let currentWorkbook = null;
let currentOrdersDf = null;
let lastResult = null;

// ── Upload ──────────────────────────────────────────────────────

export async function uploadPaymentFile(file) {
  currentWorkbook = await readExcelFile(file);
  
  // Cross-reference extracted SKUs with known costs
  const skusInFile = extractUniqueSkus(currentWorkbook);
  const currentCosts = loadCosts();
  let hasMissingCosts = false;
  
  for (const sku of skusInFile) {
    if (currentCosts[sku] === undefined) {
      // Add missing SKU with 0 cost
      currentCosts[sku] = { making_cost: 0, packaging_cost: 0 };
      hasMissingCosts = true;
    }
  }

  if (hasMissingCosts) {
    saveCosts(currentCosts);
  }

  return {
    file_name: file.name,
    file_id: "memory",
    has_missing_costs: hasMissingCosts
  };
}

export function getCurrentPaymentFileMeta() {
  if (currentWorkbook) {
    return { file_id: "memory" };
  }
  return null;
}

export async function uploadOrdersFile(file) {
  currentOrdersDf = await parseOrdersCsv(file);
  return {
    success: true,
    file_id: "memory"
  };
}

// ── P&L ─────────────────────────────────────────────────────────

export async function computePnL(paymentFileId, ordersFileId = null, lossRates = {}) {
  if (!currentWorkbook) {
    throw new Error("Payment file missing. Please upload it first.");
  }
  
  const lossRatesReq = {
    rto: lossRates.rto ?? 0.0,
    return_rate: lossRates.returnRate ?? 1.0,
    lost: lossRates.lost ?? 1.0,
    unresolved: lossRates.unresolved ?? 0.0,
    rto_packaging_loss: lossRates.rto_packaging_loss ?? 1.0,
    return_packaging_loss: lossRates.return_packaging_loss ?? 1.0,
  };

  const result = await computePnlService(currentWorkbook, currentOrdersDf, lossRatesReq);
  lastResult = result;
  return result;
}

export async function getResults(resultId) {
  if (lastResult) return lastResult;
  throw new Error("Results not found.");
}

// ── SKU Costs ───────────────────────────────────────────────────

export async function listSKUCosts() {
  const costs = loadCosts();
  return Object.entries(costs).map(([sku, vals]) => {
    if (!vals) return { sku, making_cost: 0, packaging_cost: 0, total_cost: 0 };
    return {
      sku,
      making_cost: vals.making_cost,
      packaging_cost: vals.packaging_cost,
      total_cost: vals.making_cost + vals.packaging_cost
    };
  });
}

export async function bulkUpdateCosts(costs) {
  saveCosts(costs);
  return { success: true };
}

export async function updateSingleCost(sku, makingCost, packagingCost) {
  updateSingleSku(sku, makingCost, packagingCost);
  return { success: true };
}

export async function importCostsFromExcel(file) {
  try {
    const workbook = await readExcelFile(file);
    const importedCosts = parseCostsExcel(workbook);
    
    if (Object.keys(importedCosts).length === 0) {
      throw new Error("Invalid SKU Costs file: Missing required columns (SKU CODE, MAKING COST, PACKAGING COST).");
    }

    const currentCosts = loadCosts();
    
    for (const [sku, cost] of Object.entries(importedCosts)) {
      currentCosts[sku] = cost;
    }
    
    saveCosts(currentCosts);
    return { success: true, count: Object.keys(importedCosts).length };
  } catch (err) {
    throw new Error("Failed to parse Excel file: " + err.message);
  }
}

export async function exportCostsToExcel() {
  const costs = loadCosts();
  return generateCostsExcel(costs); // Returns a SheetJS workbook
}

// ── Health ──────────────────────────────────────────────────────

export async function healthCheck() {
  return { status: "ok", mode: "frontend-only" };
}
