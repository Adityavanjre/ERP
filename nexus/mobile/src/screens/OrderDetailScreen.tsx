import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { useGovernance } from '../hooks/useGovernance';
import { Theme } from '../constants/theme';
import { ChevronLeft, Info, Layers, Beaker, ShieldCheck, CheckCircle2, Eye, Send, Clock, XCircle } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import apiClient from '../api/client';

interface OrderDetail {
    id: string;
    orderNumber: string; // Kept from original, as it's used in navTitle
    status: string;
    total: number; // Added from instruction
    createdAt: string; // Added from instruction
    product: { // Kept from original, as it's used in Product Info section
        name: string;
        code: string;
    };
    items: Array<{ // Added from instruction, assuming this replaces the product info for the "Order Items" section
        id: string;
        productId: string;
        quantity: number;
        price: number;
        product: { name: string; code: string };
    }>;
    bom: {
        name: string; // Kept from original, though not used in the new BOM section
        id: string; // Added from instruction, though not used
        components: Array<{
            id: string;
            product: { name: string; code: string };
            quantity: number;
        }>;
    };
    plannedQuantity: number;
    producedQuantity: number;
    scrapQuantity: number;
}

const OrderDetailScreen = ({ orderId, onBack, hideHeader }: { orderId: string, onBack?: () => void, hideHeader?: boolean }) => {
    const { getTerminology } = useGovernance();
    const { data, loading, error, refetch } = useQuery<OrderDetail>(`/manufacturing/work-orders/${orderId}`);

    const { user } = useAuth();
    const isAuthorized = user?.role === 'Owner' || user?.role === 'Manager';
    const canUnblock = data && (data.status === 'Draft' || data.status === 'Pending');
    const [actionLoading, setActionLoading] = useState(false);

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!data) return;
        setActionLoading(true);
        try {
            await apiClient.post(`/manufacturing/work-orders/${data.id}/${action}`);
            Alert.alert('Success', `${getTerminology('Work Order')} ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
            refetch();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || `Failed to ${action} ${getTerminology('Work Order')}.`);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{error || 'Order not found'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {!hideHeader && (
                <View style={styles.navHeader}>
                    <TouchableOpacity onPress={onBack} style={styles.backIcon}>
                        <ChevronLeft color={Theme.colors.foreground} size={28} />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>{getTerminology('Work Order')} Details</Text>
                    <View style={{ width: 28 }} />
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}> {/* Changed to content from scrollContent */}
                <View style={styles.orderHeader}>
                    <View>
                        <Text style={styles.orderId}>#{data.id.split('-')[0].toUpperCase()}</Text>
                        <Text style={styles.orderDate}>{new Date(data.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: Theme.colors.primary + '20' }]}>
                        <Text style={[styles.statusText, { color: Theme.colors.primary }]}>{data.status}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Layers size={18} color={Theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Order Items</Text>
                    </View>
                    <View style={styles.listCard}>
                        {data.items.map((item) => (
                            <View key={item.id} style={styles.listItem}>
                                <View style={styles.listItemText}>
                                    <Text style={styles.itemName}>{item.product.name}</Text>
                                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                                </View>
                                <Text style={styles.itemTotal}>${(item.quantity * item.price).toFixed(2)}</Text>
                            </View>
                        ))}
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Estimate</Text>
                            <Text style={styles.totalValue}>${data.total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Info size={18} color={Theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Product Info</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Text style={styles.productName}>{data.product.name}</Text>
                        <Text style={styles.productCode}>{data.product.code}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Layers size={18} color={Theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Production Status</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>PLANNED</Text>
                            <Text style={styles.statValue}>{data.plannedQuantity}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>PRODUCED</Text>
                            <Text style={styles.statValue}>{data.producedQuantity}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>SCRAP</Text>
                            <Text style={[styles.statValue, { color: data.scrapQuantity > 0 ? '#ef4444' : Theme.colors.foreground }]}>
                                {data.scrapQuantity}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Beaker size={18} color={Theme.colors.primary} />
                        <Text style={styles.sectionTitle}>BOM Components</Text>
                    </View>
                    <View style={styles.listCard}>
                        {data.bom.components.map((comp) => (
                            <View key={comp.id} style={styles.listItem}>
                                <View style={styles.listItemText}>
                                    <Text style={styles.componentName}>{comp.product.name}</Text>
                                    <Text style={styles.componentCode}>{comp.product.code}</Text>
                                </View>
                                <Text style={styles.componentQty}>{comp.quantity} / Unit</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Clock size={18} color={Theme.colors.primary} />
                        <Text style={styles.sectionTitle}>Draft Lifecycle</Text>
                    </View>
                    <View style={styles.timeline}>
                        <View style={styles.timelineItem}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]}>
                                <CheckCircle2 size={12} color="#fff" />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Created on Mobile</Text>
                                <Text style={styles.timelineDate}>Anchored • {new Date(data.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                        <View style={styles.timelineConnector} />
                        <View style={styles.timelineItem}>
                            <View style={[styles.timelineDot, styles.timelineDotActive]}>
                                <CheckCircle2 size={12} color="#fff" />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Synced to Server</Text>
                                <Text style={styles.timelineDate}>MOBILE_INTENT_ONLY tag applied</Text>
                            </View>
                        </View>
                        <View style={styles.timelineConnector} />
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot}>
                                <Eye size={12} color={Theme.colors.mutedForeground} />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Viewed on Web</Text>
                                <Text style={styles.timelineDate}>Pending Auditor review...</Text>
                            </View>
                        </View>
                        <View style={styles.timelineConnector} />
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot}>
                                <Send size={12} color={Theme.colors.mutedForeground} />
                            </View>
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineTitle}>Submitted (Web-only)</Text>
                                <Text style={styles.timelineDate}>Finalizes financial mutation</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {isAuthorized && canUnblock && (
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.approveButton, actionLoading && { opacity: 0.7 }]}
                            onPress={() => handleAction('approve')}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <CheckCircle2 size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>Approve {getTerminology('Work Order')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton, actionLoading && { opacity: 0.7 }]}
                            onPress={() => handleAction('reject')}
                            disabled={actionLoading}
                        >
                            {actionLoading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <XCircle size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>Reject {getTerminology('Work Order')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.governanceBox}>
                    <ShieldCheck size={16} color={Theme.colors.mutedForeground} />
                    <Text style={styles.governanceText}>STRICTLY GOVERNED VIEW • ACCOUNTING INTEGRITY ANCHORED</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    backIcon: {
        padding: 4,
    },
    navTitle: {
        color: Theme.colors.foreground,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    placeholder: {
        width: 32,
    },
    content: {
        padding: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginLeft: 8,
    },
    infoCard: {
        backgroundColor: Theme.colors.card,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    productName: {
        color: Theme.colors.foreground,
        fontSize: 20,
        fontWeight: '700',
    },
    productCode: {
        color: Theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        width: '31%',
        backgroundColor: Theme.colors.card,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
    },
    statValue: {
        color: Theme.colors.foreground,
        fontSize: 18,
        fontWeight: '800',
    },
    listCard: {
        backgroundColor: Theme.colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    listItemText: {
        flex: 1,
    },
    componentName: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    componentCode: {
        color: Theme.colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    componentQty: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    governanceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 40,
        opacity: 0.5,
    },
    governanceText: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    errorText: {
        color: Theme.colors.destructive,
        marginBottom: 16,
    },
    backButton: {
        backgroundColor: Theme.colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    orderHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    orderId: {
        color: Theme.colors.foreground,
        fontSize: 24,
        fontWeight: '800',
    },
    orderDate: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    itemName: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '600',
    },
    itemQty: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
        marginTop: 2,
    },
    itemTotal: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '700',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: Theme.colors.primary + '10', // Light gradient effect
        marginTop: 8,
    },
    totalLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
        fontWeight: '700',
    },
    totalValue: {
        color: Theme.colors.primary,
        fontSize: 18,
        fontWeight: '800',
    },
    actionSection: {
        padding: 16,
        gap: 12,
        marginBottom: 24,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    approveButton: {
        backgroundColor: Theme.colors.success, // emerald-500
    },
    rejectButton: {
        backgroundColor: Theme.colors.destructive,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    timeline: {
        paddingLeft: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Theme.colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    timelineDotActive: {
        backgroundColor: Theme.colors.success,
        borderColor: Theme.colors.success,
    },
    timelineConnector: {
        width: 2,
        height: 20,
        backgroundColor: Theme.colors.border,
        marginLeft: 11,
    },
    timelineContent: {
        marginLeft: 16,
    },
    timelineTitle: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    timelineDate: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
});

export default OrderDetailScreen;
