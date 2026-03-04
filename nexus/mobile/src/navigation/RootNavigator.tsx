import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { Theme } from '../constants/theme';
import { useGovernance, ERPModule } from '../hooks/useGovernance';
import { NotificationService } from '../services/NotificationService';

// Imported Screens
import StockOverviewScreen from '@/screens/StockOverviewScreen';
import OrderListScreen from '@/screens/OrderListScreen';
import OrderDetailScreen from '@/screens/OrderDetailScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import { CreateSalesOrderScreen } from '@/screens/CreateSalesOrderScreen';
import AuditPreviewScreen from '@/screens/AuditPreviewScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import RestrictedScreen from '@/screens/RestrictedScreen';
import ConnectivityBanner from '@/components/ConnectivityBanner';

const RootNavigator = () => {
    const { user, isLoading } = useAuth();
    const [currentScreen, setCurrentScreen] = useState('dashboard');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    // MOB-005: Initialize Deep Linking Listeners
    NotificationService.setupDeepLinking(null);

    if (isLoading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    if (!user) {
        return <LoginScreen />;
    }

    if (!user.tenantId) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Identity Anchored</Text>
                <Text style={styles.subtext}>
                    Please select a company via the web dashboard to proceed.
                </Text>
                <Text style={styles.restrictedBadge}>MOBILE CHANNEL PROTECTION ACTIVE</Text>
            </View>
        );
    }

    const { isModuleAllowed } = useGovernance();

    const getModuleForScreen = (screen: string): ERPModule | null => {
        switch (screen) {
            case 'stock': return 'inventory';
            case 'orders':
            case 'order-detail': return 'manufacturing';
            case 'crm': return 'crm';
            case 'create-order': return 'crm';
            default: return null;
        }
    };

    const moduleForScreen = getModuleForScreen(currentScreen);
    const isAllowed = !moduleForScreen || isModuleAllowed(moduleForScreen);

    if (!isAllowed) {
        return (
            <RestrictedScreen
                moduleName={moduleForScreen?.toUpperCase()}
                onBack={() => setCurrentScreen('dashboard')}
            />
        );
    }

    // Release Readiness: Analytics & Crash Monitoring (Mocks)
    const trackScreen = (screen: string) => {
        console.log(`[ANALYTICS] View Screen: ${screen}`);
    };

    // Global Error Handling Simulation
    const handleError = (error: any) => {
        console.error(`[CRASH_REPORTER] Caught: ${error.message}`);
    };

    // Navigation Switch
    const renderScreen = () => {
        trackScreen(currentScreen);
        switch (currentScreen) {
            case 'stock':
                return <StockOverviewScreen />;
            case 'orders':
                return <OrderListScreen onSelectOrder={(id) => { setSelectedOrderId(id); setCurrentScreen('order-detail'); }} />;
            case 'order-detail':
                if (!selectedOrderId) {
                    // Guard: no order selected — go back to list instead of blank white screen
                    setCurrentScreen('orders');
                    return null;
                }
                return (
                    <OrderDetailScreen
                        orderId={selectedOrderId}
                        onBack={() => setCurrentScreen('orders')}
                    />
                );
            case 'notifications':
                return <NotificationsScreen />;
            case 'create-order':
                return <CreateSalesOrderScreen onBack={() => setCurrentScreen('dashboard')} />;
            case 'audit-preview':
                return <AuditPreviewScreen onBack={() => setCurrentScreen('dashboard')} />;
            default:
                return <DashboardScreen onNavigate={setCurrentScreen} />;
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ConnectivityBanner />
            {renderScreen()}
        </View>
    );
};

const AppNavigator = () => {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
};

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.background,
        padding: 24,
    },
    text: {
        color: Theme.colors.foreground,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
    },
    subtext: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    restrictedBadge: {
        backgroundColor: '#fef2f2',
        color: Theme.colors.destructive,
        fontSize: 10,
        fontWeight: '900',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        letterSpacing: 1,
        borderWidth: 1,
        borderColor: '#fecaca',
    }
});

export default AppNavigator;
