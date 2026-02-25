import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
} from 'react-native';
import {
    LayoutGrid,
    Package,
    ShoppingCart,
    TrendingUp,
    AlertCircle,
    Bell,
    ChevronRight,
    Search,
    Clock,
    ShieldCheck,
    Info,
    X,
} from 'lucide-react-native';
import { Theme } from '../constants/theme';
import { useAuth } from '../auth/AuthContext';
import { useGovernance } from '../hooks/useGovernance';
import { Modal, useWindowDimensions } from 'react-native';
import ResponsiveLayout from '../components/ResponsiveLayout';

const DashboardScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
    const { user } = useAuth();
    const { isModuleAllowed, getTerminology } = useGovernance();
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;
    const [refreshing, setRefreshing] = useState(false);
    const [showGovInfo, setShowGovInfo] = useState(false);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1500);
    }, []);

    const QUICK_STATS = [
        { label: 'Today Orders', value: '12', icon: ShoppingCart, color: '#3b82f6', screen: 'orders' },
        { label: 'Low Stock Items', value: '4', icon: Package, color: '#ef4444', screen: 'stock' },
        { label: 'Active Jobs', value: '8', icon: Clock, color: '#10b981', screen: 'orders' },
        { label: 'CRM Leads', value: '24', icon: TrendingUp, color: '#8b5cf6', screen: 'crm' },
    ];

    const ALERTS = [
        { id: '1', type: 'critical', title: 'Critical Stock Alert', desc: 'Raw Material XYZ below threshold.', time: '10m ago' },
        { id: '2', type: 'info', title: 'New Sales Draft', desc: 'Submitted by Agent Sarah.', time: '1h ago' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />}
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.userName}>{user?.email.split('@')[0]}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={[styles.bellButton, { marginRight: 12 }]}
                            onPress={() => setShowGovInfo(true)}
                        >
                            <ShieldCheck color={Theme.colors.primary} size={24} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bellButton}>
                            <Bell color={Theme.colors.foreground} size={24} />
                            <View style={styles.notifBadge} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* GOVERNANCE INFO MODAL */}
                <Modal transparent visible={showGovInfo} animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <ShieldCheck size={24} color={Theme.colors.primary} />
                                <Text style={styles.modalTitle}>Governance Protocol</Text>
                                <TouchableOpacity onPress={() => setShowGovInfo(false)} style={styles.closeButton}>
                                    <X size={20} color={Theme.colors.mutedForeground} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalScroll}>
                                <View style={styles.govSection}>
                                    <Text style={styles.govSectionTitle}>Mobile Capabilities</Text>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.govText}>View real-time inventory and production status.</Text>
                                    </View>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.govText}>Create non-binding DRAFTS for sales and manufacturing.</Text>
                                    </View>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.govText}>Binary approvals (Manager oversight) to unblock flows.</Text>
                                    </View>
                                </View>

                                <View style={styles.govSection}>
                                    <Text style={styles.govSectionTitle}>Requires Web Dashboard</Text>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: Theme.colors.destructive }]} />
                                        <Text style={styles.govText}>Finalizing financial mutations (Invoicing, Payments).</Text>
                                    </View>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: Theme.colors.destructive }]} />
                                        <Text style={styles.govText}>Official stock deductions and ledger posts.</Text>
                                    </View>
                                    <View style={styles.govItem}>
                                        <View style={[styles.govDot, { backgroundColor: Theme.colors.destructive }]} />
                                        <Text style={styles.govText}>Modifying historical audit-locked records.</Text>
                                    </View>
                                </View>
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.understandButton}
                                onPress={() => setShowGovInfo(false)}
                            >
                                <Text style={styles.understandButtonText}>Acknowledge</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* KPI GRIDS */}
                <View style={[styles.statsGrid, isTablet && styles.statsGridTablet]}>
                    {QUICK_STATS.map((stat, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.statCard, isTablet && styles.statCardTablet]}
                            onPress={() => onNavigate(stat.screen)}
                        >
                            <View style={[styles.statIconBox, { backgroundColor: stat.color + '20' }]}>
                                <stat.icon color={stat.color} size={20} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ResponsiveLayout>
                    {/* ALERTS SECTION */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Operational Alerts</Text>
                            <AlertCircle size={16} color={Theme.colors.mutedForeground} />
                        </View>
                        {ALERTS.map(alert => (
                            <View key={alert.id} style={styles.alertCard}>
                                <View style={[styles.alertIndicator, { backgroundColor: alert.type === 'critical' ? '#ef4444' : '#3b82f6' }]} />
                                <View style={styles.alertContent}>
                                    <Text style={styles.alertTitle}>{alert.title}</Text>
                                    <Text style={styles.alertDesc}>{alert.desc}</Text>
                                </View>
                                <Text style={styles.alertTime}>{alert.time}</Text>
                            </View>
                        ))}
                    </View>

                    {/* QUICK ACTIONS DRILLED FROM DATA */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Drill-Down Views</Text>
                        <TouchableOpacity style={styles.drillCard} onPress={() => onNavigate('stock')}>
                            <View style={styles.drillIcon}>
                                <Package color={Theme.colors.primary} size={24} />
                            </View>
                            <View style={styles.drillInfo}>
                                <Text style={styles.drillTitle}>Inventory Health</Text>
                                <Text style={styles.drillDesc}>Monitor stock levels & valuation</Text>
                            </View>
                            <ChevronRight color={Theme.colors.mutedForeground} size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.drillCard} onPress={() => onNavigate('orders')}>
                            <View style={styles.drillIcon}>
                                <ShoppingCart color={Theme.colors.primary} size={24} />
                            </View>
                            <View style={styles.drillInfo}>
                                <Text style={styles.drillTitle}>{getTerminology('Work Order')} Monitor</Text>
                                <Text style={styles.drillDesc}>Real-time production feed</Text>
                            </View>
                            <ChevronRight color={Theme.colors.mutedForeground} size={20} />
                        </TouchableOpacity>
                    </View>
                </ResponsiveLayout>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>GOVERNED READ-ONLY FEED</Text>
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
    content: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    greeting: {
        color: Theme.colors.mutedForeground,
        fontSize: 16,
    },
    userName: {
        color: Theme.colors.foreground,
        fontSize: 24,
        fontWeight: '800',
    },
    bellButton: {
        position: 'relative',
        padding: 8,
        backgroundColor: Theme.colors.muted,
        borderRadius: 12,
    },
    notifBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        backgroundColor: '#ef4444',
        borderRadius: 4,
        borderWidth: 2,
        borderColor: Theme.colors.background,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    statsGridTablet: {
        justifyContent: 'flex-start',
        gap: 16,
    },
    statCard: {
        width: '48%',
        backgroundColor: Theme.colors.card,
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    statCardTablet: {
        width: '23.5%',
        marginBottom: 0,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        color: Theme.colors.foreground,
        fontSize: 24,
        fontWeight: '800',
    },
    statLabel: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 4,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: Theme.colors.foreground,
        fontSize: 18,
        fontWeight: '700',
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.card,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    alertIndicator: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 16,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    alertDesc: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    alertTime: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
    },
    drillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.card,
        padding: 20,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    drillIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Theme.colors.muted,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    drillInfo: {
        flex: 1,
    },
    drillTitle: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '600',
    },
    drillDesc: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        marginTop: 2,
    },
    footer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 40,
        opacity: 0.5,
    },
    footerText: {
        color: Theme.colors.mutedForeground,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Lightened overlay
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '80%',
        borderTopWidth: 1,
        borderColor: Theme.colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        color: Theme.colors.foreground,
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 12,
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    modalScroll: {
        marginBottom: 24,
    },
    govSection: {
        marginBottom: 24,
        backgroundColor: Theme.colors.secondary,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    govSectionTitle: {
        color: Theme.colors.primary,
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    govItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    govDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 10,
    },
    govText: {
        color: Theme.colors.mutedForeground,
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },
    understandButton: {
        backgroundColor: Theme.colors.primary,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    understandButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default DashboardScreen;
