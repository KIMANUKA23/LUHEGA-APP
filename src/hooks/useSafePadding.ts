// Safe Area Padding Hook
// Use this in any screen that needs bottom safe area padding for content
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns a consistent bottom padding value that respects the phone's navigation bar.
 * Use this in ScrollView contentContainerStyle.paddingBottom
 * 
 * Example:
 * const { bottomPadding } = useSafeBottomPadding();
 * <ScrollView contentContainerStyle={{ paddingBottom: bottomPadding }}>
 */
export function useSafeBottomPadding(minPadding: number = 20) {
    const insets = useSafeAreaInsets();
    return {
        bottomPadding: Math.max(insets.bottom + minPadding, 40),
        bottomInset: insets.bottom,
    };
}

/**
 * Returns all safe area insets with convenient padding values
 */
export function useSafePadding() {
    const insets = useSafeAreaInsets();
    return {
        ...insets,
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom + 20, 40),
        paddingHorizontal: 16,
    };
}
