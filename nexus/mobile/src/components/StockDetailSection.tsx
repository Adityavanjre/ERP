import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { Theme } from '../constants/theme';
import { Package, MapPin, Gauge, ShieldCheck, DollarSign, Barcode } from 'lucide-react-native';

interface StockDetail {
    id: string;
    name: string;
    code: string;
    sku?: string;
    barcode?: string;
    description?: string;
    stock: number;
    unit: string;
    costPrice?: number;
    basePrice?: number;
    stockLocations: Array<{
        id: string;
        quantity: number;
        warehouse: {
            name: string;
            location?: string;
        };
    }>;
}

const StockDetailSection = ({ productId }: { productId: string }) => {
    const { data, loading, error } = useQuery<StockDetail>(`/inventory/products/${productId}`);

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
                <Text style={styles.errorText}>{error || 'Product not found'}</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.iconBox}>
                    <Package size={32} color={Theme.colors.primary} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.productName}>{data.name}</Text>
                    <Text style={styles.productCode}>{data.code}</Text>
                </View>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Gauge size={16} color={Theme.colors.primary} />
                    <Text style={styles.statValue}>{data.stock}</Text>
                    <Text style={styles.statLabel}>Total Stock</Text>
                </View>
                <View style={styles.statCard}>
                    <Barcode size={16} color={Theme.colors.primary} />
                    <Text style={styles.statValue}>{data.sku || 'N/A'}</Text>
                    <Text style={styles.statLabel}>SKU</Text>
                </View>
                <View style={[styles.statCard, { borderStyle: 'dashed' }]}>
                    <DollarSign size={16} color={Theme.colors.primary} />
                    <Text style={styles.statValue}>${data.basePrice?.toFixed(2) || '0.00'}</Text>
                    <Text style={styles.statLabel}>Base Price</Text>
                </View>
            </View>

            {data.description && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.descriptionCard}>
                        <Text style={styles.descriptionText}>{data.description}</Text>
                    </View>
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Warehouse Breakdown</Text>
                {data.stockLocations.length > 0 ? (
                    <View style={styles.listCard}>
                        {data.stockLocations.map((loc) => (
                            <View key={loc.id} style={styles.listItem}>
                                <View style={styles.locInfo}>
                                    <MapPin size={16} color={Theme.colors.mutedForeground} />
                                    <View style={styles.locText}>
                                        <Text style={styles.warehouseName}>{loc.warehouse.name}</Text>
                                        {loc.warehouse.location && (
                                            <Text style={styles.warehouseLoc}>{loc.warehouse.location}</Text>
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.locQty}>{loc.quantity} {data.unit || 'Units'}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No stock recorded in any warehouse.</Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Stock Aging Analysis</Text>
                <View style={styles.agingCard}>
                    <View style={styles.agingHeader}>
                        <Text style={styles.agingTitle}>Inventory Health</Text>
                        <View style={styles.healthBadge}>
                            <Text style={styles.healthBadgeText}>STABLE</Text>
                        </View>
                    </View>
                    <View style={styles.agingBar}>
                        <View style={[styles.agingSegment, { flex: 0.6, backgroundColor: Theme.colors.success }]} />
                        <View style={[styles.agingSegment, { flex: 0.25, backgroundColor: Theme.colors.warning }]} />
                        <View style={[styles.agingSegment, { flex: 0.15, backgroundColor: Theme.colors.destructive }]} />
                    </View>
                    <View style={styles.agingLabels}>
                        <Text style={styles.agingLabelText}>0-30d (60%)</Text>
                        <Text style={styles.agingLabelText}>31-90d (25%)</Text>
                        <Text style={styles.agingLabelText}>90d+ (15%)</Text>
                    </View>
                    <Text style={styles.agingInsight}>
                        15% of stock is non-moving for over 90 days. Recommend review for scrap or discount.
                    </Text>
                </View>
            </View>

            <View style={styles.governanceBox}>
                <ShieldCheck size={16} color={Theme.colors.mutedForeground} />
                <Text style={styles.governanceText}>STRICTLY READ-ONLY • AUDIT ANCHORED</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: Theme.colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: Theme.colors.primary + '20',
    },
    headerText: {
        flex: 1,
    },
    productName: {
        color: Theme.colors.foreground,
        fontSize: 24,
        fontWeight: '800',
    },
    productCode: {
        color: Theme.colors.primary,
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
    },
    statCard: {
        flex: 1,
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
    statValue: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '800',
        marginVertical: 4,
    },
    statLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    descriptionCard: {
        backgroundColor: Theme.colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    descriptionText: {
        color: Theme.colors.foreground,
        fontSize: 14,
        lineHeight: 22,
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
    locInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locText: {
        marginLeft: 12,
    },
    warehouseName: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    warehouseLoc: {
        color: Theme.colors.mutedForeground,
        fontSize: 11,
        marginTop: 2,
    },
    locQty: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyCard: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    emptyText: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
    },
    governanceBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        opacity: 0.5,
    },
    governanceText: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    agingCard: {
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
    agingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    agingTitle: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '700',
    },
    healthBadge: {
        backgroundColor: Theme.colors.success + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Theme.colors.success + '20',
    },
    healthBadgeText: {
        color: Theme.colors.success,
        fontSize: 10,
        fontWeight: '800',
    },
    agingBar: {
        height: 12,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 6,
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 12,
    },
    agingSegment: {
        height: '100%',
    },
    agingLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    agingLabelText: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '600',
    },
    agingInsight: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    errorText: {
        color: Theme.colors.destructive,
        fontWeight: '600',
    }
});

export default StockDetailSection;
