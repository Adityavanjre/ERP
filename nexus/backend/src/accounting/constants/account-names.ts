export const StandardAccounts = {
  // Asset
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  INVENTORY_ASSET: 'Inventory Asset',
  RAW_MATERIAL_INVENTORY: 'Raw Material Inventory',
  FINISHED_GOODS_INVENTORY: 'Finished Goods Inventory',
  WIP_INVENTORY: 'WIP Inventory',
  CASH: 'Cash',
  BANK: 'Bank',
  GST_RECEIVABLE: 'GST Receivable',

  // Liability
  ACCOUNTS_PAYABLE: 'Accounts Payable',
  GST_PAYABLE: 'GST Payable', // Legacy
  OUTPUT_IGST: 'Output IGST',
  OUTPUT_CGST: 'Output CGST',
  OUTPUT_SGST: 'Output SGST',
  INPUT_IGST: 'Input IGST',
  INPUT_CGST: 'Input CGST',
  INPUT_SGST: 'Input SGST',
  TDS_PAYABLE: 'TDS Payable',

  // Equity
  RETAINED_EARNINGS: 'Retained Earnings',
  OPENING_BALANCE_EQUITY: 'Opening Balance Equity',

  // Revenue
  SALES: 'Sales',
  SALES_RETURNS: 'Sales Returns',

  // Expense
  COGS: 'Cost of Goods Sold',
  PURCHASE_RETURNS: 'Purchase Returns',
  SALARY_EXPENSE: 'Salary Expense',
  WAGES_EXPENSE: 'Wages Expense',
  MANUFACTURING_OVERHEAD_ABSORBED: 'Manufacturing Overhead Absorbed',
  INVENTORY_ADJUSTMENT: 'Inventory Adjustment',
  SCRAP_EXPENSE: 'Scrap Expense',
  FIXED_ASSETS: 'Fixed Assets',
  ACCUMULATED_DEPRECIATION: 'Accumulated Depreciation',
  DEPRECIATION_EXPENSE: 'Depreciation Expense',
  ROUNDING_OFF: 'Rounding Off',
};


export const AccountSelectors = {
  INVENTORY: [StandardAccounts.INVENTORY_ASSET, 'Inventory'],
  SALARY: [StandardAccounts.SALARY_EXPENSE, StandardAccounts.WAGES_EXPENSE, 'Payroll Expense'],
  CASH_BANK: [StandardAccounts.CASH, StandardAccounts.BANK],
  FINISHED_GOODS: [StandardAccounts.FINISHED_GOODS_INVENTORY, StandardAccounts.INVENTORY_ASSET],
  RAW_MATERIALS: [StandardAccounts.RAW_MATERIAL_INVENTORY, StandardAccounts.INVENTORY_ASSET],
  WIP: [StandardAccounts.WIP_INVENTORY],
};
