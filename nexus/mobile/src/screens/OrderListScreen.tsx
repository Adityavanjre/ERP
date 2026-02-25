import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { useGovernance } from '../hooks/useGovernance';
import { Theme } from '../constants/theme';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react-native';
import { TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { useState, useMemo } from 'react';
import OrderDetailScreen from './OrderDetailScreen';

interface WorkOrder {
    id: string;
    orderNumber: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    plannedQuantity: number;
    producedQuantity: number;
    startDate: string;
    targetDate: string;
    product: {
        name: string;
    };
}

const OrderListScreen = ({ onSelectOrder }: { onSelectOrder: (id: string) => void }) => {
    const { getTerminology } = useGovernance();
    const { data, loading, error, refetch } = useQuery<WorkOrder[]>('/manufacturing/work-orders');
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            const matchesSearch = item.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.product.name.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesFilter = activeFilter === 'ALL' || item.status === activeFilter;

            return matchesSearch && matchesFilter;
        });
    }, [data, searchQuery, activeFilter]);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return { color: '#22c55e', icon: CheckCircle2, label: 'COMPLETED' };
            case 'IN_PROGRESS':
                return { color: '#3b82f6', icon: Clock, label: 'IN PROGRESS' };
            case 'PENDING':
                return { color: '#f59e0b', icon: AlertCircle, label: 'PENDING' };
            default:
                return { color: '#94a3b8', icon: AlertCircle, label: status };
        }
    };

    const handleSelect = (id: string) => {
        if (isTablet) {
            setSelectedId(id);
        } else {
            onSelectOrder(id);
        }
    };

    const renderItem = ({ item }: { item: WorkOrder }) => {
        const statusConfig = getStatusConfig(item.status);
        const StatusIcon = statusConfig.icon;
        const isSelected = selectedId === item.id;

        return (
            <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(item.id)}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    <View style={[styles.statusBadge, { borderColor: statusConfig.color + '40', backgroundColor: statusConfig.color + '10' }]}>
                        <StatusIcon size={12} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                    </View>
                </View>

                <Text style={styles.productName}>{item.product.name}</Text>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${Math.min(100, (item.producedQuantity / item.plannedQuantity) * 100)}%`,
                                    backgroundColor: statusConfig.color
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {item.producedQuantity} / {item.plannedQuantity} Units
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const Sidebar = () => (
        <View style={isTablet ? styles.sidebar : styles.fullWidth}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>{getTerminology('Work Order')}s</Text>
                    <Text style={styles.headerSubtitle}>Production monitoring feed</Text>
                </View>
                {!isTablet && (
                    <View style={styles.govBadge}>
                        <Text style={styles.govBadgeText}>READ-ONLY</Text>
                    </View>
                )}
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={18} color={Theme.colors.mutedForeground} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
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
                        <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'PENDING' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('PENDING')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'PENDING' && styles.filterTextActive]}>Pending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterChip, activeFilter === 'IN_PROGRESS' && styles.filterChipActive]}
                        onPress={() => setActiveFilter('IN_PROGRESS')}
                    >
                        <Text style={[styles.filterText, activeFilter === 'IN_PROGRESS' && styles.filterTextActive]}>Active</Text>
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
                        <Clock size={48} color={Theme.colors.mutedForeground} opacity={0.5} />
                        <Text style={styles.emptyTitle}>No Activity Found</Text>
                        <Text style={styles.emptyText}>No {getTerminology('Work Order')}s match your criteria.</Text>
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
                    {selectedId ? (
                        <OrderDetailScreen orderId={selectedId} hideHeader />
                    ) : (
                        <View style={styles.emptyDetail}>
                            <ClipboardList size={64} color={Theme.colors.border} />
                            <Text style={styles.emptyDetailText}>Select a {getTerminology('Work Order')} to view details</Text>
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
        backgroundColor: Theme.colors.card,
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
    filterDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        color: Theme.colors.primary,
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    productName: {
        color: Theme.colors.foreground,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Theme.colors.background,
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        paddingTop: 16,
    },
    dateGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '600',
    },
    dateValue: {
        color: Theme.colors.foreground,
        fontSize: 12,
        fontWeight: '700',
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

export default OrderListScreen;
