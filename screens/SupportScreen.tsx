import React from "react";
import {
    Linking,
    SafeAreaView,
    View,
    ScrollView,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import TopHeader from "../components/TopHeader";
import Feather from 'react-native-vector-icons/Feather';
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../Navigation/types";
import BottomFooter from "../components/BottomFooter";
import { useUser } from "../context/UserContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Maps">;

const SupportScreen = () => {
    const { isGuest } = useUser();
    const navigation = useNavigation<NavigationProp>();
    const handlePress = (action) => {
        if (action === "Message Us") {
            const email = "business@intramuros.gov.ph";
            const subject = encodeURIComponent("TourKita Support Inquiry");
            const body = encodeURIComponent("Hello TourKita Team,\n\nI need help with...");
            const mailUrl = `mailto:${email}?subject=${subject}&body=${body}`;

            Linking.openURL(mailUrl).catch((err) =>
                console.error("Failed to open email app:", err)
            );
        }
    };
  

    const SupportRow = ({
        label,
        subtitle,
        icon,
        onPress,
        disabled = false,
    }: {
        label: string;
        subtitle: string;
        icon: string;
        onPress: () => void;
        disabled?: boolean;
    }) => (
        <TouchableOpacity
            style={[styles.rowBox, disabled && { opacity: 0.5 }]}
            onPress={onPress}
            disabled={disabled}
        >
            <Icon name={icon} size={28} color="#493628" style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={styles.boxLabel}>{label}</Text>
                    {disabled && (
                        <Feather
                            name="lock"
                            size={18}
                            color="#493628"
                            style={{ marginLeft: 6 }}
                        />
                    )}
                </View>
                <Text style={styles.boxSubtitle}>{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Support" />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.row}>
                    <SupportBox
                        label="Call Us"
                        subtitle="Talk to our Executive"
                        icon="phone"
                        onPress={() => Linking.openURL('tel:+639123456789')}
                    />
                    <SupportBox
                        label="Message Us"
                        subtitle="Mail to our Executive"
                        icon="email"
                        onPress={() => handlePress("Message Us")}
                    />
                </View>
                <SupportRow
                    label="FAQs Questions"
                    subtitle="Discover App Information"
                    icon="help-circle-outline"
                    onPress={() => navigation.navigate("FAQScreen")}
                />

                {isGuest ? (
                    <SupportRow
                        label="Feedback"
                        subtitle="Please log in to submit feedback"
                        icon="message-text-outline"
                        onPress={() =>
                            Alert.alert("Access Denied", "Please log in to use the Feedback feature.")
                        }
                        disabled
                    />
                ) : (
                    <SupportRow
                        label="Feedback"
                        subtitle="Tell us what you think about our app"
                        icon="message-text-outline"
                        onPress={() => navigation.navigate("Feedback")}
                    />
                )}
            </ScrollView>
            <BottomFooter active="" />
        </SafeAreaView>
    );
};

const SupportBox = ({
    label,
    subtitle,
    icon,
    onPress,
}: {
    label: string;
    subtitle: string;
    icon: string;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.box} onPress={onPress}>
        <Icon name={icon} size={28} color="#493628" />
        <Text style={styles.boxLabel}>{label}</Text>
        <Text style={styles.boxSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    scrollContainer: { paddingHorizontal: 20, paddingVertical: 24 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
    box: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        width: "48%",
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },
    rowBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
        elevation: 2,
    },
    boxLabel: {
        fontSize: 15,
        fontWeight: "600",
        color: "#493628",
        marginBottom: 2,
    },
    boxSubtitle: {
        fontSize: 12,
        color: "#6B5E5E",
    },
});

export default SupportScreen;
