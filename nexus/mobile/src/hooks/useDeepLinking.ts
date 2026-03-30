import { useEffect } from 'react';
import * as Linking from 'expo-linking';

interface DeepLinkConfig {
    onDeepLink?: (url: string, path: string, queryParams: Record<string, string | undefined>) => void;
}

export const useDeepLinking = ({ onDeepLink }: DeepLinkConfig = {}) => {
    useEffect(() => {
        const handleUrl = (url: string) => {
            const parsed = Linking.parse(url);
            console.log(`[DEEP_LINK] Received URL: ${url}`);
            console.log(`[DEEP_LINK] Path: ${parsed.path}, Query:`, parsed.queryParams);

            if (onDeepLink) {
                onDeepLink(url, parsed.path || '', parsed.queryParams || {});
            }
        };

        // Handle URL when app is already open
        const subscription = Linking.addEventListener('url', (event) => {
            handleUrl(event.url);
        });

        // Check if app was opened via deep link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleUrl(url);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [onDeepLink]);
};

export const getDeepLinkPath = (): string | null => {
    return Linking.useURL();
};