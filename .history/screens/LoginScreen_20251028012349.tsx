import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import TopHeader from "../components/TopHeader";
import BottomFooter from "../components/BottomFooter";
import LandmarkDetailModal from "../components/LandmarkDetailModal";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../Navigation/types";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase";
import { useLandmark } from "../provider/LandmarkProvider";
import EventCalendar from "../components/EventCalendar";
import SkeletonBox from "../components/Skeleton";
import { useUser } from "../context/UserContext";
import GuestLockOverlay from "../components/guestLockOverlay";
import { Ionicons } from "@expo/vector-icons"; // Added for icons

// Marker and Event types remain the same
type Marker = {
    id: string;
    name: string;
    image: string;
    category: string;
    latitude: number;
    longitude: number;
    openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
    address?: string;
    description?: string;
};

type Event = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    address: string;
    customAddress?: string;
    eventStartTime?: string;
    eventEndTime?: string;
    startDate?: string;
    endDate?: string;
    openToPublic?: boolean;
    recurrence?: {
        frequency?: string;
        daysOfWeek?: string[];
    };
    locationId?: string;
    lat?: number | null;
    lng?: number | null;
};

const SearchScreen = () => {
    // --- All hooks and logic from your original file remain here ---
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [searchText, setSearchText] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const { setSelectedLandmark, loadDirection } = useLandmark();
    const { isGuest } = useUser();

    // --- All helper functions remain the same, with one modification ---
    const formatTime12Hour = (time?: string) => {
        if (!time) return "";
        const [hour, minute] = time.split(":").map(Number);
        const period = hour >= 12 ? "PM" : "AM";
        const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
    };

    const handleNavigate = (marker: Marker) => {
        setModalVisible(false);
        setSelectedLandmark(marker);
        loadDirection();
        navigation.navigate("Map", {
            latitude: marker.latitude,
            longitude: marker.longitude,
            name: marker.name,
        });
    };

    const handleImageTap = (marker: Marker) => {
        setSelectedMarker(marker);
        setModalVisible(true);
    };

    const isClosedDueToPrivateEvent = (markerId: string): boolean => {
        const now = new Date();
        const relevantEvents = events.filter((event) => {
            if (!event || event.locationId !== markerId || event.openToPublic) return false;
            const startDate = event.startDate ? new Date(event.startDate) : null;
            if (!startDate) return false;
            const endDate = event.endDate ? new Date(event.endDate) : startDate;
            if (now < startDate || now > endDate) return false;
            if (event.recurrence?.daysOfWeek?.length) {
                const todayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                if (!event.recurrence.daysOfWeek.map(d => d.toLowerCase()).includes(todayName)) return false;
            }
            const [startHour, startMinute] = event.eventStartTime?.split(":").map(Number) ?? [0, 0];
            const [endHour, endMinute] = event.eventEndTime?.split(":").map(Number) ?? [23, 59];
            const eventStart = new Date(now);
            eventStart.setHours(startHour, startMinute, 0, 0);
            const eventEnd = new Date(now);
            eventEnd.setHours(endHour, endMinute, 0, 0);
            return now >= eventStart && now <= eventEnd;
        });
        return relevantEvents.length > 0;
    };

    // MODIFIED: This function now returns color information for the UI
    const getOpenStatusInfo = (marker: Marker): { text: string; color: string } => {
        const openColor = "#28a745"; // green
        const closedColor = "#dc3545"; // red
        const unknownColor = "#6c757d"; // gray

        if (isClosedDueToPrivateEvent(marker.id)) {
            return { text: "Closed (Private Event)", color: closedColor };
        }
        if (!marker.openingHours) {
            return { text: "Hours unavailable", color: unknownColor };
        }
        const now = new Date();
        const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const today = marker.openingHours[dayName];

        if (!today || today.closed) return { text: "Closed today", color: closedColor };
        if (today.open === "00:00" && today.close === "23:59") return { text: "Open 24 hours", color: openColor };

        const [openHour, openMinute] = today.open.split(":").map(Number);
        const [closeHour, closeMinute] = today.close.split(":").map(Number);
        const openTime = new Date();
        openTime.setHours(openHour, openMinute, 0, 0);
        const closeTime = new Date();
        closeTime.setHours(closeHour, closeMinute, 0, 0);

        if (now >= openTime && now <= closeTime) {
            return { text: `Open until ${formatTime12Hour(today.close)}`, color: openColor };
        }
        return { text: "Closed now", color: closedColor };
    };

    useEffect(() => {
        // Fetching logic remains the same
        const fetchMarkersAndEvents = async () => {
            setLoading(true);
            try {
                const markersSnapshot = await getDocs(query(collection(db, "markers")));
                const markersData = markersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Marker));

                const eventsSnapshot = await getDocs(query(collection(db, "events")));
                const eventsData = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

                setAllMarkers(markersData);
                setEvents(eventsData);
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMarkersAndEvents();
    }, []);

    const filteredMarkers = allMarkers.filter(
        (marker) =>
            marker.name.toLowerCase().includes(searchText.toLowerCase()) ||
            marker.category.toLowerCase().includes(searchText.toLowerCase())
    );
    const groupedByCategory = (category: string) =>
        allMarkers.filter((m) => m.category.toLowerCase() === category.toLowerCase());

    // UPDATED: renderSection now uses the new card styles and status info
    const renderSection = (title: string, items: Marker[]) => {
        if (items.length === 0) return null;
        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalScroll}
                >
                    {items.map((item) => {
                        const statusInfo = getOpenStatusInfo(item);
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.card}
                                onPress={() => handleImageTap(item)}
                            >
                                <Image source={{ uri: item.image }} style={styles.cardImage} />
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardLabel} numberOfLines={1}>{item.name}</Text>
                                    <View style={styles.statusContainer}>
                                        <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                                        <Text style={styles.statusLabel}>{statusInfo.text}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Explore" onSupportPress={() => navigation.navigate("Support")} />

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 90 }}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Explore Intramuros</Text>
                    <Text style={styles.subtitle}>Discover historical sites, museums, and more.</Text>
                </View>

                <View style={styles.searchWrapper}>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#8A6F57" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholder="Search landmarks or categories..."
                            placeholderTextColor="#A99985"
                        />
                    </View>
                </View>

                {searchText.trim() === "" && (
                    <View style={styles.calendarSection}>
                        <EventCalendar events={events} />
                        <TouchableOpacity
                            style={styles.fullCalendarButton}
                            onPress={() => navigation.navigate("CalendarView")}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#493628" />
                            <Text style={styles.fullCalendarButtonText}>View Full Calendar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <View key={i} style={styles.sectionContainer}>
                            <SkeletonBox width={150} height={28} style={{ marginLeft: 20, marginBottom: 12 }} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <SkeletonBox key={j} width={220} height={220} style={styles.card} />
                                ))}
                            </ScrollView>
                        </View>
                    ))
                ) : searchText.trim() !== "" ? (
                    filteredMarkers.length > 0 ? (
                        renderSection("Search Results", filteredMarkers)
                    ) : (
                        <Text style={styles.noResult}>No results found for "{searchText}"</Text>
                    )
                ) : (
                    <>
                        {renderSection("Historical", groupedByCategory("Historical"))}
                        {renderSection("Museum", groupedByCategory("Museum"))}
                        {renderSection("Park", groupedByCategory("Park"))}
                        {renderSection("Restaurant", groupedByCategory("Restaurant"))}
                        {renderSection("School", groupedByCategory("School"))}
                        {renderSection("Others", groupedByCategory("Others"))}
                    </>
                )}
            </ScrollView>

            <LandmarkDetailModal
                visible={modalVisible}
                marker={selectedMarker}
                getOpenStatus={(marker) => getOpenStatusInfo(marker).text} // Pass the text part of the status
                onClose={() => setModalVisible(false)}
                onNavigate={handleNavigate}
            />

            {!isGuest ? <BottomFooter active="Search" /> : <GuestLockOverlay />}
        </SafeAreaView>
    );
};

// --- NEW STYLESHEET ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8F5F2" }, // Soft background
    scrollContainer: { flex: 1 },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#493628',
    },
    subtitle: {
        fontSize: 16,
        color: '#8A6F57',
        marginTop: 4,
    },
    searchWrapper: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#EAE5E0',
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#493628',
        marginLeft: 8,
    },
    searchIcon: {
        position: 'absolute',
        left: 15,
        zIndex: 1,
    },
    calendarSection: {
        marginHorizontal: 20,
        marginVertical: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EAE5E0',
    },
    fullCalendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        paddingVertical: 12,
        backgroundColor: '#F8F5F2',
        borderRadius: 8,
    },
    fullCalendarButtonText: {
        color: "#493628",
        fontSize: 15,
        fontWeight: "600",
        marginLeft: 8,
    },
    sectionContainer: {
        marginTop: 10,
        marginBottom: 10,
    },
    sectionTitle: {
        color: "#493628",
        fontSize: 22,
        fontWeight: "bold",
        marginLeft: 20,
        marginBottom: 12,
    },
    horizontalScroll: {
        paddingHorizontal: 20,
        paddingBottom: 10, // For shadow visibility
    },
    card: {
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginRight: 16,
        shadowColor: "#A99985",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    cardImage: {
        width: "100%",
        height: 140,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    cardContent: {
        padding: 12,
    },
    cardLabel: {
        fontSize: 16,
        color: "#493628",
        fontWeight: "600",
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusLabel: {
        fontSize: 13,
        color: "#8A6F57",
    },
    noResult: {
        textAlign: "center",
        fontSize: 16,
        color: "#8A6F57",
        marginTop: 40,
    },
});

export default SearchScreen;