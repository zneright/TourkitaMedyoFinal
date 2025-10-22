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
import { format } from "date-fns";
import TopHeader from "../components/TopHeader";
import SkeletonBox from "../components/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Import AsyncStorage

const TermsScreen = () => {
    const [activeTab, setActiveTab] = useState('terms');
    const [loading, setLoading] = useState(true);

    // Use objects to hold related data together
    const [termsData, setTermsData] = useState({ content: [], date: "" });
    const [privacyData, setPrivacyData] = useState({ content: [], date: "" });

    useEffect(() => {
        const fetchData = async () => {
            // --- CACHE-FIRST LOGIC ---
            // 1. Try to load data from cache immediately for a fast UI response.
            try {
                const cachedTerms = await AsyncStorage.getItem('cachedTerms');
                const cachedPrivacy = await AsyncStorage.getItem('cachedPrivacy');
                let foundCache = false;

                if (cachedTerms) {
                    setTermsData(JSON.parse(cachedTerms));
                    foundCache = true;
                }
                if (cachedPrivacy) {
                    setPrivacyData(JSON.parse(cachedPrivacy));
                    foundCache = true;
                }

                // If we found cached data, we can show it and stop the initial loading indicator.
                if (foundCache) {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Failed to load from cache:", e);
            }

            // 2. Then, always fetch fresh data from Firestore to update the UI and cache.
            try {
                const termsSnapshot = await getDocs(collection(db, "services"));
                const privacySnapshot = await getDocs(collection(db, "privacy"));

                // Process Terms of Service
                termsSnapshot.forEach(async (doc) => {
                    const data = doc.data();
                    const newTermsData = {
                        content: data.content || [],
                        date: data.timestamp?.toDate() ? format(data.timestamp.toDate(), "MMMM dd, yyyy") : "",
                    };
                    setTermsData(newTermsData);
                    await AsyncStorage.setItem('cachedTerms', JSON.stringify(newTermsData));
                });

                // Process Privacy Policy
                privacySnapshot.forEach(async (doc) => {
                    const data = doc.data();
                    const newPrivacyData = {
                        content: data.content || [],
                        date: data.timestamp?.toDate() ? format(data.timestamp.toDate(), "MMMM dd, yyyy") : "",
                    };
                    setPrivacyData(newPrivacyData);
                    await AsyncStorage.setItem('cachedPrivacy', JSON.stringify(newPrivacyData));
                });
            } catch (error) {
                console.error("Error fetching terms and privacy:", error);
            } finally {
                // Ensure the loading indicator is always turned off in the end.
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper component to render the content based on the active tab
    const renderContent = () => {
        const isTerms = activeTab === 'terms';
        const document = isTerms ? termsData : privacyData;
        const title = isTerms ? "Terms of Service" : "Privacy Policy";

        if (loading) {
            return (
                <View style={styles.contentContainer}>
                    <SkeletonBox width="60%" height={24} style={{ marginBottom: 20 }} />
                    <SkeletonBox width="40%" height={16} style={{ marginBottom: 12 }} />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonBox key={i} width="100%" height={16} style={{ marginBottom: 12 }} />
                    ))}
                </View>
            );
        }

        if (!document || document.content.length === 0) {
            return <Text style={styles.errorText}>Could not load document.</Text>;
        }

        return (
            <View style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.lastUpdated}>Last updated: {document.date}</Text>
                {document.content.map((item, index) => (
                    <Text key={index} style={styles.bulletText}>
                        <Text style={styles.bulletPoint}>•</Text> {item}
                    </Text>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <TopHeader title="Terms & Policies" showBackButton />

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'terms' && styles.activeTabButton]}
                    onPress={() => setActiveTab('terms')}
                >
                    <Ionicons name="document-text-outline" size={20} color={activeTab === 'terms' ? '#FFFFFF' : '#4E342E'} />
                    <Text style={[styles.tabText, activeTab === 'terms' && styles.activeTabText]}>Terms of Service</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'privacy' && styles.activeTabButton]}
                    onPress={() => setActiveTab('privacy')}
                >
                    <Ionicons name="shield-checkmark-outline" size={20} color={activeTab === 'privacy' ? '#FFFFFF' : '#4E342E'} />
                    <Text style={[styles.tabText, activeTab === 'privacy' && styles.activeTabText]}>Privacy Policy</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                {renderContent()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F4EF" },
    tabContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 10, backgroundColor: '#EFEBE9' },
    tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
    activeTabButton: { backgroundColor: '#6D4C41' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#4E342E', marginLeft: 8 },
    activeTabText: { color: '#FFFFFF' },
    contentContainer: {
        backgroundColor: "#FFFFFF", margin: 16, padding: 20, borderRadius: 12,
        elevation: 2, shadowColor: "#000", shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    },
    sectionTitle: { fontSize: 22, fontWeight: "bold", color: "#4E342E", marginBottom: 4 },
    lastUpdated: { fontSize: 13, color: "#A1887F", marginBottom: 20, fontStyle: "italic" },
    bulletText: { fontSize: 15, marginBottom: 12, color: "#5D4037", lineHeight: 22 },
    bulletPoint: { fontWeight: 'bold', color: '#8D6E63' },
    errorText: { textAlign: 'center', marginTop: 40, color: '#BF360C', fontSize: 16 }
});

export default TermsScreen;