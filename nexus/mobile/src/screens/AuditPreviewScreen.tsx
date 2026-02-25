import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useQuery } from '../hooks/useQuery';
import { Theme } from '../constants/theme';
import { ShieldCheck, History, AlertCircle, CheckCircle2, ChevronLeft, Info, Fingerprint } from 'lucide-react-native';

interface AuditLog {
    id: string;
    action: string;
    resource: string;
    createdAt: string;
    details: any;
    user?: {
        fullName: string;
    };
}

interface IntegrityReport {
    status: 'CLEAN' | 'FAIL';
    forensicReport: {
        auditCertificate: string;
        riskScore: number;
        invariants: {
            globalDrCr: string;
            perJournalDrCr: string;
            traceability: string;
            immutability: string;
            moduleLinkage: string;
        };
    };
}

const AuditPreviewScreen = ({ onBack }: { onBack: () => void }) => {
    const { data: integrity, loading: integrityLoading } = useQuery<IntegrityReport>('/system/audit');
    const { data: logsData, loading: logsLoading, refetch: refetchLogs } = useQuery<{ items: AuditLog[] }>('/system/audit/logs');

    const [viewMode, setViewMode] = useState<'integrity' | 'logs'>('integrity');

    const renderLogItem = ({ item }: { item: AuditLog }) => (
        <View style={styles.logCard}>
            <View style={styles.logHeader}>
                <View style={styles.actionBadge}>
                    <Text style={styles.actionText}>{item.action.toUpperCase()}</Text>
                </View>
                <Text style={styles.logDate}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Text style={styles.logResource}>{item.resource}</Text>
            {item.user && (
                <View style={styles.userRow}>
                    <Fingerprint size={12} color={Theme.colors.mutedForeground} />
                    <Text style={styles.userName}>{item.user.fullName}</Text>
                </View>
            )}
        </View>
    );

    const IntegrityView = () => {
        if (integrityLoading) return <ActivityIndicator color={Theme.colors.primary} style={{ marginTop: 40 }} />;
        if (!integrity) return <Text style={styles.errorText}>Failed to load integrity report</Text>;

        const report = integrity.forensicReport;
        const isClean = integrity.status === 'CLEAN';

        return (
            <ScrollView contentContainerStyle={styles.reportContent}>
                <View style={[styles.certCard, isClean ? styles.certClean : styles.certFail]}>
                    {isClean ? <ShieldCheck size={48} color="#10b981" /> : <AlertCircle size={48} color="#ef4444" />}
                    <Text style={[styles.certTitle, { color: isClean ? '#10b981' : '#ef4444' }]}>
                        {report.auditCertificate}
                    </Text>
                    <Text style={styles.certSubtitle}>Nexus Forensic Verification</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Verification Invariants</Text>
                    <View style={styles.invariantGrid}>
                        <InvariantItem label="Double-Entry Parity" status={report.invariants.globalDrCr} />
                        <InvariantItem label="Journal Integrity" status={report.invariants.perJournalDrCr} />
                        <InvariantItem label="Chain Traceability" status={report.invariants.traceability} />
                        <InvariantItem label="System Immutability" status={report.invariants.immutability} />
                    </View>
                </View>

                <View style={styles.trustBox}>
                    <Info size={16} color={Theme.colors.primary} />
                    <Text style={styles.trustText}>
                        Nexus uses cryptographic correlation IDs to ensure no data can be modified without a verifiable trace.
                    </Text>
                </View>
            </ScrollView>
        );
    };

    const InvariantItem = ({ label, status }: { label: string, status: string }) => (
        <View style={styles.invariantRow}>
            <Text style={styles.invariantLabel}>{label}</Text>
            <View style={[styles.statusTag, status === 'PASSED' ? styles.statusPass : styles.statusFail]}>
                <Text style={styles.statusTagText}>{status}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <ChevronLeft size={24} color={Theme.colors.foreground} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Audit Preview</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, viewMode === 'integrity' && styles.tabActive]}
                    onPress={() => setViewMode('integrity')}
                >
                    <ShieldCheck size={18} color={viewMode === 'integrity' ? Theme.colors.primary : Theme.colors.mutedForeground} />
                    <Text style={[styles.tabText, viewMode === 'integrity' && styles.tabTextActive]}>Integrity</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, viewMode === 'logs' && styles.tabActive]}
                    onPress={() => setViewMode('logs')}
                >
                    <History size={18} color={viewMode === 'logs' ? Theme.colors.primary : Theme.colors.mutedForeground} />
                    <Text style={[styles.tabText, viewMode === 'logs' && styles.tabTextActive]}>Logs</Text>
                </TouchableOpacity>
            </View>

            {viewMode === 'integrity' ? (
                <IntegrityView />
            ) : (
                <FlatList
                    data={logsData?.items || []}
                    renderItem={renderLogItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={logsLoading} onRefresh={refetchLogs} tintColor={Theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <History size={48} color={Theme.colors.mutedForeground} />
                            <Text style={styles.emptyText}>No audit logs found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTitle: {
        color: Theme.colors.foreground,
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
    },
    backButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: Theme.colors.secondary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        gap: 8,
    },
    tabActive: {
        borderColor: Theme.colors.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
    tabText: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
        fontWeight: '700',
    },
    tabTextActive: {
        color: Theme.colors.primary,
    },
    reportContent: {
        padding: 24,
    },
    certCard: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 32,
    },
    certClean: {
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    certFail: {
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    certTitle: {
        fontSize: 20,
        fontWeight: '900',
        marginTop: 16,
        textAlign: 'center',
    },
    certSubtitle: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        letterSpacing: 1,
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
        marginBottom: 16,
    },
    invariantGrid: {
        backgroundColor: Theme.colors.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        gap: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    invariantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    invariantLabel: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusPass: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    statusFail: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: Theme.colors.foreground,
    },
    trustBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        alignItems: 'center',
    },
    trustText: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    listContent: {
        padding: 16,
    },
    logCard: {
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
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBadge: {
        backgroundColor: Theme.colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    actionText: {
        color: Theme.colors.primary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    logDate: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
    },
    logResource: {
        color: Theme.colors.foreground,
        fontSize: 14,
        fontWeight: '600',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    userName: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: Theme.colors.mutedForeground,
        marginTop: 16,
        fontSize: 14,
    },
    errorText: {
        color: Theme.colors.destructive,
        textAlign: 'center',
        marginTop: 40,
    }
});

export default AuditPreviewScreen;
