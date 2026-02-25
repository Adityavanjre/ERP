import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Theme } from '../constants/theme';

interface KPITileProps {
    label: string;
    value: string | number;
    trend?: string;
    trendColor?: string;
    icon?: string;
}

const KPITile: React.FC<KPITileProps> = ({ label, value, trend, trendColor }) => (
    <View style={styles.tile}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {trend && (
            <Text style={[styles.trend, { color: trendColor || Theme.colors.success }]}>
                {trend}
            </Text>
        )}
    </View>
);

export const KPIOverlay: React.FC = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>OPERATIONAL INTELLIGENCE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <KPITile
                    label="STOCK AGING (>90d)"
                    value="₹14.2L"
                    trend="↓ 4.2%"
                />
                <KPITile
                    label="PROD. VELOCITY"
                    value="92%"
                    trend="↑ 2.1%"
                />
                <KPITile
                    label="OPEN JOB CARDS"
                    value="24"
                    trend="Stable"
                    trendColor={Theme.colors.mutedForeground}
                />
                <KPITile
                    label="QUALITY YIELD"
                    value="99.4%"
                    trend="↓ 0.1%"
                    trendColor={Theme.colors.destructive}
                />
            </ScrollView>
            <View style={styles.governanceBanner}>
                <Text style={styles.governanceText}>READ-ONLY • FORENSIC REAL-TIME DATA</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 16,
        backgroundColor: Theme.colors.background,
    },
    header: {
        fontSize: 12,
        fontWeight: '800',
        color: Theme.colors.mutedForeground,
        letterSpacing: 1.5,
        marginLeft: 16,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
        flexDirection: 'row',
    },
    tile: {
        width: 140,
        height: 100,
        backgroundColor: Theme.colors.card,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: Theme.colors.mutedForeground,
        textTransform: 'uppercase',
    },
    value: {
        fontSize: 20,
        fontWeight: '700',
        color: Theme.colors.foreground,
    },
    trend: {
        fontSize: 10,
        fontWeight: '600',
    },
    governanceBanner: {
        marginTop: 12,
        marginHorizontal: 16,
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor: Theme.colors.secondary,
        borderRadius: 4,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    governanceText: {
        fontSize: 9,
        fontWeight: '800',
        color: Theme.colors.mutedForeground,
        letterSpacing: 1,
    },
});
