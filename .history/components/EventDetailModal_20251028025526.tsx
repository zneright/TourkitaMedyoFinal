import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    ActivityIndicator,
    Linking,
} from "react-native";
import { format, isToday, parse, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLandmark } from "../provider/LandmarkProvider";

type EventType = {
    id?: string;
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    eventStartTime: string;
    eventEndTime?: string;
    address: string;
    customAddress?: { latitude: number; longitude: number; label: string } | string;
    locationId?: string;
    lat?: number;
    lng?: number;
    imageUrl?: string;
    openToPublic?: boolean;
    recurrence?: {
        frequency?: 'once' | 'weekly';
        daysOfWeek?: string[];
    };
};

interface Props {
    visible: boolean;
    onClose: () => void;
    event: EventType | null;
}

const EventDetailModal: React.FC<Props> = ({ visible, onClose, event }) => {
    const navigation = useNavigation<any>();
    const { setSelectedLandmark, loadDirection } = useLandmark();
    const [loading, setLoading] = useState(false);
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [displayAddress, setDisplayAddress] = useState<string>("");

    useEffect(() => {
        const fetchMarkerName = async () => {
            if (!event) return;
            if (event.customAddress) {
                setDisplayAddress(typeof event.customAddress === "string" ? event.customAddress : event.customAddress.label || "N/A");
            } else if (event.locationId) {
                try {
                    const docRef = doc(db, "markers", event.locationId);
                    const snap = await getDoc(docRef);
                    setDisplayAddress(snap.exists() ? snap.data()?.name || "N/A" : "N/A");
                } catch { setDisplayAddress("N/A"); }
            } else {
                setDisplayAddress(event.address || "N/A");
            }
        };
        fetchMarkerName();
    }, [event]);

    if (!event) {
        return null;
    }

    // --- ADDED: Check if the event has a navigatable location ---
    const hasLocation = !!(event.lat && event.lng || event.locationId);

    // --- All other formatting functions (format, isToday, etc.) are unchanged ---
    const start = parseISO(event.startDate);
    const end = event.endDate ? parseISO(event.endDate) : start;
    let displayDate = "";
    if (isToday(start) && !event.endDate) {
        displayDate = "Today";
    } else if (start.getTime() === end.getTime()) {
        displayDate = format(start, "MMMM dd, yyyy");
    } else {
        displayDate = `${format(start, "MMMM dd, yyyy")} — ${format(end, "MMMM dd, yyyy")}`;
    }
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "N/A";
        try {
            const t = parse(timeStr, "HH:mm", new Date());
            return format(t, "hh:mm a");
        } catch { return timeStr; }
    };
    const formattedStartTime = formatTime(event.eventStartTime);
    const formattedEndTime = event.eventEndTime ? formatTime(event.eventEndTime) : null;
    const formatRecurrence = () => {
        if (event?.recurrence?.frequency === 'weekly' && event.recurrence.daysOfWeek) {
            const days = event.recurrence.daysOfWeek;
            const dayCount = days.length;
            if (dayCount === 7) return "Occurs every day";
            if (dayCount === 5 && days.every(d => ['mon', 'tue', 'wed', 'thu', 'fri'].includes(d))) return "Occurs every weekday";
            if (dayCount === 2 && days.every(d => ['sat', 'sun'].includes(d))) return "Occurs every weekend";
            const formattedDays = days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
            return `Occurs every ${formattedDays}`;
        }
        return null;
    };
    const recurrenceText = formatRecurrence();
    const publicStatus = event.openToPublic ? "Open to Public" : "Private Event";
    const publicStatusColor = event.openToPublic ? "#27ae60" : "#c0392b";

    // --- EDITED: handleNavigate function updated ---
    const handleNavigate = async () => {
        try {
            setLoading(true);

            if (event.lat && event.lng) {
                const target = {
                    name: event.title,
                    category: "Events",
                    latitude: event.lat,
                    longitude: event.lng,
                };
                loadDirection(target); // Assuming this sets the route
                navigation.navigate("Maps", target);

            } else if (event.locationId) {
                const docRef = doc(db, "markers", event.locationId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const marker = snap.data();
                    setSelectedLandmark(marker); // Set context for the map
                    navigation.navigate("Maps", {
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                        name: event.title,
                        category: "Events",
                    });
                } else {
                    // Fallback if marker ID is invalid
                    setSelectedLandmark(null); // Clear previous landmark
                    navigation.navigate("Maps", { category: "Events" });
                }
            } else {
                // This case handles events with no locationId or lat/lng
                setSelectedLandmark(null); // **THIS IS THE FIX**: Clear the previous landmark
                navigation.navigate("Maps", { category: "Events" });
            }

            onClose();
        } catch (err) {
            console.error("Navigation failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                        <Ionicons name="close" size={28} color="#555" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.content}>
                        {event.imageUrl && (
                            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                                <Image source={{ uri: event.imageUrl }} style={styles.heroImage} resizeMode="cover" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.title}>{event.title}</Text>

                        {/* Info Cards */}
                        <View style={[styles.cardBase, styles.infoCard]}>
                            <Ionicons name="calendar-outline" size={20} color="#555" />
                            <Text style={styles.infoText}>{displayDate}</Text>
                        </View>
                        {recurrenceText && (
                            <View style={[styles.cardBase, styles.infoCard]}>
                                <Ionicons name="repeat-outline" size={20} color="#555" />
                                <Text style={styles.infoText}>{recurrenceText}</Text>
                            </View>
                        )}
                        <View style={[styles.cardBase, styles.infoCard]}>
                            <Ionicons name="time-outline" size={20} color="#555" />
                            <Text style={styles.infoText}>
                                {formattedStartTime}{formattedEndTime ? ` — ${formattedEndTime}` : ""}
                            </Text>
                        </View>
                        <View style={[styles.cardBase, styles.infoCard]}>
                            <Ionicons name="location-outline" size={20} color="#555" />
                            <Text style={styles.infoText} numberOfLines={2}>{displayAddress}</Text>
                        </View>

                        {/* Description Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.description}>
                                {event.description || "No description provided."}
                            </Text>
                        </View>

                        <View style={styles.statusCard}>
                            <Ionicons name="people-outline" size={20} color={publicStatusColor} />
                            <Text style={[styles.statusText, { color: publicStatusColor }]}>
                                {publicStatus}
                            </Text>
                        </View>

                        {/* --- EDITED: Navigate Button now disables if no location --- */}
                        <TouchableOpacity
                            style={[styles.navigateButton, !hasLocation && styles.disabledButton]}
                            onPress={handleNavigate}
                            disabled={loading || !hasLocation}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.navigateText}>
                                {hasLocation ? "Navigate" : "No Location Available"}
                            </Text>}
                        </TouchableOpacity>
                    </ScrollView>

                    {event.imageUrl && (
                        <Modal visible={isImageModalVisible} transparent animationType="fade">
                            <TouchableOpacity style={styles.modal} onPress={() => setImageModalVisible(false)} activeOpacity={1}>
                                <Image source={{ uri: event.imageUrl }} style={styles.modalImage} resizeMode="contain" />
                            </TouchableOpacity>
                        </Modal>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 10 },
    modalContainer: { width: "95%", maxHeight: "85%", backgroundColor: "#fff", borderRadius: 20, overflow: "hidden" },
    closeIcon: { position: "absolute", top: 10, right: 10, zIndex: 10 },
    content: { paddingTop: 40, paddingHorizontal: 20, alignItems: "center", paddingBottom: 20 },
    heroImage: { width: 320, height: 180, borderRadius: 16, marginBottom: 15, backgroundColor: "#ddd" },
    title: { fontSize: 24, fontWeight: "bold", color: "#2c3e50", textAlign: "center", marginBottom: 15 },
    cardBase: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f9f9", padding: 12, borderRadius: 12, width: "100%", marginBottom: 12 },
    infoCard: { justifyContent: "flex-start" },
    infoText: { fontSize: 14, color: "#555", marginLeft: 10, flex: 1 },
    section: { width: "100%", marginBottom: 15, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 12 },
    sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6, color: '#333' },
    description: { fontSize: 15, color: "#555", textAlign: "justify", lineHeight: 22 },
    statusCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0f0f0", padding: 12, borderRadius: 12, marginBottom: 20 },
    statusText: { fontSize: 13, fontWeight: "bold", marginLeft: 8 },
    navigateButton: { backgroundColor: "#493628", paddingVertical: 14, borderRadius: 12, width: "100%", alignItems: "center" },
    navigateText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    // --- ADDED: Style for disabled button ---
    disabledButton: {
        backgroundColor: "#a1887f", // A muted color
    },
    modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
    modalImage: { width: "90%", height: "70%", borderRadius: 12 },
});

export default EventDetailModal;