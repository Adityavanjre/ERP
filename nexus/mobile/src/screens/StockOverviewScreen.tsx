import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { Theme } from '../constants/theme';
import { Package, AlertTriangle, TrendingDown, Search, Filter, X } from 'lucide-react-native';
import { TextInput, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';

interface Product {
    id: string;
    name: string;
    code: string;
    currentStock: number;
    minStockLevel: number;
    unit: string;
}

import { useWindowDimensions } from 'react-native';
import StockDetailSection from '../components/StockDetailSection';
import { KPIOverlay } from '../components/KPIOverlay';

const StockOverviewScreen = () => {
    const { data, loading, error, refetch } = useQuery<{ items: Product[] }>('/inventory/products?limit=100');
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'LOW' | 'RAW_MATERIAL' | 'FINISHED_GOOD'>('ALL');
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        if (!data?.items) return [];
        return data.items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.code.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter = activeFilter === 'ALL' ||
                (activeFilter === 'LOW' && item.currentStock <= item.minStockLevel);

            return matchesSearch && matchesFilter;
        });
    }, [data, searchQuery, activeFilter]);

    const renderItem = ({ item }: { item: Product }) => {
        const isLowStock = item.currentStock <= item.minStockLevel;
        const isSelected = selectedProductId === item.id;

        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelectedProductId(item.id)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <Package size={20} color={Theme.colors.primary} />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productCode}>{item.code}</Text>
                    </View>
                    {isLowStock && (
                        <View style={styles.lowStockBadge}>
                            <AlertTriangle size={12} color="#ef4444" />
                            <Text style={styles.lowStockText}>LOW</Text>
                        </View>
                    )}
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>STOCK</Text>
                        <Text style={[styles.statValue, isLowStock && styles.lowStockValue]}>
                            {item.currentStock} {item.unit}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const Sidebar = () => (
        <View style={isTablet ? styles.sidebar : styles.fullWidth}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Stock Overview</Text>
                    <Text style={styles.headerSubtitle}>Real-time inventory levels</Text>
                </View>
                {!isTablet && (
                    <View style={styles.govBadge}>
                        <Text style={styles.govBadgeText}>READ-ONLY</Text>
                    </View>
                )}
            </View>

            <KPIOverlay />

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={18} color={Theme.colors.mutedForeground} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search products..."
                        placeholderTextColor={Theme.colors.mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.filterBar}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('ALL')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>All Items</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'LOW' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('LOW')}
                    >
                        <AlertTriangle size={12} color={activeFilter === 'LOW' ? '#fff' : '#ef4444'} style={{ marginRight: 4 }} />
                        <Text style={[styles.filterText, activeFilter === 'LOW' && styles.filterTextActive]}>Low Stock</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Theme.colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <TrendingDown size={48} color={Theme.colors.mutedForeground} opacity={0.5} />
                        <Text style={styles.emptyTitle}>No Stock Data</Text>
                        <Text style={styles.emptyText}>Adjust filters or check connection.</Text>
                    </View>
                }
            />
        </View>
    );

    if (loading && !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    if (isTablet) {
        return (
            <SafeAreaView style={styles.tabletContainer}>
                <Sidebar />
                <View style={styles.detailArea}>
                    {selectedProductId ? (
                        <StockDetailSection productId={selectedProductId} />
                    ) : (
                        <View style={styles.emptyDetail}>
                            <Package size={64} color={Theme.colors.border} />
                            <Text style={styles.emptyDetailText}>Select a product to view detailed status</Text>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Sidebar />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    tabletContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Theme.colors.background,
    },
    sidebar: {
        width: 350,
        borderRightWidth: 1,
        borderRightColor: Theme.colors.border,
    },
    fullWidth: {
        flex: 1,
    },
    detailArea: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    emptyDetail: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyDetailText: {
        color: Theme.colors.mutedForeground,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
    cardSelected: {
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.primary + '10',
    },
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        padding: 24,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    govBadge: {
        backgroundColor: Theme.colors.primary + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: Theme.colors.primary + '20',
    },
    govBadgeText: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    searchContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    filterBar: {
        marginBottom: 16,
    },
    filterScroll: {
        paddingHorizontal: 24,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    filterChipActive: {
        backgroundColor: Theme.colors.primary,
        borderColor: Theme.colors.primary,
    },
    filterText: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '700',
    },
    filterTextActive: {
        color: '#fff',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: Theme.colors.foreground,
    },
    headerSubtitle: {
        fontSize: 14,
        color: Theme.colors.mutedForeground,
        marginTop: 4,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
        padding: 24,
    },
    listContent: {
        padding: 24,
        paddingTop: 8,
    },
    card: {
        backgroundColor: Theme.colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    titleContainer: {
        flex: 1,
    },
    productName: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '700',
    },
    productCode: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    lowStockBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.destructive + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: Theme.colors.destructive + '20',
    },
    lowStockText: {
        color: '#ef4444',
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.secondary,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statSeparator: {
        width: 1,
        height: '60%',
        backgroundColor: Theme.colors.border,
    },
    statLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    statValue: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '700',
    },
    lowStockValue: {
        color: '#ef4444',
    },
    errorText: {
        color: Theme.colors.destructive,
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyTitle: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '700',
        marginTop: 16,
    },
    emptyText: {
        color: Theme.colors.mutedForeground,
        marginTop: 8,
        fontSize: 14,
        textAlign: 'center',
    },
});

export default StockOverviewScreen;
