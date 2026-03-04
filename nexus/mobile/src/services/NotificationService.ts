import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import client from '../api/client';

// Configure how notifications are handled when the app is open
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const NotificationService = {
    async registerForPushNotificationsAsync() {
        let token;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        // Project ID is required for EAS Build/Expo Go
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push Token:', token);

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    },

    async uploadToken(token: string) {
        try {
            await client.post('/auth/push-token', { token });
            console.log('Push token uploaded successfully');
        } catch (e) {
            console.error('Failed to upload push token', e);
        }
    },

    // MOB-005: Deep-linking handler
    setupDeepLinking(navigation: any) {
        const url = Linking.useURL();

        if (url) {
            const { hostname, path, queryParams } = Linking.parse(url);
            console.log(`Linked to app with hostname: ${hostname}, path: ${path} and data:`, queryParams);

            // Handle specific navigation routes here if needed
            if (path === 'orders' && queryParams?.id) {
                // Example: navigation.navigate('order-detail', { id: queryParams.id });
            }
        }
    }
};
