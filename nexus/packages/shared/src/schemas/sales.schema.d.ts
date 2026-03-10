import { z } from 'zod';
export declare const OrderItemSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodNumber;
    price: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
    price: number;
}, {
    productId: string;
    quantity: number;
    price: number;
}>;
export declare const CreateOrderSchema: z.ZodObject<{
    customerId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
        price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
        price: number;
    }, {
        productId: string;
        quantity: number;
        price: number;
    }>, "many">;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    customerId: string;
    items: {
        productId: string;
        quantity: number;
        price: number;
    }[];
    status?: string | undefined;
}, {
    customerId: string;
    items: {
        productId: string;
        quantity: number;
        price: number;
    }[];
    status?: string | undefined;
}>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type OrderItemDto = z.infer<typeof OrderItemSchema>;
