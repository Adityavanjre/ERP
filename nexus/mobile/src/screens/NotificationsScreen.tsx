import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
} from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { Theme } from '../constants/theme';
import { Bell, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react-native';

interface Product {
    id: string;
    name: string;
    currentStock: number;
    minStockLevel: number;
}

const NotificationsScreen = () => {
    const { data, loading, error, refetch } = useQuery<{ items: Product[] }>('/inventory/products?limit=100');

    // Derive alerts from product stock levels
    const alerts = data?.items
        .filter(p => p.currentStock <= p.minStockLevel)
        .map(p => ({
            id: `low-stock-${p.id}`,
            type: 'LOW_STOCK',
            title: 'Low Stock Alert',
            message: `${p.name} has fallen below minimum level (${p.currentStock}/${p.minStockLevel})`,
            severity: 'HIGH',
            timestamp: new Date().toISOString(),
        })) || [];

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={[styles.severityBar, { backgroundColor: item.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }]} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleGroup}>
                        {item.severity === 'HIGH' ? <AlertTriangle size={16} color="#ef4444" /> : <AlertCircle size={16} color="#f59e0b" />}
                        <Text style={styles.title}>{item.title}</Text>
                    </View>
                    <Text style={styles.time}>NOW</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
            </View>
        </View>
    );

    if (loading && !data) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Alerts</Text>
                <Text style={styles.headerSubtitle}>Critical production notifications</Text>
            </View>

            <FlatList
                data={alerts}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={Theme.colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Bell size={48} color={Theme.colors.mutedForeground} />
                        <Text style={styles.emptyText}>No active alerts. All systems nominal.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        padding: 24,
        paddingBottom: 16,
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
    },
    listContent: {
        padding: 24,
        paddingTop: 8,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.card,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    severityBar: {
        width: 6,
    },
    cardContent: {
        flex: 1,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    titleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },
    time: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '600',
    },
    message: {
        color: Theme.colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        color: Theme.colors.mutedForeground,
        marginTop: 16,
        fontSize: 14,
        textAlign: 'center',
    },
});

export default NotificationsScreen;
