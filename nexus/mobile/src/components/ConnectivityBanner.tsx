import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Theme } from '../constants/theme';

import NetInfo from '@react-native-community/netinfo';

const ConnectivityBanner = () => {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // MOB-007: Replaced 5sec polling with passive NetInfo listener to save battery
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
        });

        return () => unsubscribe();
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
