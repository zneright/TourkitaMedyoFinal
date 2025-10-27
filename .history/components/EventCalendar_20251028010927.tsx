import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import EventDetailModal from "./EventDetailModal";
import SkeletonBox from "./Skeleton";
import { parseISO, format, isWithinInterval, startOfToday } from "date-fns";

type Event = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    locationId?: string;
    address: string;
    customAddress?: string;
    eventStartTime: string;
    eventEndTime: string;
    startDate: string;
    endDate: string;
    openToPublic?: boolean;
    recurrence?: {
        frequency?: string;
        daysOfWeek?: string[];
    };
    lat?: number | null;
    lng?: number | null;
};

const EventCalendar = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // --- MODIFICATION START ---
    // The .sort() method has been added to order events by their start time.
    const todaysEvents = events
        .filter((event) => {
            if (!event.startDate || !event.endDate) return false;

            const now = new Date();
            const todayDayName = format(now, "EEE").toLowerCase();
            const todayDate = startOfToday();

            const recurrence = event.recurrence || {};
            const startDate = parseISO(event.startDate);
            const endDate = parseISO(event.endDate);

            if (endDate < todayDate) {
                return false;
            }

            let occursToday = false;
            const isInDateRange = isWithinInterval(now, { start: startDate, end: endDate });

            if (recurrence.frequency === "weekly") {
                const daysOfWeek = (recurrence.daysOfWeek || []).map((d) =>
                    d.toLowerCase().slice(0, 3)
                );
                occursToday = daysOfWeek.includes(todayDayName) && isInDateRange;
            } else if (recurrence.frequency === "once") {
                occursToday = format(now, "yyyy-MM-dd") === format(startDate, "yyyy-MM-dd");
            } else {
                occursToday = isInDateRange;
            }

            return occursToday;
        })
        .sort((a, b) => (a.eventStartTime || "").localeCompare(b.eventStartTime || ""));
    // --- MODIFICATION END ---


    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const markerSnap = await getDocs(collection(db, "markers"));
                const markerMap: { [id: string]: string } = {};
                markerSnap.forEach((doc) => {
                    const data = doc.data();
                    markerMap[doc.id] = data.name || "Unknown Location";
                });

                const eventSnap = await getDocs(collection(db, "events"));
                const fetchedEvents: Event[] = [];

                eventSnap.forEach((doc) => {
                    const data = doc.data();
                    let address = "Address not available";
                    if (data.customAddress?.trim()) {
                        address = data.customAddress;
                    } else if (data.locationId && markerMap[data.locationId]) {
                        address = markerMap[data.locationId];
                    }
                    const startDate = data.startDate ?? data.date ?? format(new Date(), "yyyy-MM-dd");
                    const endDate = data.endDate ?? startDate;
                    fetchedEvents.push({
                        id: doc.id,
                        title: data.title ?? "Untitled Event",
                        description: data.description ?? "",
                        imageUrl: data.imageUrl ?? undefined,
                        locationId: data.locationId,
                        address,
                        customAddress: data.customAddress ?? "",
                        eventStartTime: data.eventStartTime ? String(data.eventStartTime) : "",
                        eventEndTime: data.eventEndTime ? String(data.eventEndTime) : "",
                        startDate,
                        endDate,
                        openToPublic: data.openToPublic ?? false,
                        recurrence: data.recurrence || {},
                        lat: data.lat ?? null,
                        lng: data.lng ?? null,
                    });
                });

                // The initial fetch sort is by date, which is fine. The time sort happens after filtering for today.
                fetchedEvents.sort(
                    (a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime()
                );

                setEvents(fetchedEvents);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    return (
        <View style={styles.wrapper}>
            <Text style={styles.header}>Events for Today</Text>

            {loading ? (
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {[1, 2, 3].map((i) => (
                        <View key={i} style={styles.eventCard}>
                            <SkeletonBox width="60%" height={18} style={{ marginBottom: 6 }} />
                            <SkeletonBox width="90%" height={14} />
                        </View>
                    ))}
                </ScrollView>
            ) : todaysEvents.length === 0 ? (
                <Text style={styles.noEvents}>No events for Today</Text>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {todaysEvents.map((event) => {
                        return (
                            <TouchableOpacity
                                key={event.id}
                                style={styles.eventCard}
                                onPress={() => {
                                    setSelectedEvent(event);
                                    setModalVisible(true);
                                }}
                            >
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventDetails}>
                                    {event.address}: {event.eventStartTime}
                                    {event.eventEndTime ? ` - ${event.eventEndTime}` : ""}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}

            <EventDetailModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                event={selectedEvent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: { paddingHorizontal: 22, marginTop: 20, marginBottom: 20 },
    header: { fontSize: 20, fontWeight: "bold", color: "#493628", marginBottom: 12 },
    scrollContainer: { paddingBottom: 20 },
    eventCard: { backgroundColor: "#F8F4F0", padding: 10, borderRadius: 8, marginBottom: 8 },
    eventTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
    eventDetails: { fontSize: 13, color: "#666", marginTop: 2 },
    noEvents: { textAlign: "center", fontSize: 16, color: "#999", marginTop: 20 },
});

export default EventCalendar;