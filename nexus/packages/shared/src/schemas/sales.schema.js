"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderSchema = exports.OrderItemSchema = void 0;
const zod_1 = require("zod");
exports.OrderItemSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1, 'Product ID is required'),
    quantity: zod_1.z.number().min(0.000001, 'Quantity must be at least 0.000001'),
    price: zod_1.z.number().min(0, 'Price cannot be negative'),
});
exports.CreateOrderSchema = zod_1.z.object({
    customerId: zod_1.z.string().min(1, 'Customer ID is required'),
    items: zod_1.z.array(exports.OrderItemSchema).min(1, 'At least one item is required'),
    status: zod_1.z.string().optional(),
});
//# sourceMappingURL=sales.schema.js.map