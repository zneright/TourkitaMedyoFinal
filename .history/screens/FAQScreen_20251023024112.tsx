import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    BackHandler,
    LayoutAnimation,
    UIManager,
    Platform,
} from "react-native";
import { db } from "../firebase";
import { getDoc, doc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../Navigation/types";
import TopHeader from "../components/TopHeader";
import SkeletonBox from "../components/Skeleton";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQItemData {
    question: string;
    answer: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FAQItem = ({ item, isExpanded, onPress }) => {
    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={onPress} style={styles.questionContainer} activeOpacity={0.8}>
                <Text style={styles.questionText}>{item.question}</Text>
                <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={22}
                    color="#8D6E63"
                />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{item.answer}</Text>
                </View>
            )}
        </View>
    );
};

const SkeletonLoader = () => (
    <View style={styles.content}>
        {Array.from({ length: 5 }).map((_, index) => (
            <View key={index} style={[styles.card, { paddingVertical: 20 }]}>
                <SkeletonBox width="90%" height={20} />
            </View>
        ))}
    </View>
);

const FAQScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [faqs, setFaqs] = useState<FAQItemData[]>([]);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    useEffect(() => {
        const fetchFAQs = async () => {
            try {
                const docRef = doc(db, "faq", "latest");
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    setFaqs(snapshot.data().items || []);
                }
            } catch (err) {
                console.error("Failed to fetch FAQs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFAQs();
    }, []);

    const toggleFAQ = (index: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedIndex(prevIndex => (prevIndex === index ? null : index));
    };

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Support" showBackButton />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Ionicons name="help-circle-outline" size={48} color="#6D4C41" />
                    <Text style={styles.headerText}>Frequently Asked Questions</Text>
                    <Text style={styles.subHeaderText}>
                        Find answers to common questions about the TourKita app.
                    </Text>
                </View>

                {loading ? (
                    <SkeletonLoader />
                ) : faqs.length === 0 ? (
                    <Text style={styles.noFAQ}>No FAQs available at the moment.</Text>
                ) : (
                    faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            item={faq}
                            isExpanded={expandedIndex === index}
                            onPress={() => toggleFAQ(index)}
                        />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9F4EF"
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40
    },
    header: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#4E342E",
        marginTop: 12,
        textAlign: 'center',
    },
    subHeaderText: {
        fontSize: 15,
        color: "#A1887F",
        marginTop: 8,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 10
    },
    noFAQ: {
        textAlign: "center",
        marginTop: 40,
        fontSize: 16,
        color: "#795548"
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
    },
    questionContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
    },
    questionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: "#4E342E",
        marginRight: 10,
    },
    answerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    answerText: {
        marginTop: 12,
        fontSize: 15,
        color: "#5D4037",
        lineHeight: 22,
    },
});

export default FAQScreen;