import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { LogIn, ShieldCheck } from 'lucide-react-native';
import { Theme } from '../constants/theme';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await login(email, password);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <ShieldCheck size={48} color={Theme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Nexus Gateway</Text>
                    <Text style={styles.subtitle}>Mobile Governance Layer Active</Text>
                </View>

                <View style={styles.form}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="name@company.com"
                            placeholderTextColor={Theme.colors.mutedForeground}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={Theme.colors.mutedForeground}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Theme.colors.primaryForeground} />
                        ) : (
                            <>
                                <LogIn size={20} color={Theme.colors.primaryForeground} style={styles.buttonIcon} />
                                <Text style={styles.buttonText}>Sign In</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Imperial Obsidian Security Layer</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    inner: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: Theme.colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: Theme.colors.foreground,
        marginTop: 20,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 12,
        color: Theme.colors.mutedForeground,
        marginTop: 6,
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontWeight: '600',
    },
    form: {
        backgroundColor: Theme.colors.card,
        padding: 24,
        borderRadius: Theme.radius.lg * 2,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Theme.colors.mutedForeground,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: Theme.colors.background,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: Theme.radius.lg,
        padding: 16,
        color: Theme.colors.foreground,
        fontSize: 16,
    },
    button: {
        backgroundColor: Theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: Theme.radius.lg,
        marginTop: 12,
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonText: {
        color: Theme.colors.primaryForeground,
        fontSize: 16,
        fontWeight: '700',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
        fontWeight: '500',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        color: Theme.colors.mutedForeground,
        fontSize: 11,
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.5,
    },
});

export default LoginScreen;
