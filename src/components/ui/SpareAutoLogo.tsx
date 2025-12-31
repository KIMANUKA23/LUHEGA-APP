import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons'; // Using Feather for Settings (Gear) and Ionicons for Flash (Zap)
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface SpareAutoLogoProps {
    size?: number;
    color?: string; // Kept for interface compatibility, but we use specific brand colors
}

export const SpareAutoLogo: React.FC<SpareAutoLogoProps> = ({ size = 100 }) => {
    // Proportions based on the design
    const gearSize = size * 0.45;
    const boltSize = size * 0.15;
    const fontSize = size * 0.12;
    const spacing = size * 0.05;

    return (
        <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.2, overflow: 'hidden' }]}>
            {/* 1. Background Gradient (Purple) */}
            <LinearGradient
                colors={['#4c1d95', '#581c87', '#2e1065']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            />

            {/* 2. Abstract Pattern Overlay (Optional - simplified as subtle opacity) */}
            {/* We can skip complex CSS gradients, just the main colors look great */}

            <View style={styles.contentContainer}>
                {/* Top: Emerald Gear */}
                <View style={styles.iconWrapper}>
                    {/* Glow effect (simulated with shadow/opacity) */}
                    <View style={[styles.glow, { width: gearSize, height: gearSize, backgroundColor: 'rgba(52, 211, 153, 0.2)', borderRadius: gearSize / 2 }]} />
                    <Feather
                        name="settings"
                        size={gearSize}
                        color="#34d399" // emerald-400
                        style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}
                    />
                </View>

                {/* Bottom Row: Bolt + AUTO */}
                <View style={[styles.bottomRow, { marginTop: -spacing }]}>
                    <View style={styles.boltWrapper}>
                        <View style={[styles.glow, { width: boltSize * 1.5, height: boltSize * 1.5, backgroundColor: 'rgba(250, 204, 21, 0.2)', borderRadius: boltSize }]} />
                        <Ionicons
                            name="flash"
                            size={boltSize}
                            color="#FFFFFF"
                            style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
                        />
                    </View>
                    <Text style={[styles.brandText, { fontSize: fontSize }]}>
                        AUTO
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#9333ea",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        // Scale up slightly to match the "transform scale-110" from CSS
        transform: [{ scale: 1.1 }]
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    glow: {
        position: 'absolute',
        opacity: 0.8,
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    boltWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    brandText: {
        color: '#FFFFFF',
        fontWeight: '900',
        letterSpacing: 4, // tracking-widest
        // fontFamily: 'Inter', // Handled by global font or system default
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    }
});
