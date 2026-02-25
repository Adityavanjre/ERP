import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Theme } from '../constants/theme';

const ConnectivityBanner = () => {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Simple heartbeat to check connectivity
        const checkConnectivity = async () => {
            try {
                const response = await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
                setIsOffline(!response.ok && response.type !== 'opaque');
            } catch (e) {
                setIsOffline(true);
            }
        };

        const interval = setInterval(checkConnectivity, 5000);
        checkConnectivity();

        return () => clearInterval(interval);
    }, []);

    if (!isOffline) return null;

    return (
        <View style={styles.banner}>
            <WifiOff size={14} color="#fff" />
            <Text style={styles.text}>OFFLINE MODE • VIEWING CACHED DATA ONLY</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        backgroundColor: Theme.colors.destructive,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
    },
    text: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default ConnectivityBanner;
