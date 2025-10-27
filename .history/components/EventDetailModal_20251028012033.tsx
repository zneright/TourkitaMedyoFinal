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
    SafeAreaView,
    Pressable, // Used for the overlay dismiss
} from "react-native";
import { format, isToday, parse, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useLandmark } from "../provider/LandmarkProvider";

// Define the type for an event object
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

// Define the props for the component
interface Props {
    visible: boolean;
    onClose: () => void;
    event: EventType | null;
}

const EventDetailModal: React.FC<Props> = ({ visible, onClose, event }) => {
    const navigation = useNavigation<any>();
    const { setSelectedLandmark, loadDirection } = useLandmark();
    const [loading, setLoading] = useState(false);
    const [displayAddress, setDisplayAddress] = useState<string>("");

    // Effect to fetch and set the display address when the event changes
    useEffect(() => {
        const fetchMarkerName = async () => {
            if (!event) return;
            if (event.customAddress && typeof event.customAddress === 'string') {
                setDisplayAddress(event.customAddress);
            } else if (event.locationId) {
                try {
                    const docRef = doc(db, "markers", event.locationId);
                    const snap = await getDoc(docRef);
                    setDisplayAddress(snap.exists() ? snap.data()?.name || "Address not found" : "Address not found");
                } catch {
                    setDisplayAddress("Error fetching address");
                }
            } else {
                setDisplayAddress(event.address || "No address provided");
            }
        };
        fetchMarkerName();
    }, [event]);

    if (!event) {
        return null;
    }

    // --- Date and Time Formatting ---
    const start = parseISO(event.startDate);
    const end = event.endDate ? parseISO(event.endDate) : start;
    let displayDate = "";
    if (isToday(start) && !event.endDate) {
        displayDate = "Today";
    } else if (start.getTime() === end.getTime()) {
        displayDate = format(start, "MMMM dd, yyyy");
    } else {
        displayDate = `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
    }

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "";
        try {
            return format(parse(timeStr, "HH:mm", new Date()), "hh:mm a");
        } catch {
            return timeStr;
        }
    };

    const formattedStartTime = formatTime(event.eventStartTime);
    const formattedEndTime = formatTime(event.eventEndTime);

    // --- Recurrence and Status Formatting ---
    const recurrenceText = event?.recurrence?.frequency === 'weekly' ? `Occurs weekly on ${event.recurrence.daysOfWeek?.join(', ')}` : null;
    const publicStatus = event.openToPublic ? "Open to Public" : "Private Event";
    const publicStatusColor = event.openToPublic ? "#28a745" : "#A93226"; // Green for public, red for private

    // --- Navigation Handler ---
    const handleNavigate = async () => {
        if (!event) return;
        setLoading(true);
        try {
            let target: any = { name: event.title, category: "Events" };
            if (event.lat && event.lng) {
                target = { ...target, latitude: event.lat, longitude: event.lng };
            } else if (event.locationId) {
                const docRef = doc(db, "markers", event.locationId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const marker = snap.data();
                    target = { ...target, latitude: marker.latitude, longitude: marker.longitude };
                    setSelectedLandmark(marker);
                }
            }
            if (target.latitude && target.longitude) {
                loadDirection(target);
                navigation.navigate("Map", target);
                onClose();
            } else {
                alert("Location details not available for navigation.");
            }
        } catch (err) {
            console.error("Navigation failed:", err);
            alert("Could not prepare navigation. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            {/* Overlay that can be pressed to close the modal */}
            <Pressable style={styles.overlay} onPress={onClose}>
                {/* Modal content that doesn't trigger close on press */}
                <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.header}>
                        <View style={styles.handlebar} />
                        {event.imageUrl ? (
                            <Image source={{ uri: event.imageUrl }} style={styles.heroImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="calendar" size={80} color="#C0B8AF" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                            <Ionicons name="close-circle" size={32} color="#fff" />
                        </TouchableOpacity>
                        <View style={[styles.statusChip, { backgroundColor: publicStatusColor }]}>
                            <Ionicons name={event.openToPublic ? "people-outline" : "lock-closed-outline"} size={14} color="#fff" />
                            <Text style={styles.statusChipText}>{publicStatus}</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        <Text style={styles.title}>{event.title}</Text>

                        {/* Details Section */}
                        <View style={styles.detailSection}>
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={22} color="#493628" />
                                <Text style={styles.infoText}>{displayDate}</Text>
                            </View>
                            {recurrenceText && (
                                <View style={styles.infoRow}>
                                    <Ionicons name="repeat-outline" size={22} color="#493628" />
                                    <Text style={styles.infoText}>{recurrenceText}</Text>
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={22} color="#493628" />
                                <Text style={styles.infoText}>
                                    {formattedStartTime}{formattedEndTime ? ` — ${formattedEndTime}` : ""}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={22} color="#493628" />
                                <Text style={styles.infoText} numberOfLines={2}>{displayAddress}</Text>
                            </View>
                        </View>

                        {/* Description Section */}
                        <View style={styles.descriptionSection}>
                            <Text style={styles.sectionTitle}>About this event</Text>
                            <Text style={styles.description}>
                                {event.description || "No description provided."}
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer with Navigation Button */}
                    <SafeAreaView style={styles.footer}>
                        <TouchableOpacity style={styles.navigateButton} onPress={handleNavigate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Ionicons name="navigate-outline" size={20} color="#fff" />
                                    <Text style={styles.navigateText}>Navigate</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </SafeAreaView>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

// Complete styles for the new UI
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContainer: {
        height: "85%",
        backgroundColor: "#F4F1ED", // A soft, warm off-white
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
    },
    header: {
        alignItems: 'center',
    },
    handlebar: {
        width: 40,
        height: 5,
        backgroundColor: "#DCDCDC",
        borderRadius: 3,
        marginVertical: 10,
    },
    heroImage: {
        width: "100%",
        height: 200,
    },
    placeholderImage: {
        width: "100%",
        height: 200,
        backgroundColor: '#EAE5E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        position: 'absolute',
        top: 20,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 16,
    },
    statusChip: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
    },
    statusChipText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginLeft: 5,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#493628',
        marginBottom: 20,
    },
    detailSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
    },
    infoText: {
        fontSize: 15,
        color: '#6B5E5E',
        marginLeft: 15,
        flex: 1,
    },
    descriptionSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#493628',
        marginBottom: 8,
    },
    description: {
        fontSize: 15,
        color: '#6B5E5E',
        lineHeight: 22,
    },
    footer: {
        backgroundColor: '#FFFFFF',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#EAE5E0',
    },
    navigateButton: {
        flexDirection: 'row',
        backgroundColor: '#493628',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navigateText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default EventDetailModal;