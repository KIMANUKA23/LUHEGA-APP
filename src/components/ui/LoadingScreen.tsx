import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LuhegaLogo } from './LuhegaLogo';
import { StatusBar } from 'expo-status-bar';

interface LoadingScreenProps {
    onFinish: () => void;
    isReady?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish, isReady = false }) => {
    // Stage: 'loading' = pulsing, 'bursting' = burst animation, 'finished' = done
    const [stage, setStage] = useState<'loading' | 'bursting' | 'finished'>('loading');
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    // Animated Values
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const textOpacity = useRef(new Animated.Value(1)).current;

    // Guard against multiple transitions
    const burstStarted = useRef(false);

    // Pulse Animation for Loading Stage
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.1,
                    duration: 750,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(scale, {
                    toValue: 1,
                    duration: 750,
                    easing: Easing.bezier(0.4, 0, 0.2, 1),
                    useNativeDriver: true,
                })
            ])
        );

        if (stage === 'loading') {
            pulse.start();
        } else {
            scale.stopAnimation();
        }

        return () => pulse.stop();
    }, [stage]);

    // Minimum Timer (2 seconds of pulsing)
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    // Trigger Burst when ready
    useEffect(() => {
        if (isReady && minTimeElapsed && stage === 'loading' && !burstStarted.current) {
            startBurst();
        }
    }, [isReady, minTimeElapsed, stage]);

    const startBurst = () => {
        if (burstStarted.current) return;
        burstStarted.current = true;
        setStage('bursting');

        // Burst Animation: Scale up massively and fade out
        Animated.parallel([
            Animated.timing(scale, {
                toValue: 30,
                duration: 800,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(textOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setStage('finished');
            onFinish();
        });
    };

    if (stage === 'finished') return null;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Logo with Pulse/Burst Animation */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: opacity,
                        transform: [{ scale: scale }],
                    }
                ]}
            >
                <LuhegaLogo size={100} showOverlay={false} />
            </Animated.View>

            {/* Text Content - Fades out during burst */}
            <Animated.View
                style={[
                    styles.contentContainer,
                    { opacity: textOpacity }
                ]}
            >
                <Text style={styles.title}>Luhega App</Text>
                <Text style={styles.tagline}>SMART BUSINESS SOLUTIONS</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F9FF', // Light blue background
    },
    logoContainer: {
        marginBottom: 60,
    },
    contentContainer: {
        position: 'absolute',
        bottom: 100,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 8,
        color: '#0F172A', // slate-900
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
    },
    tagline: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: '#64748B', // slate-500
    },
});

