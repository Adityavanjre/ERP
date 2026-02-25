import { z } from 'zod';

export const OrderItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().min(0.000001, 'Quantity must be at least 0.000001'),
    price: z.number().min(0, 'Price cannot be negative'),
});

export const CreateOrderSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
    status: z.string().optional(),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type OrderItemDto = z.infer<typeof OrderItemSchema>;
