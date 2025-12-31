import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';


interface LuhegaLogoProps {
    size?: number;
    color?: string;
    showOverlay?: boolean;
}

export const LuhegaLogo: React.FC<LuhegaLogoProps> = ({ size = 100, color, showOverlay = true }) => {
    const { colors } = useTheme();
    const themeColor = color || colors.primary;

    // Gap proportional to size
    const gap = size * 0.12;
    const squareSize = (size - gap) / 2;
    const borderRadius = size * 0.12;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* 2x2 Grid Background */}
            <View style={[styles.grid, { gap }]}>
                <View style={[styles.row, { gap }]}>
                    <View style={[styles.square, { width: squareSize, height: squareSize, borderRadius, backgroundColor: themeColor, opacity: 0.95 }]} />
                    <View style={[styles.square, { width: squareSize, height: squareSize, borderRadius, backgroundColor: themeColor, opacity: 0.85 }]} />
                </View>
                <View style={[styles.row, { gap }]}>
                    <View style={[styles.square, { width: squareSize, height: squareSize, borderRadius, backgroundColor: themeColor, opacity: 0.85 }]} />
                    <View style={[styles.square, { width: squareSize, height: squareSize, borderRadius, backgroundColor: themeColor, opacity: 0.95 }]} />
                </View>
            </View>

            {/* Overlay Icon: Car & Spanner */}
            {showOverlay && (
                <View style={StyleSheet.absoluteFillObject}>
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconCircle, {
                            width: size * 0.55,
                            height: size * 0.55,
                            borderRadius: (size * 0.55) / 2,
                            backgroundColor: '#FFFFFF',
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.2,
                            shadowRadius: 5,
                            elevation: 8,
                        }]}>
                            <MaterialIcons
                                name="build"
                                size={size * 0.32}
                                color={themeColor}
                                style={{ position: 'absolute', transform: [{ translateX: size * 0.08 }, { translateY: -size * 0.08 }] }}
                            />
                            <MaterialIcons
                                name="directions-car"
                                size={size * 0.35}
                                color={themeColor}
                            />
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    grid: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
    },
    square: {
        // Basic square style
    },
    iconContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
    }
});
