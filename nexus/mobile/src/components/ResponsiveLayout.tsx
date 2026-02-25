import React from 'react';
import { useWindowDimensions, View, StyleSheet, ScrollView } from 'react-native';

interface ResponsiveLayoutProps {
    children: React.ReactNode[];
    columns?: number;
}

/**
 * A responsive layout component that switches from 1-column to 2-columns
 * automatically based on screen width (tablet vs phone).
 */
export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children, columns }) => {
    const { width } = useWindowDimensions();
    const isTablet = width >= 768; // Standard tablet breakpoint
    const numColumns = columns || (isTablet ? 2 : 1);

    if (numColumns === 1) {
        return <View style={styles.singleColumn}>{children}</View>;
    }

    // Split children into columns
    const columnsData: React.ReactNode[][] = Array.from({ length: numColumns }, () => []);
    children.forEach((child, index) => {
        columnsData[index % numColumns].push(child);
    });

    return (
        <View style={styles.multiColumnContainer}>
            {columnsData.map((colChildren, colIndex) => (
                <View key={colIndex} style={styles.column}>
                    {colChildren}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    singleColumn: {
        width: '100%',
    },
    multiColumnContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
    },
    column: {
        flex: 1,
        gap: 16,
    },
});

export default ResponsiveLayout;
