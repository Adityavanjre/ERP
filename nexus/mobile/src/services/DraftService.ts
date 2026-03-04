import * as SecureStore from 'expo-secure-store';

const DRAFT_KEYS = {
    SALES_ORDER: 'nexus_draft_sales_order',
};

export interface SalesOrderDraft {
    selectedCustomerId: string;
    items: any[];
}

export const DraftService = {
    async saveSalesOrderDraft(draft: SalesOrderDraft) {
        try {
            await SecureStore.setItemAsync(DRAFT_KEYS.SALES_ORDER, JSON.stringify(draft));
        } catch (e) {
            console.error('Failed to save sales order draft', e);
        }
    },

    async getSalesOrderDraft(): Promise<SalesOrderDraft | null> {
        try {
            const draft = await SecureStore.getItemAsync(DRAFT_KEYS.SALES_ORDER);
            return draft ? JSON.parse(draft) : null;
        } catch (e) {
            console.error('Failed to get sales order draft', e);
            return null;
        }
    },

    async clearSalesOrderDraft() {
        try {
            await SecureStore.deleteItemAsync(DRAFT_KEYS.SALES_ORDER);
        } catch (e) {
            console.error('Failed to clear sales order draft', e);
        }
    }
};
