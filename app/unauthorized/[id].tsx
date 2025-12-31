// Unauthorized Spare Detail Screen
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Platform,
    StatusBar,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    KeyboardAvoidingView
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as unauthorizedService from "../../src/services/unauthorizedService";
import * as inventoryService from "../../src/services/inventoryService";
import * as userService from "../../src/services/userService";
import { useTheme } from "../../src/context/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";

export default function UnauthorizedSpareDetail() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const { isAdmin } = useAuth();
    const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

    const [incident, setIncident] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [partName, setPartName] = useState<string | null>(null);
    const [reporterName, setReporterName] = useState<string | null>(null);

    // Status Update State
    const [updating, setUpdating] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [actionTaken, setActionTaken] = useState("");

    useEffect(() => {
        if (id) {
            loadIncident();
        }
    }, [id]);

    const loadIncident = async () => {
        setLoading(true);
        try {
            const incidentId = Array.isArray(id) ? id[0] : id;
            const data = await unauthorizedService.getUnauthorizedSpare(incidentId);

            if (data) {
                setIncident(data);

                // Load related data in parallel
                const promises = [];

                if (data.part_id) {
                    promises.push(inventoryService.getProduct(data.part_id).then(p => {
                        if (p) setPartName(p.name);
                    }));
                }

                if (data.reported_by) {
                    promises.push(userService.getUsers().then(users => {
                        const u = users.find(user => user.id === data.reported_by);
                        if (u) setReporterName(u.name);
                    }));
                }

                await Promise.allSettled(promises);
            } else {
                Alert.alert("Error", "Incident not found.");
                router.back();
            }
        } catch (error) {
            console.log("Error loading incident:", error);
            Alert.alert("Error", "Failed to load incident details.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus: 'open' | 'in_progress' | 'resolved', action?: string) => {
        if (!incident) return;

        setUpdating(true);
        try {
            const updated = await unauthorizedService.updateUnauthorizedSpareStatus(
                incident.incident_id,
                newStatus,
                action
            );

            if (updated) {
                setIncident(updated);
                setShowResolveModal(false);
                Alert.alert("Success", `Incident marked as ${newStatus.replace('_', ' ')}`);
            } else {
                // Offline fallback or error
                Alert.alert("Success", "Status updated locally (changes will sync when online)");
                setIncident({ ...incident, status: newStatus, action_taken: action });
                setShowResolveModal(false);
            }
        } catch (error) {
            console.log("Error updating status:", error);
            Alert.alert("Error", "Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "open": return { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "rgba(239, 68, 68, 0.15)", text: colors.error, label: "Open" };
            case "in_progress": return { bg: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.15)", text: colors.warning, label: "In Progress" };
            case "resolved": return { bg: isDark ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.15)", text: colors.success, label: "Resolved" };
            default: return { bg: colors.border, text: colors.textSecondary, label: status };
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 16, color: colors.textSecondary }}>Loading details...</Text>
            </View>
        );
    }

    if (!incident) return null;

    const statusStyle = getStatusStyle(incident.status);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ExpoStatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

            {/* Header */}
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingTop: statusBarHeight + 8,
                    paddingBottom: 12,
                    backgroundColor: colors.background,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                }}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 9999,
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>

                <Text
                    style={{
                        flex: 1,
                        textAlign: "center",
                        fontSize: 18,
                        fontWeight: "700",
                        color: colors.text,
                        fontFamily: "Poppins_700Bold",
                    }}
                >
                    Incident Details
                </Text>

                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Badge */}
                <View style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
                    <View
                        style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            backgroundColor: statusStyle.bg,
                        }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: statusStyle.text }}>
                            {statusStyle.label}
                        </Text>
                    </View>
                </View>

                {/* Title */}
                <Text
                    style={{
                        fontSize: 22,
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: 8,
                        fontFamily: "Poppins_700Bold",
                    }}
                >
                    {incident.description.split('\n')[1]?.replace('Title: ', '') || 'Untitled Incident'}
                </Text>

                <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 24 }}>
                    Reported on {new Date(incident.date_reported).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>

                {/* Linked Part Card */}
                {partName && (
                    <View
                        style={{
                            backgroundColor: colors.card,
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 20,
                            borderWidth: 1,
                            borderColor: colors.border,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        <View style={{
                            width: 48, height: 48,
                            borderRadius: 8,
                            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EBF5FF',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <MaterialIcons name="inventory-2" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' }}>LINKED STOCK ITEM</Text>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>{partName}</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push(`/inventory/${incident.part_id}`)}>
                            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Details Card */}
                <View
                    style={{
                        backgroundColor: colors.card,
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 20,
                        borderWidth: 1,
                        borderColor: colors.border,
                    }}
                >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 12 }}>
                        Description
                    </Text>
                    <Text style={{ fontSize: 15, color: colors.text, lineHeight: 24 }}>
                        {incident.description}
                    </Text>

                    {/* Action Taken Display (if resolved) */}
                    {incident.action_taken && (
                        <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border }}>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.success, marginBottom: 8 }}>
                                Action Taken
                            </Text>
                            <Text style={{ fontSize: 15, color: colors.text }}>{incident.action_taken}</Text>
                        </View>
                    )}
                </View>

                {/* Meta Info */}
                <View
                    style={{
                        backgroundColor: colors.surface,
                        borderRadius: 16,
                        padding: 16,
                        gap: 16
                    }}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>Incident ID</Text>
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{incident.incident_id.substring(0, 8)}...</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>Reported By</Text>
                        <Text style={{ color: colors.text, fontWeight: '500' }}>{reporterName || 'Unknown User'}</Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary }}>Sync Status</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <MaterialIcons
                                name={incident.synced ? "cloud-done" : "cloud-off"}
                                size={16}
                                color={incident.synced ? colors.success : colors.textSecondary}
                            />
                            <Text style={{ color: incident.synced ? colors.success : colors.textSecondary, fontWeight: '500' }}>
                                {incident.synced ? 'Synced' : 'Pending Sync'}
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView>

            {/* Admin Actions Footer */}
            {isAdmin && incident.status !== 'resolved' && (
                <View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: 16, backgroundColor: colors.card,
                    borderTopWidth: 1, borderTopColor: colors.border,
                    flexDirection: 'row', gap: 12
                }}>
                    {incident.status === 'open' && (
                        <TouchableOpacity
                            onPress={() => handleUpdateStatus('in_progress')}
                            disabled={updating}
                            style={{
                                flex: 1, height: 50, borderRadius: 12,
                                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.warning,
                                alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <Text style={{ color: colors.warning, fontWeight: '600' }}>Mark In Progress</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => setShowResolveModal(true)}
                        disabled={updating}
                        style={{
                            flex: 1, height: 50, borderRadius: 12,
                            backgroundColor: colors.primary,
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>Resolve Issue</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Resolve Modal */}
            <Modal
                visible={showResolveModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowResolveModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}
                >
                    <View style={{
                        backgroundColor: colors.card, borderRadius: 20, padding: 24,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10
                    }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, fontFamily: 'Poppins_700Bold' }}>
                            Resolve Incident
                        </Text>

                        <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
                            Action Taken (Required)
                        </Text>

                        <TextInput
                            style={{
                                height: 100, borderRadius: 12, backgroundColor: colors.surface,
                                borderWidth: 1, borderColor: colors.border, padding: 12,
                                textAlignVertical: 'top', color: colors.text, fontSize: 15, marginBottom: 24
                            }}
                            placeholder="Describe how this issue was resolved..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={actionTaken}
                            onChangeText={setActionTaken}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setShowResolveModal(false)}
                                style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleUpdateStatus('resolved', actionTaken)}
                                disabled={!actionTaken.trim() || updating}
                                style={{
                                    flex: 1, height: 48, borderRadius: 12,
                                    backgroundColor: !actionTaken.trim() ? colors.border : colors.success,
                                    alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: '600' }}>Confirm Resolve</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </View>
    );
}
