const fs = require('fs');

const products = `name,costPrice,sellingPrice,sku,stock,hsnCode,gstRate
"iPhone 15 Pro",1200,1050,IP15-BLK,50,8517,18
"MacBook Air M2",1199,1000,MB-M2-SLV,25,8471,18
`;

const customers = `firstName,lastName,email,phone,company,address,state,gstin,openingBalance
John,Doe,john@example.com,555-0123,Doe Corp,"123 Main St",Maharashtra,27ABCDE1234F1Z5,1500.50
Jane,Smith,jane@enterprise.co,555-4567,Enterprise Co,"456 Tech Park",Karnataka,29XYZDE5678G2Z9,0
`;

const vendors = `name,email,phone,gstin,address,state
"Tech Suppliers Ltd",supply@tech.com,555-9876,27SUPPLY1234A1Z5,"789 Industrial Area",Maharashtra
`;

fs.writeFileSync('products_template.csv', products);
fs.writeFileSync('customers_template.csv', customers);
fs.writeFileSync('vendors_template.csv', vendors);

console.log('Templates created: products_template.csv, customers_template.csv, vendors_template.csv');
