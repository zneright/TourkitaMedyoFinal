import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    LayoutAnimation,
    UIManager,
    Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../Navigation/types";
import { collection, getDocs, doc, updateDoc, arrayUnion, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import TopHeader from "../components/TopHeader";
import BottomFooter from "../components/BottomFooter";
import { FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SkeletonBox from "../components/Skeleton";
import NotificationModal from "../components/NotificationModal";
import { useUser } from "../context/UserContext";
import GuestLockOverlay from "../components/guestLockOverlay";
import { formatDistanceToNow } from "date-fns";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NotificationSource = "notifications" | "adminMessages";
interface Notification {
    id: string; title: string; message: string; timestamp: Date;
    category: string; viewed: boolean; source: NotificationSource;
    context?: string; contextType?: "Feature" | "Location"; imageUrl?: string;
    viewedBy?: string[]; audience?: "guest" | "registered" | "all";
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Notification">;

const getIconInfo = (category: string) => {
    switch (category.toLowerCase()) {
        case "updates": return { icon: "bullhorn", color: "#673AB7", bg: "#EDE7F6" };
        case "promotions": return { icon: "gift", color: "#FF6F00", bg: "#FFF8E1" };
        case "alerts": return { icon: "exclamation-triangle", color: "#D32F2F", bg: "#FFEBEE" };
        case "reminders": return { icon: "clock", color: "#0288D1", bg: "#E1F5FE" };
        case "feedback": return { icon: "comment-dots", color: "#388E3C", bg: "#E8F5E9" };
        default: return { icon: "info-circle", color: "#546E7A", bg: "#ECEFF1" };
    }
};

const NotificationItem = ({ item, isExpanded, onPress, onImagePress }) => {
    const { icon, color, bg } = getIconInfo(item.category);
    return (
        <View style={styles.timelineItem}>
            <View style={styles.timelineIconContainer}>
                <View style={[styles.timelineLine, { flex: 1 }]} />
                <View style={[styles.iconWrapper, { backgroundColor: bg }]}>
                    <FontAwesome5 name={icon} size={20} color={color} />
                </View>
                <View style={[styles.timelineLine, { flex: 2 }]} />
            </View>
            <View style={styles.card}>
                <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.notificationTitle, !item.viewed && styles.unviewedText]}>{item.title}</Text>
                        {!item.viewed && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.datePosted}>
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </Text>
                </TouchableOpacity>
                {isExpanded && (
                    <View style={styles.messageContainer}>
                        {item.imageUrl && (
                            <TouchableOpacity onPress={onImagePress}>
                                <Image source={{ uri: item.imageUrl }} style={styles.thumbnailImage} />
                            </TouchableOpacity>
                        )}
                        {item.context && item.contextType && (
                            <Text style={styles.contextLine}>
                                Regarding: <Text style={{ fontWeight: '600' }}>{item.context}</Text>
                            </Text>
                        )}
                        <Text style={styles.messageText}>{item.message}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const NotificationScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const { isGuest } = useUser();
    const user = getAuth().currentUser;

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchNotifications);
        return unsubscribe;
    }, [navigation, isGuest]);

    const fetchNotifications = async () => {
        try {
            const cached = await AsyncStorage.getItem("cachedNotifications");
            if (cached) {
                const parsed: Notification[] = JSON.parse(cached);
                setNotifications(parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) })));
                setLoading(false);
            }
        } catch (e) { console.error("Failed to load notifications from cache:", e); }

        try {
            const userId = user?.uid || "guest";
            const userEmail = user?.email || "guest@example.com";
            const userCreationTime = user?.metadata?.creationTime ? new Date(user.metadata.creationTime) : new Date(0);

            const [notifSnap, adminSnap] = await Promise.all([
                getDocs(collection(db, "notifications")),
                user ? getDocs(query(collection(db, "adminMessages"), where("to", "==", userEmail))) : Promise.resolve({ docs: [] }),
            ]);

            const notifData: Notification[] = notifSnap.docs
                .map(docSnap => {
                    const data = docSnap.data();
                    const viewedBy = Array.isArray(data.viewedBy) ? data.viewedBy : [];
                    return {
                        id: docSnap.id,
                        title: data.title || "Untitled",
                        message: data.message || "No message provided.",
                        timestamp: data.timestamp?.toDate?.() ?? new Date(),
                        category: data.category || "info",
                        viewed: viewedBy.includes(userId),
                        source: "notifications" as NotificationSource,
                        imageUrl: data.imageUrl || "",
                        audience: data.audience || "all",
                        viewedBy,
                    };
                })
                .filter(n => {
                    const afterCreation = n.timestamp >= userCreationTime;
                    const audienceMatch = n.audience === "all" || (isGuest && n.audience === "guest") || (!isGuest && n.audience === "registered");
                    const isWelcomeMessage = n.id === "2TE1minYn4KNOPo2b64T";
                    return (afterCreation && audienceMatch) || isWelcomeMessage;
                });

            const adminData: Notification[] = adminSnap.docs
                .map(docSnap => {
                    const data = docSnap.data();
                    const viewedBy = Array.isArray(data.viewedBy) ? data.viewedBy : [];
                    return {
                        id: docSnap.id,
                        title: "Admin Response to Your Feedback",
                        message: data.message || "No reply message.",
                        timestamp: data.sentAt?.toDate?.() ?? new Date(),
                        category: "feedback",
                        viewed: viewedBy.includes(userId),
                        source: "adminMessages" as NotificationSource,
                        context: data.context || "",
                        contextType: data.contextType || "",
                    };
                })
                .filter(n => n.timestamp >= userCreationTime);

            const combined = [...notifData, ...adminData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setNotifications(combined);
            await AsyncStorage.setItem("cachedNotifications", JSON.stringify(combined));
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = async (item: Notification) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(prev => (prev === item.id ? null : item.id));

        if (!item.viewed && !isGuest && user) {
            try {
                const userId = user.uid;
                const docRef = doc(db, item.source, item.id);
                await updateDoc(docRef, { viewedBy: arrayUnion(userId) });

                const updated = notifications.map(n => n.id === item.id ? { ...n, viewed: true } : n);
                setNotifications(updated);
                await AsyncStorage.setItem("cachedNotifications", JSON.stringify(updated));
            } catch (err) { console.warn("Update viewed status failed:", err); }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Notifications" onSupportPress={() => navigation.navigate("Support")} />

            {isGuest && <GuestLockOverlay />}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerText}>Inbox</Text>
                    <Text style={styles.subHeaderText}>Updates, alerts, and messages appear here.</Text>
                </View>

                {loading && notifications.length === 0 ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <View key={i} style={styles.timelineItem}>
                            <View style={styles.timelineIconContainer}><View style={styles.timelineLine} /><SkeletonBox width={44} height={44} borderRadius={22} /><View style={styles.timelineLine} /></View>
                            <View style={styles.card}><SkeletonBox width="70%" height={20} /><SkeletonBox width="40%" height={14} style={{ marginTop: 8 }} /></View>
                        </View>
                    ))
                ) : notifications.length === 0 ? (
                    <View style={styles.centerView}>
                        <Ionicons name="notifications-off-outline" size={60} color="#A1887F" />
                        <Text style={styles.centerText}>You're all caught up!</Text>
                    </View>
                ) : (
                    notifications.map(item => (
                        <NotificationItem
                            key={item.id + item.source}
                            item={item}
                            isExpanded={expandedId === item.id}
                            onPress={() => toggleExpand(item)}
                            onImagePress={() => setModalImageUrl(item.imageUrl!)}
                        />
                    ))
                )}
            </ScrollView>

            <NotificationModal visible={!!modalImageUrl} onClose={() => setModalImageUrl(null)} imageUrl={modalImageUrl} notifications={notifications} />
            <BottomFooter active="Notification" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F4EF" },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
    header: { paddingVertical: 16, marginBottom: 16 },
    headerText: { fontSize: 28, fontWeight: "bold", color: "#4E342E" },
    subHeaderText: { fontSize: 15, color: "#A1887F", marginTop: 4 },
    centerView: { flex: 1, justifyContent: "center", alignItems: "center", marginTop: 80, paddingBottom: 50 },
    centerText: { marginTop: 16, fontSize: 16, color: "#795548" },
    timelineItem: { flexDirection: 'row', marginBottom: 8 },
    timelineIconContainer: { alignItems: 'center', marginRight: 12 },
    timelineLine: { width: 2, backgroundColor: '#E0E0E0' },
    iconWrapper: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: "center", alignItems: "center",
        marginVertical: 4,
    },
    card: {
        flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16,
        justifyContent: 'center', marginBottom: 8,
        borderWidth: 1, borderColor: '#F5F5F5',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    notificationTitle: { fontSize: 16, fontWeight: "500", color: "#4E342E", flex: 1 },
    unviewedText: { fontWeight: "bold" },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF6F00', marginLeft: 8 },
    datePosted: { fontSize: 12, color: "#A1887F", marginTop: 4 },
    messageContainer: {
        marginTop: 12, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F5F5F5',
    },
    contextLine: { fontSize: 13, color: "#5D4037", marginBottom: 8, fontStyle: 'italic' },
    messageText: { fontSize: 14, color: "#493628", lineHeight: 20 },
    thumbnailImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
});

export default NotificationScreen;