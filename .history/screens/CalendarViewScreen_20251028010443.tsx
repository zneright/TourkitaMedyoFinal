import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";
import { format, parseISO, isWithinInterval, getDay, addDays } from "date-fns"; // Added addDays
import TopHeader from "../components/TopHeader";
import EventDetailModal from "../components/EventDetailModal";
import SkeletonBox from "../components/Skeleton";

// --- MODIFICATION START ---
// This section is updated to be robust and consistent.

const weekdayMap: { [key: string]: number } = {
    sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * The definitive function to check if an event occurs on a specific target date.
 * This handles single-day, multi-day, and weekly recurring events correctly.
 */
function isEventOnDate(event: Event, targetDate: Date): boolean {
    if (!event.startDate || !event.endDate) return false;

    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);

    // 1. Primary check: Is the target date within the event's overall date range?
    const isInDateRange = isWithinInterval(targetDate, { start, end });

    // If it's not in the date range, we can immediately exclude it.
    if (!isInDateRange) {
        return false;
    }

    // 2. Secondary check (for weekly events): If it's in range, does it also fall on the correct day of the week?
    if (event.recurrence?.frequency === "weekly") {
        const targetDay = getDay(targetDate); // 0 for Sunday, 1 for Monday...
        const recurrenceDays = (event.recurrence.daysOfWeek || [])
            .map((d) => weekdayMap[d.toLowerCase().slice(0, 3)])
            .filter((v) => v !== undefined);

        return recurrenceDays.includes(targetDay);
    }

    // 3. Fallback: If it's not weekly but passed the date range check, it's valid.
    return true;
}

// --- MODIFICATION END ---

type Event = {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    locationId?: string;
    address: string;
    eventStartTime?: string;
    eventEndTime?: string;
    startDate?: string;
    endDate?: string;
    openToPublic?: boolean;
    recurrence?: {
        frequency?: string;
        daysOfWeek?: string[];
    };
    lat?: number | null;
    lng?: number | null;
    customAddress?: string;
};


const CalendarViewScreen = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [markedDates, setMarkedDates] = useState<any>({});
    const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [clickedDate, setClickedDate] = useState<string | null>(null);

    // The logic to find today's events now uses the corrected isEventOnDate function
    const todaysEvents = events
        .filter((e) => isEventOnDate(e, new Date()))
        .sort((a, b) => (a.eventStartTime || "").localeCompare(b.eventStartTime || ""));


    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const eventSnap = await getDocs(collection(db, "events"));
                const markerSnap = await getDocs(collection(db, "markers"));

                const markerMap: { [id: string]: string } = {};
                markerSnap.forEach((doc) => {
                    const data = doc.data();
                    markerMap[doc.id] = data.name || "Unknown Location";
                });

                const fetchedEvents: Event[] = [];
                const dateMap: any = {};

                eventSnap.forEach((doc) => {
                    const data = doc.data();
                    const event: Event = {
                        id: doc.id,
                        title: data.title ?? "Untitled Event",
                        description: data.description ?? "",
                        imageUrl: data.imageUrl ?? undefined,
                        locationId: data.locationId,
                        address: data.customAddress?.trim() || markerMap[data.locationId] || "Address not available",
                        customAddress: data.customAddress ?? "",
                        eventStartTime: data.eventStartTime ?? "",
                        eventEndTime: data.eventEndTime ?? "",
                        startDate: data.startDate ?? data.date ?? "",
                        endDate: data.endDate ?? data.startDate ?? data.date ?? "",
                        openToPublic: data.openToPublic ?? false,
                        recurrence: data.recurrence || {},
                        lat: data.lat ?? null,
                        lng: data.lng ?? null,
                    };
                    fetchedEvents.push(event);

                    // --- MODIFICATION START ---
                    // This loop now correctly marks dates for ALL event types, including weekly.
                    if (event.startDate && event.endDate) {
                        let current = parseISO(event.startDate);
                        const finalDate = parseISO(event.endDate);

                        while (current <= finalDate) {
                            // Only mark the date if the new logic confirms the event is on that specific day
                            if (isEventOnDate(event, current)) {
                                const dayStr = format(current, "yyyy-MM-dd");
                                dateMap[dayStr] = { marked: true, dotColor: "#493628" };
                            }
                            current = addDays(current, 1); // Safely increment the day
                        }
                    }
                    // --- MODIFICATION END ---
                });

                setEvents(fetchedEvents);
                setMarkedDates(dateMap);
            } catch (error) {
                console.error("Error fetching events:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const onDayPress = (day: any) => {
        const selectedDate = parseISO(day.dateString);
        setClickedDate(day.dateString);

        // This filter also uses the corrected logic now
        const filtered = events.filter((e) => isEventOnDate(e, selectedDate));

        setSelectedEvents(filtered);
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <TopHeader title="Calendar" showBackButton />

            <ScrollView>
                <Calendar
                    markedDates={markedDates}
                    onDayPress={onDayPress}
                    theme={{
                        selectedDayBackgroundColor: "#493628",
                        todayTextColor: "#493628",
                        dotColor: "#493628",
                        arrowColor: "#493628",
                    }}
                />

                <View style={styles.todaysContainer}>
                    <Text style={styles.todaysTitle}>Today's Events</Text>
                    {loading ? (
                        <>
                            {[1, 2, 3].map((i) => (
                                <View key={i} style={styles.eventCard}>
                                    <SkeletonBox width="70%" height={18} style={{ marginBottom: 6 }} />
                                    <SkeletonBox width="40%" height={14} />
                                </View>
                            ))}
                        </>
                    ) : todaysEvents.length === 0 ? (
                        <Text style={styles.noEventsText}>No events today</Text>
                    ) : (
                        todaysEvents.map((event, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.eventCard}
                                onPress={() => {
                                    setSelectedEvent(event);
                                    setDetailModalVisible(true);
                                }}
                            >
                                <Text style={styles.eventTitle}>{event.title}</Text>
                                <Text style={styles.eventTime}>
                                    {event.address} — {event.eventStartTime}{event.eventEndTime ? ` - ${event.eventEndTime}` : ""}
                                </Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Day Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Events on {clickedDate ? format(parseISO(clickedDate), "MMMM dd, yyyy") : ""}
                        </Text>

                        <ScrollView style={{ marginTop: 10, maxHeight: 300 }}>
                            {selectedEvents.length > 0 ? (
                                selectedEvents.map((event, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.eventCard}
                                        onPress={() => {
                                            setSelectedEvent(event);
                                            setModalVisible(false); // Close this modal first
                                            setDetailModalVisible(true);
                                        }}
                                    >
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <Text style={styles.eventTime}>
                                            {event.eventStartTime}{event.eventEndTime ? ` - ${event.eventEndTime}` : ""}
                                        </Text>
                                        <Text style={styles.eventTime}>{event.address}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.noEventsText}>No events scheduled</Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <EventDetailModal
                visible={detailModalVisible}
                onClose={() => setDetailModalVisible(false)}
                event={selectedEvent}
            />
        </View>
    );
};


const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#fff" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 20,
        width: "100%",
        maxHeight: "80%",
    },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "#493628", marginBottom: 10 },
    eventCard: { backgroundColor: "#F8F4F0", padding: 10, marginBottom: 10, borderRadius: 8 },
    eventTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
    eventTime: { fontSize: 14, color: "#666", marginTop: 4 },
    closeButton: {
        marginTop: 10,
        paddingVertical: 10,
        backgroundColor: "#493628",
        borderRadius: 8,
        alignItems: "center",
    },
    closeButtonText: { color: "#fff", fontWeight: "bold" },
    todaysContainer: { padding: 16 },
    todaysTitle: { fontSize: 18, fontWeight: "bold", color: "#493628", marginBottom: 10 },
    noEventsText: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 10 },
});

export default CalendarViewScreen;