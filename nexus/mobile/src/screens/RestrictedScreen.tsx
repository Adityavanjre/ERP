import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { MonitorOff, ChevronLeft } from 'lucide-react-native';
import { Theme } from '../constants/theme';

interface RestrictedScreenProps {
    moduleName?: string;
    onBack?: () => void;
}

const RestrictedScreen: React.FC<RestrictedScreenProps> = ({ moduleName, onBack }) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <MonitorOff size={48} color={Theme.colors.mutedForeground} />
                </View>

                <Text style={styles.title}>Web Oversight Required</Text>
                <Text style={styles.description}>
                    The {moduleName ? `"${moduleName}" module` : 'requested feature'} is currently restricted to the Desktop application to ensure strict financial auditability.
                </Text>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        Please use the Desktop/Web application to access this component.
                    </Text>
                </View>

                {onBack && (
                    <TouchableOpacity style={styles.backButton} onPress={onBack}>
                        <ChevronLeft size={20} color={Theme.colors.foreground} />
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    content: {
        flex: 1,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: Theme.colors.foreground,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: Theme.colors.mutedForeground,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    infoBox: {
        backgroundColor: Theme.colors.secondary,
        padding: 20,
        borderRadius: Theme.radius.lg,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        width: '100%',
    },
    infoText: {
        color: Theme.colors.foreground,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
    },
    backButtonText: {
        color: Theme.colors.foreground,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default RestrictedScreen;
