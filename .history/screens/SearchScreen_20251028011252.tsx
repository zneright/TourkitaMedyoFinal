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
    Modal,
    ActivityIndicator,
} from "react-native";
import TopHeader from "../components/TopHeader";
import BottomFooter from "../components/BottomFooter";
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
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [searchText, setSearchText] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [modalImage, setModalImage] = useState("");
    const [allMarkers, setAllMarkers] = useState<Marker[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
    const [events, setEvents] = useState<Event[]>([]);

    const { setSelectedLandmark, loadDirection } = useLandmark();
    const { isGuest } = useUser();
    const formatTime12Hour = (time?: string) => {
        if (!time) return "";
        const [hour, minute] = time.split(":").map(Number);
        const period = hour >= 12 ? "PM" : "AM";
        const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${adjustedHour}:${minute.toString().padStart(2, "0")} ${period}`;
    };

    const handleImageTap = (marker: Marker) => {
        setSelectedMarker(marker);
        setModalImage(marker.image);
        setModalVisible(true);
    };

    // close ba?!
    const isClosedDueToPrivateEvent = (markerId: string): boolean => {
        const now = new Date();

        const relevantEvents = events.filter((event) => {
            if (!event) return false;
            if (event.locationId !== markerId) return false;
            if (event.openToPublic) return false;

            const startDate = event.startDate ? new Date(event.startDate) : null;
            const endDate = event.endDate ? new Date(event.endDate) : startDate;
            if (!startDate) return false;

            if (now < startDate || now > (endDate || startDate)) return false;

            if (event.recurrence?.daysOfWeek && event.recurrence.daysOfWeek.length > 0) {
                const todayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
                if (!event.recurrence.daysOfWeek.map(d => d.toLowerCase()).includes(todayName)) {
                    return false;
                }
            }

            // Check time
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



    // open ba?!
    const getOpenStatus = (marker: Marker): string => {
        if (isClosedDueToPrivateEvent(marker.id)) return "Closed due to private event";
        if (!marker.openingHours) return "Opening hours unavailable";

        const now = new Date();
        const dayName = now.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const today = marker.openingHours[dayName];

        if (!today || today.closed) return "Closed today";


        if (today.open === "00:00" && today.close === "23:59") return "Open 24 hours";

        const [openHour, openMinute] = today.open.split(":").map(Number);
        const [closeHour, closeMinute] = today.close.split(":").map(Number);

        const openTime = new Date();
        openTime.setHours(openHour, openMinute, 0, 0);

        const closeTime = new Date();
        closeTime.setHours(closeHour, closeMinute, 0, 0);

        if (now >= openTime && now <= closeTime)
            return `Open now until ${formatTime12Hour(today.close)}`;

        return "Closed now";
    };




    useEffect(() => {
        const fetchMarkersAndEvents = async () => {
            setLoading(true);
            try {
                const qMarkers = query(collection(db, "markers"));
                const snapshotMarkers = await getDocs(qMarkers);
                const markersData = snapshotMarkers.docs.map((doc) => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        name: d.name,
                        image: d.image?.trim() || "https://via.placeholder.com/150",
                        category: d.categoryOption || d.category || "Others",
                        latitude: d.latitude,
                        longitude: d.longitude,
                        openingHours: d.openingHours || {},
                        address: d.address || "Address not available",
                        description: d.description || "",
                    };
                });

                const qEvents = query(collection(db, "events"));
                const snapshotEvents = await getDocs(qEvents);

                const eventsData = snapshotEvents.docs.map((doc) => {
                    const d = doc.data();

                    let address = "Address not available";
                    if (d.customAddress && d.customAddress.trim() !== "") {
                        address = d.customAddress;
                    } else if (d.locationId) {
                        const marker = markersData.find((m) => m.id === d.locationId);
                        if (marker) address = marker.name;
                    }

                    return {
                        id: doc.id,
                        title: d.title ?? "Untitled Event",
                        description: d.description ?? "",
                        imageUrl: d.imageUrl ?? undefined,
                        address,
                        customAddress: d.customAddress ?? "",
                        eventStartTime: d.eventStartTime ?? "",
                        eventEndTime: d.eventEndTime ?? "",
                        startDate: d.startDate,
                        endDate: d.endDate,
                        openToPublic: d.openToPublic ?? false,
                        recurrence: d.recurrence || {},
                        locationId: d.locationId ?? undefined,
                        lat: d.lat ?? null,
                        lng: d.lng ?? null,
                    };
                });


                setEvents(eventsData);


                setAllMarkers(markersData);
                setEvents(eventsData);
            } catch (err) {
                console.error("Error fetching markers/events:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMarkersAndEvents();
    }, []);

    // searcg filter markers
    const filteredMarkers = allMarkers.filter(
        (marker) =>
            marker.name.toLowerCase().includes(searchText.toLowerCase()) ||
            marker.category.toLowerCase().includes(searchText.toLowerCase())
    );

    // Get marers by category
    const groupedByCategory = (category: string) =>
        allMarkers.filter((m) => m.category.toLowerCase() === category.toLowerCase());

    const renderSection = (title: string, items: Marker[]) => {
        if (items.length === 0) return null;
        return (
            <>
                <Text style={styles.sectionTitle}>{title}</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.horizontalScroll}
                >
                    {items.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.cardLarge,
                                { marginLeft: index === 0 ? 22 : 0 },
                            ]}
                            onPress={() => handleImageTap(item)}
                        >
                            <Image source={{ uri: item.image }} style={styles.cardImageLarge} />
                            <Text style={styles.cardLabel}>{item.name}</Text>
                            <Text style={styles.statusLabel}>{getOpenStatus(item)}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Search" onSupportPress={() => navigation.navigate("Support")} />
            {!isGuest ? (
                <BottomFooter active="Search" />
            ) : (
                <GuestLockOverlay />
            )}
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 90 }}
            >
                <View style={styles.searchWrapper}>
                    <Text style={styles.searchLabel}>Search any keyword...</Text>
                    <View style={styles.searchInputContainer}>
                        <TextInput
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholder="Type here..."
                            placeholderTextColor="#999"
                        />
                        <Image
                            source={{ uri: "https://cdn-icons-png.flaticon.com/512/622/622669.png" }}
                            style={styles.searchIcon}
                        />
                    </View>
                </View>

                {/* Calendar + View Full Calendar button */}
                {searchText.trim() === "" && (
                    <View style={{ marginBottom: 20 }}>
                        <EventCalendar events={events} />
                        <TouchableOpacity
                            style={styles.fullCalendarButton}
                            onPress={() => navigation.navigate("CalendarView")}
                        >
                            <Text style={styles.fullCalendarButtonText}>View Full Calendar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Marker sections */}
                {loading ? (
                    <>
                        {/* Skeleton for Historical */}
                        <Text style={styles.sectionTitle}>Historical</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>

                        {/* Skeleton for Museum */}
                        <Text style={styles.sectionTitle}>Museum</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>

                        {/* Skeleton for Park */}
                        <Text style={styles.sectionTitle}>Park</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>

                        {/* Skeleton for Restaurant */}
                        <Text style={styles.sectionTitle}>Restaurant</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>

                        {/* Skeleton for School */}
                        <Text style={styles.sectionTitle}>School</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>

                        {/* Skeleton for Others */}
                        <Text style={styles.sectionTitle}>Others</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <SkeletonBox key={i} width={209} height={200} style={{ marginLeft: i === 0 ? 22 : 16 }} />
                            ))}
                        </ScrollView>
                    </>
                ) : searchText.trim() !== "" ? (
                    filteredMarkers.length > 0 ? (
                        renderSection("Search Results", filteredMarkers)
                    ) : (
                        <Text style={styles.noResult}>No results found.</Text>
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



            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Image
                            source={{ uri: modalImage }}
                            style={styles.modalImage}
                            resizeMode="contain"
                        />
                        {selectedMarker && (
                            <>
                                <Text
                                    style={{
                                        color: "#fff",
                                        fontSize: 18,
                                        marginVertical: 10,
                                        textAlign: "center",
                                    }}
                                >
                                    {selectedMarker.name}
                                    ()
                                </Text>
                                <Text style={{ color: "#ccc", fontSize: 14, textAlign: "center" }}>
                                    {getOpenStatus(selectedMarker)}
                                </Text>
                                <TouchableOpacity
                                    style={styles.navigateButton}
                                    onPress={() => {
                                        setModalVisible(false);
                                        setSelectedLandmark(selectedMarker);
                                        loadDirection();
                                        navigation.navigate("Map", {
                                            latitude: selectedMarker.latitude,
                                            longitude: selectedMarker.longitude,
                                            name: selectedMarker.name,
                                        });
                                    }}
                                >
                                    <Text style={styles.navigateButtonText}>Navigate</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

            </Modal>

            <BottomFooter active="Search" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    scrollContainer: { flex: 1 },
    searchWrapper: { paddingHorizontal: 22, paddingTop: 20 },
    searchLabel: { color: "#6B5E5E", fontSize: 13, marginBottom: 8 },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        position: "relative",
    },
    searchInput: {
        flex: 1,
        height: 47,
        borderRadius: 15,
        borderColor: "#493628",
        borderWidth: 1,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 16,
        paddingRight: 50,
        fontSize: 16,
    },
    searchIcon: {
        position: "absolute",
        right: 12,
        width: 24,
        height: 24,
        tintColor: "#493628",
    },
    sectionTitle: {
        color: "#493628",
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 24,
        marginLeft: 22,
        marginBottom: 12,
    },
    horizontalScroll: {
        marginBottom: 24,
    },
    cardLarge: {
        width: 209,
        marginRight: 16,
    },
    cardImageLarge: {
        width: "100%",
        height: 160,
        borderRadius: 12,
        backgroundColor: "#D9D9D9",
    },
    cardLabel: {
        marginTop: 6,
        fontSize: 14,
        color: "#493628",
        fontWeight: "500",
        textAlign: "center",
    },
    statusLabel: {
        fontSize: 12,
        textAlign: "center",
        color: "#888",
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        height: "70%",
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#222",
        padding: 12,
    },
    modalImage: {
        width: "100%",
        height: "70%",
        borderRadius: 8,
        marginBottom: 8,
    },
    noResult: {
        textAlign: "center",
        fontSize: 16,
        color: "#999",
        marginTop: 20,
    },
    navigateButton: {
        marginTop: 12,
        paddingVertical: 10,
        backgroundColor: "#493628",
        borderRadius: 8,
        alignItems: "center",
    },
    navigateButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
    fullCalendarButton: {
        marginHorizontal: 22,
        paddingVertical: 12,
        backgroundColor: "#493628",
        borderRadius: 8,
        alignItems: "center",
    },
    fullCalendarButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },

});

export default SearchScreen;    