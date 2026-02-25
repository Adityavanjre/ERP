import { z } from 'zod';
export declare const OrderItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    price: number;
    quantity: number;
    productId: string;
}, {
    price: number;
    quantity: number;
    productId: string;
}>;
export declare const CreateOrderSchema: z.ZodObject<{
    customerId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        price: number;
        quantity: number;
        productId: string;
    }, {
        price: number;
        quantity: number;
        productId: string;
    }>, "many">;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    items: {
        price: number;
        quantity: number;
        productId: string;
    }[];
    status?: string | undefined;
}, {
    customerId: string;
    items: {
        price: number;
        quantity: number;
        productId: string;
    }[];
    status?: string | undefined;
}>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type OrderItemDto = z.infer<typeof OrderItemSchema>;
