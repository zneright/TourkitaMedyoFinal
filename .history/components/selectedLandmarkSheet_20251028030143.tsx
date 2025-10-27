import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    Text,
    Image,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    StyleSheet,
    Alert,
} from "react-native";
import Video from 'react-native-video';
import * as Speech from 'expo-speech';
import { useLandmark } from "../provider/LandmarkProvider";
import Entypo from "@expo/vector-icons/Entypo";
import Fontisto from "@expo/vector-icons/Fontisto";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { startOfWeek, endOfWeek, isWithinInterval, addWeeks } from "date-fns";
import { Linking } from "react-native";

import SkeletonBox from "../components/Skeleton";
import ModeSelector from "./ModeSelector";
import LottieView from "lottie-react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../Navigation/types";
import { doc, getDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystem';
export default function SelectedLandmarkSheet() {
    const [isImageModalVisible, setImageModalVisible] = useState(false);
    const [averageRating, setAverageRating] = useState<number | null>(null);
    const [reviewCount, setReviewCount] = useState<number>(0);
    const [eventInProgress, setEventInProgress] = useState(false);
    const { selectedLandmark, duration, distance, loadingDirection, loadDirection, mode, setMode } = useLandmark() as any;

    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ["50%", "90%"], []);
    const [weeklyEvents, setWeeklyEvents] = useState<{ day: string; title: string; start: string; end: string; openToPublic: boolean }[]>([]);

    const [loadingSheet, setLoadingSheet] = useState(true);
    const navigation = useNavigation<NavigationProp>();

    const [isSpeaking, setIsSpeaking] = useState(false);
    const handleNavigateToAssetList = async (mode) => {
        if (!selectedLandmark) return;
        bottomSheetRef.current?.close();
        useEffect(() => {
            return () => {
                Speech.stop();
                setIsSpeaking(false);
            };
        }, [selectedLandmark]);
        try {

            const q = query(
                collection(db, "arTargets"),
                where("locationName", "==", selectedLandmark.name)
            );
            const querySnapshot = await getDocs(q);
            const assets = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            if (assets.length === 0) {
                Alert.alert("No Assets Found", `There are no viewable 3D or AR models for ${selectedLandmark.name}.`);
                return;
            }

            navigation.navigate("AssetList", {
                assets,
                title: selectedLandmark.name,
                mode: mode,
            });

        } catch (e) {
            console.error("Error fetching assets:", e);
            Alert.alert("Error", "Could not load assets for this landmark.");
        }
    };
    const handleModeChange = (newMode: string) => {
        setMode(newMode);
        loadDirection(undefined, newMode);
    };
    type NavigationProp = NativeStackNavigationProp<RootStackParamList, "View3D">;
    //  Pag pinindot ang markers
    useEffect(() => {
        if (selectedLandmark) {
            bottomSheetRef.current?.expand();
            setLoadingSheet(true);
            Promise.all([fetchAverageRating(), checkEvents()])
                .finally(() => setLoadingSheet(false));
            loadDirection();
        }
    }, [selectedLandmark]);
    const parseTimeToMinutes = (t?: string | null) => {
        if (!t) return null;
        const match = t.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
        if (!match) return null;

        let hour = parseInt(match[1], 10);
        const minute = match[2] ? parseInt(match[2], 10) : 0;
        const ampm = match[3].toUpperCase();

        if (ampm === "PM" && hour !== 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        return hour * 60 + minute;
    };

    //  May event ba?
    const checkEvents = async () => {
        if (!selectedLandmark) return;

        try {
            const q = query(
                collection(db, "events"),
                where("locationId", "==", String(selectedLandmark.id))
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                setWeeklyEvents([]);
                setEventInProgress(false);
                return;
            }

            const now = new Date();
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

            let inProgress = false;
            const eventsForWeek: {
                day: string;
                title: string;
                start: string;
                end: string;
                openToPublic: boolean;
            }[] = [];

            snapshot.forEach((docSnap) => {
                const ev: any = docSnap.data();

                const startDate = ev.startDate ? new Date(ev.startDate) : null;
                const endDate = ev.endDate ? new Date(ev.endDate) : startDate;

                if (!startDate || !endDate) return;

                const recurrenceDays: string[] = ev.recurrence?.daysOfWeek || [];

                let current = new Date(startDate);
                while (current <= endDate) {
                    const dayName = current.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

                    if (ev.recurrence?.frequency === "weekly" ? recurrenceDays.includes(dayName.slice(0, 3)) : true) {
                        if (isWithinInterval(current, { start: weekStart, end: weekEnd })) {
                            eventsForWeek.push({
                                day: dayName,
                                title: ev.title || "Untitled Event",
                                start: ev.eventStartTime || "12:00 AM",
                                end: ev.eventEndTime || "11:59 PM",
                                openToPublic: ev.openToPublic !== false,
                            });

                            const today = new Date();
                            const sameDay =
                                current.getFullYear() === today.getFullYear() &&
                                current.getMonth() === today.getMonth() &&
                                current.getDate() === today.getDate();

                            if (sameDay) {
                                const nowMinutes = today.getHours() * 60 + today.getMinutes();
                                const start = parseTimeToMinutes(ev.eventStartTime) ?? 0;
                                const end = parseTimeToMinutes(ev.eventEndTime) ?? 24 * 60;
                                const within = end > start
                                    ? nowMinutes >= start && nowMinutes < end
                                    : nowMinutes >= start || nowMinutes < end;

                                if (within && ev.openToPublic === false) inProgress = true;
                            }
                        }
                    }

                    if (ev.recurrence?.frequency === "weekly") {
                        current = addWeeks(current, 1);
                    } else {
                        break;
                    }
                }
            });

            setWeeklyEvents(eventsForWeek);
            setEventInProgress(inProgress);
        } catch (err) {
            console.error("checkEvents error:", err);
            setWeeklyEvents([]);
            setEventInProgress(false);
        }
    };


    const fetchAverageRating = async () => {
        if (!selectedLandmark) return;
        try {
            const q = query(collection(db, "feedbacks"), where("location", "==", selectedLandmark.name));
            const querySnapshot = await getDocs(q);
            const ratings: number[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (typeof data.rating === "number") ratings.push(data.rating);
            });
            if (ratings.length > 0) {
                const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
                setAverageRating(Number(avg.toFixed(1)));
                setReviewCount(ratings.length);
            } else {
                setAverageRating(null);
                setReviewCount(0);
            }
        } catch {
            setAverageRating(null);
            setReviewCount(0);
        }
    };
    const handleView3D = async () => {
        if (!selectedLandmark) return;

        try {
            // 1. Finds the right document in Firestore
            const ref = doc(db, "arTargets", selectedLandmark.name);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                Alert.alert("Not Found", `No 3D model found for: ${selectedLandmark.name}`);
                return;
            }

            // 2. Navigates to the View3D screen, passing the necessary info.
            //    The View3D screen will then handle the download if needed.
            navigation.navigate("View3D", {
                modelUrl: snap.data().modelUrl,
                title: selectedLandmark.name, // The title is crucial for finding the shared file
            });
        } catch (e) {
            console.error("Error preparing 3D view:", e);
        }
    };

    const handleViewRelics = async () => {
        // Fetches the list of relics and navigates to the RelicList screen
        try {
            const q = query(
                collection(db, "arTargets"),
                where("category", "==", "Relics/Artifacts"),
                where("locationName", "==", selectedLandmark.name)
            );
            const querySnapshot = await getDocs(q);
            const relics = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            if (relics.length === 0) {
                Alert.alert("No Relics Found", `No relics or artifacts are listed for ${selectedLandmark.name}.`);
                return;
            }

            navigation.navigate("RelicList", {
                relics,
                title: selectedLandmark.name,
            });
        } catch (e) { console.error("Error fetching relics:", e); }
    };

    const handleViewAR = async () => {
        // Navigates to the AR screen, which will handle its own downloads
        try {
            const targetId = selectedLandmark.name;
            const ref = doc(db, "arTargets", targetId);
            const snap = await getDoc(ref);

            if (!snap.exists()) {
                Alert.alert("Not Found", `No AR target found for: ${targetId}`);
                return;
            }

            navigation.navigate("ArCam", {
                arTargetId: targetId,
            });
        } catch (e) { console.error("Error loading AR target:", e); }
    };

    const handleGetDirection = () => loadDirection();

    if (!selectedLandmark) return null;

    // Checking of time and date now na!
    const today = new Date();
    const dayOfWeek = today.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
    const currentTime = today.getHours() * 60 + today.getMinutes();

    //  bukas ba?
    const isOpenToday = () => {
        const hoursToday = selectedLandmark?.openingHours?.[dayOfWeek];
        const eventsToday = weeklyEvents.filter(ev => ev.day === dayOfWeek);

        if (eventsToday.some(ev => !ev.openToPublic)) return false;
        if (!hoursToday || hoursToday.closed) return false;

        const parseTime = (t?: string) => {
            if (!t) return null;
            const [h, m] = t.split(":").map(Number);
            return isNaN(h) || isNaN(m) ? null : h * 60 + m;
        };

        const openMinutes = parseTime(hoursToday.open);
        const closeMinutes = parseTime(hoursToday.close);

        if (openMinutes == null || closeMinutes == null) return false;

        if (openMinutes === 0 && closeMinutes === 23 * 60 + 59) return true;

        const withinHours =
            closeMinutes > openMinutes
                ? currentTime >= openMinutes && currentTime < closeMinutes
                : currentTime >= openMinutes || currentTime < closeMinutes;

        return withinHours;
    };


    const convertTo12HourFormat = (time24: string | undefined) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m < 10 ? "0" : ""}${m} ${period}`;
    };
    const openStatus = isOpenToday();

    const statusIcon = openStatus
        ? <Ionicons name="checkmark-circle" size={18} color="green" />
        : <Ionicons name="close-circle" size={18} color="red" />;

    const statusText = openStatus
        ? "Open"
        : eventInProgress
            ? "Closed for Private Event"
            : "Closed";


    return (
        <BottomSheet
            ref={bottomSheetRef}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backgroundStyle={styles.sheetBackground}
        >
            <BottomSheetScrollView contentContainerStyle={styles.scrollContainer}>
                {loadingSheet ? (
                    <View>
                        <SkeletonBox width={200} height={20} />
                        <SkeletonBox width="100%" height={200} style={{ marginTop: 10, borderRadius: 12 }} />
                        <SkeletonBox width="90%" height={15} style={{ marginTop: 10 }} />
                        <SkeletonBox width="80%" height={15} style={{ marginTop: 6 }} />
                        <SkeletonBox width="60%" height={15} style={{ marginTop: 6 }} />
                    </View>
                ) : (
                    <>
                        {/*  Header*/}
                        <View style={styles.topRow}>
                            <Text style={styles.arSupportText}>
                                {selectedLandmark.arCameraSupported ? "AR Camera Supported" : "No AR Support"}
                            </Text>
                            <View style={styles.topRowInfo}>
                                <View style={styles.iconTextRow}>
                                    <FontAwesome5 name="route" size={14} color="black" />
                                    {loadingDirection ? (
                                        <ActivityIndicator size="small" />
                                    ) : (
                                        <Text>{(distance / 1000).toFixed(2)} km</Text>
                                    )}
                                </View>
                                <View style={styles.iconTextRow}>
                                    <Entypo name="back-in-time" size={16} color="black" />
                                    {loadingDirection ? (
                                        <ActivityIndicator size="small" />
                                    ) : (
                                        <Text>{(duration / 60).toFixed(0)} min</Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/*  Image */}
                        <View style={styles.infoRow}>
                            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                                <Image
                                    source={{
                                        uri:
                                            selectedLandmark.category === "Event" && selectedLandmark.image
                                                ? selectedLandmark.image
                                                : selectedLandmark.image || null,
                                    }}
                                    style={styles.image}
                                />

                            </TouchableOpacity>
                            <View style={styles.detailsContainer}>
                                <Text style={styles.name}>{selectedLandmark.name}</Text>
                                <View style={styles.locationRow}>
                                    <Entypo name="location-pin" size={18} />
                                    <Text>
                                        {selectedLandmark.customAddress?.trim()
                                            ? selectedLandmark.customAddress
                                            : selectedLandmark.address || "No address available"}
                                    </Text>
                                </View>

                                <View style={styles.statusRow}>{statusIcon}<Text>{statusText}</Text></View>
                                <View style={styles.statusRow}>
                                    <Fontisto name="ticket" size={16} />
                                    <Text>
                                        Entrance:{" "}
                                        {selectedLandmark.entranceFee && Number(selectedLandmark.entranceFee) > 0
                                            ? `₱${selectedLandmark.entranceFee}`
                                            : "Free"}
                                    </Text>
                                </View>

                                <ModeSelector />
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Opening Hours & Events</Text>
                            {(() => {
                                const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                                const formatDay = (d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3); // Mon, Tue...

                                const formatHours = (data?: { open?: string; close?: string; closed?: boolean }) => {
                                    if (!data) return "Not available";
                                    if (data.closed) return "Closed";
                                    if (!data.open || !data.close) return "No available hours";

                                    if (data.open === "00:00" && data.close === "23:59") return "Open 24 hours";

                                    return `${convertTo12HourFormat(data.open)} - ${convertTo12HourFormat(data.close)}`;
                                };



                                if (weeklyEvents.length > 0) {
                                    return days.map((day, i) => {
                                        const label = formatDay(day);
                                        const hours = formatHours(selectedLandmark.openingHours?.[day]);
                                        const eventsForDay = weeklyEvents.filter(ev => ev.day === day);

                                        return (
                                            <View key={i} style={{ marginBottom: 6 }}>
                                                <Text style={[styles.hoursText, hours === "Closed" && styles.closedText]}>
                                                    {label}: {hours}
                                                </Text>

                                                {eventsForDay.length > 0 ? (
                                                    eventsForDay.map((ev, idx) => (
                                                        <Text
                                                            key={idx}
                                                            style={{ fontSize: 13, color: ev.openToPublic ? "#4CAF50" : "#B71C1C" }}
                                                        >
                                                            🎟 {ev.title} ({ev.start} - {ev.end}) {ev.openToPublic ? "" : "(Private)"}
                                                        </Text>
                                                    ))
                                                ) : (
                                                    <Text style={{ fontSize: 12, color: "#8D6E63", marginLeft: 10 }}>
                                                        No events
                                                    </Text>
                                                )}
                                            </View>
                                        );
                                    });
                                } else {
                                    let grouped: { label: string; hours: string }[] = [];
                                    let currentGroup: { start: string; end: string; hours: string } | null = null;

                                    days.forEach((day, i) => {
                                        const label = formatDay(day);
                                        const hours = formatHours(selectedLandmark.openingHours?.[day]);

                                        if (currentGroup && currentGroup.hours === hours) {
                                            currentGroup.end = label;
                                        } else {
                                            if (currentGroup) {
                                                grouped.push({
                                                    label:
                                                        currentGroup.start === currentGroup.end
                                                            ? currentGroup.start
                                                            : `${currentGroup.start} - ${currentGroup.end}`,
                                                    hours: currentGroup.hours,
                                                });
                                            }
                                            currentGroup = { start: label, end: label, hours };
                                        }

                                        if (i === days.length - 1 && currentGroup) {
                                            grouped.push({
                                                label:
                                                    currentGroup.start === currentGroup.end
                                                        ? currentGroup.start
                                                        : `${currentGroup.start} - ${currentGroup.end}`,
                                                hours: currentGroup.hours,
                                            });
                                        }
                                    });

                                    return grouped.map((g, idx) => (
                                        <Text
                                            key={idx}
                                            style={[styles.hoursText, g.hours === "Closed" && styles.closedText]}
                                        >
                                            {g.label}: {g.hours}
                                        </Text>
                                    ));
                                }
                            })()}
                        </View>


                        {/* Description */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Historical Background</Text>
                            <Text style={styles.description}>
                                {selectedLandmark.description
                                    ? selectedLandmark.description.split("\n").map((paragraph: string, pIndex: number) => (
                                        <Text key={pIndex}>
                                            {paragraph.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) =>
                                                part.match(/^https?:\/\//) ? (
                                                    <Text
                                                        key={i}
                                                        style={styles.descriptionLink}
                                                        onPress={() => Linking.openURL(part)}
                                                    >
                                                        {part}
                                                    </Text>
                                                ) : (
                                                    <Text key={i}>{part}</Text>
                                                )
                                            )}
                                            {"\n"}
                                        </Text>
                                    ))
                                    : "No description provided."}
                            </Text>


                        </View>

                        {/* Rating */}
                        {averageRating !== null && (
                            <View style={styles.ratingRow}>
                                <FontAwesome5 name="star" size={16} color="#E4B343" />
                                <Text style={styles.ratingText}>
                                    {averageRating} / 5 ({reviewCount} review{reviewCount > 1 ? "s" : ""})
                                </Text>
                            </View>
                        )}

                        {/* Modal */}
                        <Modal visible={isImageModalVisible} transparent>
                            <TouchableOpacity style={styles.modal} onPress={() => setImageModalVisible(false)}>
                                <Image source={{ uri: selectedLandmark.image }} style={styles.modalImage} />
                            </TouchableOpacity>
                        </Modal>
                        {selectedLandmark.arCameraSupported && (
                            <View style={styles.arButtonContainer}>
                                {/* View in 3D Button */}
                                <View style={styles.buttonWrapper}>
                                    <LottieView
                                        source={require('../assets/animations/viewIn3D.json')}
                                        style={styles.lottie}
                                        loop
                                        autoPlay
                                    />
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={() => handleNavigateToAssetList('3D')}
                                    >
                                        <Text style={styles.buttonText}>View in 3D</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* View in AR Button */}
                                <View style={styles.buttonWrapper}>
                                    <LottieView
                                        source={require('../assets/animations/viewInRW.json')}
                                        style={styles.lottie}
                                        loop
                                        autoPlay
                                    />
                                    <TouchableOpacity
                                        style={styles.button}
                                        onPress={() => handleNavigateToAssetList('AR')}
                                    >
                                        <Text style={styles.buttonText}>View in Real World</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                    </>

                )}
            </BottomSheetScrollView>
        </BottomSheet>
    );

} const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: "#F9F4F0",
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
        gap: 10,
    },

    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    arSupportText: {
        fontWeight: "600",
        fontSize: 14,
        color: "#6D4C41",
        paddingHorizontal: 5,
    },
    topRowInfo: {
        flexDirection: "row",
        gap: 4,
        flexWrap: "wrap",
        justifyContent: "flex-end",
    },
    iconTextRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#EFE1D7",
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
    },

    infoRow: {
        flexDirection: "row",
        gap: 16,
        alignItems: "flex-start",
    },
    image: {
        width: 160,
        height: 150,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "#D7CCC8",
        backgroundColor: "#F3EDEB",
    },

    detailsContainer: {
        flex: 1,
        justifyContent: "space-between",
        gap: 6,
    },
    name: {
        fontSize: 20,
        fontWeight: "700",
        color: "#4E342E",
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 2,
    },

    section: {
        backgroundColor: "#FFF9F4",
        padding: 18,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E6D9CF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },

    sectionTitle: {
        fontWeight: "700",
        fontSize: 18,
        color: "#3E2723",
        marginBottom: 10,
        letterSpacing: 0.4,
    },
    hoursText: {
        fontSize: 14,
        color: "#5D4037",
        paddingVertical: 2,
    },
    closedText: {
        color: "#B71C1C",
        fontWeight: "500",
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        color: "#4E342E",
        textAlign: "justify",
        letterSpacing: 0.3,
    },

    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 8,
        backgroundColor: "#F0E7E1",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E3D6CF",
    },
    ratingText: {
        fontWeight: "600",
        fontSize: 14.5,
        color: "#4E342E",
    },

    button: {
        backgroundColor: "#6D4C41",
        borderRadius: 28,
        height: 50,
        paddingHorizontal: 28,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 5,
    },

    buttonText: {
        color: "#fff",

        fontSize: 16,
        letterSpacing: 0.5,
    },
    arButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonWrapper: {
        alignItems: 'center',
    },
    lottie: {
        width: 150,
        height: 150,
    },

    modal: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.85)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalImage: {
        width: "90%",
        height: "70%",
        resizeMode: "contain",
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#D7CCC8",
    },
    descriptionLink: {
        color: "#007AFF",
        textDecorationLine: "underline",
    },
    video: {
        width: '100%',
        height: 300,
    }
});