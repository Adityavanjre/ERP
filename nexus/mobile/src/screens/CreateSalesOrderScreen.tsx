import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { ShoppingCart, Plus, Trash2, ShieldAlert, CheckCircle2, User, ChevronRight, WifiOff, History } from 'lucide-react-native';
import { Theme } from '../constants/theme';
import client from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { DraftService } from '../services/DraftService';

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
}

interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    company: string;
}

interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
}

export const CreateSalesOrderScreen = ({ onBack }: { onBack: () => void }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [items, setItems] = useState<OrderItem[]>([]);
    const [hasRestored, setHasRestored] = useState(false);

    // Local state for adding a new item
    const [newProductId, setNewProductId] = useState('');
    const [newQuantity, setNewQuantity] = useState('1');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [canDismiss, setCanDismiss] = useState(false);
    const [confirmedOrderId, setConfirmedOrderId] = useState('');
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const checkConn = async () => {
            try {
                const res = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
                setIsOffline(!res.ok && res.type !== 'opaque');
            } catch { setIsOffline(true); }
        };
        const interval = setInterval(checkConn, 5000);
        checkConn();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchInitialData();
        checkForDraft();
    }, []);

    // MOB-004: Auto-sync progress to SecureStore
    useEffect(() => {
        if (hasRestored && (items.length > 0 || selectedCustomerId)) {
            DraftService.saveSalesOrderDraft({ selectedCustomerId, items });
        }
    }, [items, selectedCustomerId, hasRestored]);

    const checkForDraft = async () => {
        const draft = await DraftService.getSalesOrderDraft();
        if (draft && (draft.items.length > 0 || draft.selectedCustomerId)) {
            Alert.alert(
                'Recover Unsaved Draft',
                'We found a sales order draft you started earlier. Would you like to restore it?',
                [
                    {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => {
                            DraftService.clearSalesOrderDraft();
                            setHasRestored(true);
                        }
                    },
                    {
                        text: 'Restore Work',
                        onPress: () => {
                            setSelectedCustomerId(draft.selectedCustomerId);
                            setItems(draft.items);
                            setHasRestored(true);
                        }
                    }
                ]
            );
        } else {
            setHasRestored(true);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [custRes, prodRes] = await Promise.all([
                client.get('/crm/customers'),
                client.get('/inventory/products'),
            ]);
            setCustomers(custRes.data.data || []);
            setProducts(prodRes.data || []);
        } catch (err) {
            Alert.alert('Error', 'Failed to fetch customer/product data');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        const product = products.find(p => p.id === newProductId);
        if (!product) return;

        const qty = parseFloat(newQuantity);
        if (isNaN(qty) || qty <= 0) {
            Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
            return;
        }

        const newItem: OrderItem = {
            productId: product.id,
            productName: product.name,
            quantity: qty,
            price: product.price,
        };

        setItems([...items, newItem]);
        setNewProductId('');
        setNewQuantity('1');
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleCreateOrder = async () => {
        if (isOffline) {
            Alert.alert('Offline Mode', 'Cannot submit drafts while offline. Please restore connection.');
            return;
        }
        if (!selectedCustomerId) {
            Alert.alert('Required', 'Please select a customer');
            return;
        }
        if (items.length === 0) {
            Alert.alert('Required', 'Please add at least one item');
            return;
        }

        setSubmitting(true);
        try {
            const response = await client.post('/sales/orders', {
                customerId: selectedCustomerId,
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                })),
                status: 'Draft', // Frontend reinforces the backend intention
            });

            setConfirmedOrderId(response.data.id || 'Draft');
            setShowConfirmation(true);
            setCanDismiss(false);

            // MOB-004: Successful submission clears the persistent local draft
            await DraftService.clearSalesOrderDraft();

            // Mandatory 2-second lock to eliminate "blind tapping"
            setTimeout(() => {
                setCanDismiss(true);
            }, 2000);

        } catch (err: any) {
            Alert.alert('Submission Failed', err.response?.data?.message || 'Failed to create order draft');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <ChevronRight color={Theme.colors.foreground} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
                <Text style={styles.title}>New Sales Draft</Text>
            </View>

            {/* GOVERNANCE ALERT */}
            <View style={styles.governanceBox}>
                <ShieldAlert color={Theme.colors.warning} size={20} />
                <View style={styles.governanceTextContainer}>
                    <Text style={styles.governanceTitle}>GOVERNED CHANNEL: MOBILE</Text>
                    <Text style={styles.governanceDesc}>Orders created here are strictly restricted to DRAFT status. Stock deduction requires Web approval.</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Customer</Text>
                <View style={styles.inputContainer}>
                    <User color={Theme.colors.mutedForeground} size={20} style={styles.inputIcon} />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {customers.map(c => (
                            <TouchableOpacity
                                key={c.id}
                                onPress={() => setSelectedCustomerId(c.id)}
                                style={[
                                    styles.selectorChip,
                                    selectedCustomerId === c.id && styles.selectorChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.selectorChipText,
                                    selectedCustomerId === c.id && styles.selectorChipTextActive
                                ]}>
                                    {c.firstName} {c.lastName} ({c.company})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Add Items</Text>
                <View style={styles.addItemForm}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {products.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => setNewProductId(p.id)}
                                style={[
                                    styles.selectorChip,
                                    newProductId === p.id && styles.selectorChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.selectorChipText,
                                    newProductId === p.id && styles.selectorChipTextActive
                                ]}>
                                    {p.name} (${p.price})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <View style={styles.row}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginRight: 10 }]}
                            placeholder="Qty"
                            placeholderTextColor={Theme.colors.mutedForeground}
                            keyboardType="numeric"
                            value={newQuantity}
                            onChangeText={setNewQuantity}
                        />
                        <TouchableOpacity onPress={addItem} style={styles.addButton}>
                            <Plus color="#fff" size={20} />
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionLabel}>Order Items ({items.length})</Text>
                {items.length === 0 ? (
                    <Text style={styles.emptyText}>No items added yet</Text>
                ) : (
                    items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.productName}</Text>
                                <Text style={styles.itemMeta}>{item.quantity} x ${item.price}</Text>
                            </View>
                            <Text style={styles.itemTotal}>${(item.quantity * item.price).toFixed(2)}</Text>
                            <TouchableOpacity onPress={() => removeItem(index)} style={styles.deleteButton}>
                                <Trash2 color={Theme.colors.destructive} size={18} />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total Amount (Estimate)</Text>
                    <Text style={styles.totalValue}>
                        ${items.reduce((sum, i) => sum + (i.quantity * i.price), 0).toFixed(2)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={handleCreateOrder}
                    disabled={submitting || isOffline}
                    style={[styles.submitButton, (submitting || isOffline) && { opacity: 0.5 }]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            {isOffline ? <WifiOff color="#fff" size={20} /> : <CheckCircle2 color="#fff" size={20} />}
                            <Text style={styles.submitButtonText}>{isOffline ? 'Offline (Sync Blocked)' : 'Save Sales Draft'}</Text>
                        </>
                    )}
                </TouchableOpacity>
                <Text style={styles.footerNote}>Draft only — finalize on Web Dashboard.</Text>
            </View>

            {/* POST-ACTION CONFIRMATION SYSTEM */}
            <Modal transparent visible={showConfirmation} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconBox}>
                            <CheckCircle2 color="#10b981" size={40} />
                        </View>
                        <Text style={styles.modalTitle}>Saved as Draft</Text>
                        <Text style={styles.modalDesc}>
                            Your intent has been safely anchored for Web review.
                        </Text>

                        <View style={styles.modalDetails}>
                            <View style={[styles.detailRow, { borderBottomWidth: 1, borderBottomColor: Theme.colors.border + '50', paddingBottom: 8, marginBottom: 8 }]}>
                                <Text style={styles.detailLabel}>Status:</Text>
                                <Text style={[styles.detailValue, { color: Theme.colors.warning }]}>PENDING WEB FINALIZATION</Text>
                            </View>

                            <Text style={styles.governanceHeader}>AUDIT & GOVERNANCE PROTECTIONS:</Text>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>• Stock Status:</Text>
                                <Text style={[styles.detailValue, { color: '#ef4444' }]}>NO STOCK MOVED</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>• Ledger Status:</Text>
                                <Text style={[styles.detailValue, { color: '#ef4444' }]}>NO FINANCIAL MUTATION</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>• Audit Trail:</Text>
                                <Text style={[styles.detailValue, { color: '#10b981' }]}>MOBILE_INTENT_ONLY</Text>
                            </View>
                        </View>

                        <View style={styles.governanceReminder}>
                            <ShieldAlert color={Theme.colors.warning} size={16} />
                            <Text style={styles.governanceReminderText}>
                                Please finalize this draft on the Web Dashboard.
                            </Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => { if (canDismiss) { setShowConfirmation(false); onBack(); } }}
                            style={[styles.dismissButton, !canDismiss && { opacity: 0.5 }]}
                            disabled={!canDismiss}
                        >
                            <Text style={styles.dismissButtonText}>
                                {canDismiss ? 'Acknowledge Integrity' : 'Securing Audit Trail...'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Theme.colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Theme.colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Theme.colors.foreground,
    },
    governanceBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        borderRadius: Theme.radius.lg,
        margin: 20,
        padding: 15,
        alignItems: 'center',
    },
    governanceTextContainer: { marginLeft: 12, flex: 1 },
    governanceTitle: {
        color: Theme.colors.warning,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    governanceDesc: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    section: { padding: 20, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.mutedForeground,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIcon: { marginRight: 10 },
    selectorChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: Theme.radius.full || 20,
        backgroundColor: Theme.colors.muted,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectorChipActive: {
        backgroundColor: Theme.colors.primary + '20',
        borderColor: Theme.colors.primary,
    },
    selectorChipText: {
        fontSize: 13,
        color: Theme.colors.mutedForeground,
    },
    selectorChipTextActive: {
        color: Theme.colors.primary,
        fontWeight: '600',
    },
    addItemForm: {
        backgroundColor: Theme.colors.secondary,
        padding: 15,
        borderRadius: Theme.radius.md,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    input: {
        backgroundColor: Theme.colors.muted,
        borderRadius: Theme.radius.sm,
        padding: 10,
        color: Theme.colors.foreground,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    addButton: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: Theme.radius.sm,
        alignItems: 'center',
    },
    addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 5 },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border + '50',
    },
    itemName: { fontSize: 16, fontWeight: '600', color: Theme.colors.foreground },
    itemMeta: { fontSize: 13, color: Theme.colors.mutedForeground, marginTop: 2 },
    itemTotal: { fontSize: 16, fontWeight: '700', color: Theme.colors.foreground, marginRight: 15 },
    deleteButton: { padding: 5 },
    emptyText: { textAlign: 'center', color: Theme.colors.mutedForeground, paddingVertical: 20 },
    footer: { padding: 20, marginTop: 20 },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
    totalLabel: { fontSize: 14, color: Theme.colors.mutedForeground },
    totalValue: { fontSize: 24, fontWeight: '800', color: Theme.colors.primary },
    submitButton: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        padding: 18,
        borderRadius: Theme.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 10 },
    footerNote: {
        textAlign: 'center',
        color: Theme.colors.mutedForeground,
        fontSize: 11,
        marginTop: 15,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: Theme.colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        alignItems: 'center',
    },
    successIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Theme.colors.foreground,
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 14,
        color: Theme.colors.mutedForeground,
        textAlign: 'center',
        marginBottom: 24,
    },
    governanceHeader: {
        fontSize: 10,
        fontWeight: '800',
        color: Theme.colors.mutedForeground,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    modalDetails: {
        width: '100%',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 13,
    },
    detailValue: {
        color: Theme.colors.foreground,
        fontSize: 13,
        fontWeight: '600',
    },
    governanceReminder: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    governanceReminderText: {
        color: Theme.colors.warning,
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    dismissButton: {
        width: '100%',
        backgroundColor: Theme.colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    dismissButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});
