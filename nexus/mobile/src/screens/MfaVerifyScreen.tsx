import React, { useState, useRef, useEffect } from 'react';
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
    Alert,
} from 'react-native';
import { ShieldCheck, Smartphone, RefreshCw } from 'lucide-react-native';
import { Theme } from '../constants/theme';
import client from '../api/client';

interface MfaVerifyScreenProps {
    /** The temporary pre-MFA token issued by the login endpoint */
    mfaSessionToken: string;
    /** Called with final JWT on successful MFA verification */
    onSuccess: (accessToken: string) => void;
    /** Called if the user cancels or goes back */
    onCancel: () => void;
}

/**
 * MOB-008: Mobile MFA TOTP Verification Screen
 *
 * Bridges the gap between the hardened backend MFA (TOTP via otplib)
 * and the mobile app. Displays a 6-digit split input that mirrors
 * an authenticator app code entry, matching the UX convention established
 * by Google Authenticator and Microsoft Authenticator.
 *
 * Flow:
 * 1. User logs in normally → server returns { mfaRequired: true, mfaSessionToken }
 * 2. LoginScreen detects mfaRequired and renders MfaVerifyScreen with the token
 * 3. User enters 6-digit TOTP from their authenticator app
 * 4. POST /auth/mfa/verify → returns final JWT
 * 5. onSuccess(jwt) is called → AuthContext stores token and navigates to dashboard
 */
const MfaVerifyScreen = ({ mfaSessionToken, onSuccess, onCancel }: MfaVerifyScreenProps) => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);
    const inputRefs = useRef<TextInput[]>([]);

    // TOTP 30-second window countdown
    useEffect(() => {
        const tick = () => {
            const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
            setTimeLeft(seconds);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleDigitInput = (text: string, index: number) => {
        // Handle paste of full 6-digit code
        if (text.length === 6 && /^\d{6}$/.test(text)) {
            const digits = text.split('');
            setCode(digits);
            setTimeout(() => handleVerify(digits.join('')), 100);
            return;
        }

        if (!/^\d*$/.test(text)) return; // Only allow digits

        const newCode = [...code];
        newCode[index] = text.slice(-1); // Take only last character
        setCode(newCode);

        // Auto-advance focus
        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (newCode.every(d => d !== '') && newCode.join('').length === 6) {
            setTimeout(() => handleVerify(newCode.join('')), 100);
        }
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newCode = [...code];
            newCode[index - 1] = '';
            setCode(newCode);
        }
    };

    const handleVerify = async (fullCode?: string) => {
        const otp = fullCode || code.join('');
        if (otp.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await client.post('/auth/mfa/verify', {
                token: otp,
                mfaSessionToken,
            });

            const { accessToken } = response.data;
            onSuccess(accessToken);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Invalid code. Please try again.';
            setError(msg);
            // Clear code on failure for re-entry
            setCode(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const urgentExpiry = timeLeft <= 5;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <ShieldCheck size={40} color={Theme.colors.primary} />
                    </View>
                    <Text style={styles.title}>Two-Factor Auth</Text>
                    <Text style={styles.subtitle}>Enter code from your authenticator app</Text>
                </View>

                {/* Timer indicator */}
                <View style={[styles.timerBadge, urgentExpiry && styles.timerBadgeUrgent]}>
                    <RefreshCw size={14} color={urgentExpiry ? '#ef4444' : Theme.colors.mutedForeground} />
                    <Text style={[styles.timerText, urgentExpiry && styles.timerTextUrgent]}>
                        Code refreshes in {timeLeft}s
                    </Text>
                </View>

                {/* 6-Digit Code Entry */}
                <View style={styles.codeContainer}>
                    {code.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { if (ref) inputRefs.current[index] = ref; }}
                            style={[
                                styles.digitInput,
                                digit && styles.digitInputFilled,
                                error && styles.digitInputError,
                            ]}
                            value={digit}
                            onChangeText={(text) => handleDigitInput(text, index)}
                            onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                            keyboardType="numeric"
                            maxLength={6} // Allow full paste
                            selectTextOnFocus
                            textAlign="center"
                            caretHidden
                            autoFocus={index === 0}
                        />
                    ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Security context */}
                <View style={styles.contextBox}>
                    <Smartphone size={16} color={Theme.colors.primary} />
                    <Text style={styles.contextText}>
                        This device is enforcing MFA for all financial mutations.
                    </Text>
                </View>

                {/* Manual submit (if user prefers to tap instead of auto-submit) */}
                <TouchableOpacity
                    style={[styles.verifyButton, loading && { opacity: 0.5 }]}
                    onPress={() => handleVerify()}
                    disabled={loading || code.some(d => !d)}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <ShieldCheck size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.verifyButtonText}>Verify Code</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                    <Text style={styles.cancelText}>Use a different account</Text>
                </TouchableOpacity>
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
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: Theme.colors.foreground,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: Theme.colors.mutedForeground,
        marginTop: 8,
        textAlign: 'center',
    },
    timerBadge: {
        flexDirection: 'row',
        alignSelf: 'center',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Theme.colors.muted,
        marginBottom: 32,
    },
    timerBadgeUrgent: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    timerText: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        fontWeight: '600',
    },
    timerTextUrgent: {
        color: '#ef4444',
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },
    digitInput: {
        width: 46,
        height: 58,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Theme.colors.border,
        backgroundColor: Theme.colors.card,
        fontSize: 24,
        fontWeight: '800',
        color: Theme.colors.foreground,
    },
    digitInputFilled: {
        borderColor: Theme.colors.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },
    digitInputError: {
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 16,
    },
    contextBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
    },
    contextText: {
        color: Theme.colors.mutedForeground,
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
    verifyButton: {
        flexDirection: 'row',
        backgroundColor: Theme.colors.primary,
        padding: 18,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 16,
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        alignItems: 'center',
        padding: 12,
    },
    cancelText: {
        color: Theme.colors.mutedForeground,
        fontSize: 14,
    },
});

export default MfaVerifyScreen;
