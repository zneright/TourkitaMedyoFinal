import React, { useEffect, useState, useRef } from "react";
import {
    SafeAreaView,
    ScrollView,
    Image,
    Text,
    View,
    ActivityIndicator,
    Alert,
    BackHandler,
    StyleSheet, // Import StyleSheet
} from "react-native";
import { useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../firebase";

import { RootStackParamList } from "../Navigation/types";
import { doc, setDoc } from "firebase/firestore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;
type EmailVerificationRouteProp = RouteProp<RootStackParamList, "EmailVerification">;

const EmailVerificationScreen = ({ route }: { route: EmailVerificationRouteProp }) => {
    const navigation = useNavigation<NavigationProp>();
    const { userData } = route.params;
    const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const checkEmailVerification = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            await user.reload();
            if (user.emailVerified) {
                setIsEmailVerified(true);
                setChecking(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
            }
        } catch (error) {
            console.error("Email verification check failed:", error);
        }
    };

    useEffect(() => {
        // Immediately check once
        checkEmailVerification();

        // Poll every 1 second
        intervalRef.current = setInterval(checkEmailVerification, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        // Auto-delete after 5 min if not verified
        timeoutRef.current = setTimeout(async () => {
            const user = auth.currentUser;
            if (user && !user.emailVerified) {
                await user.delete();
                Alert.alert("Verification Unsuccessful", "Your account has been removed.");
                navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            }
        }, 5 * 60 * 1000);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!isEmailVerified) return;

        const saveData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const userDataWithCreatedAt = {
                ...userData,
                customUid: user.uid,
                createdAt: new Date().toISOString(),
                // Make sure hasViewedIntro is set for new users
                hasViewedIntro: false,
            };

            try {
                await setDoc(doc(db, "users", user.uid), userDataWithCreatedAt, { merge: true });
                Alert.alert("Email Verified", "Redirecting to login screen...");
                navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            } catch (error) {
                console.error("Error saving user data:", error);
            }
        };

        saveData();
    }, [isEmailVerified]);

    useFocusEffect(() => {
        const onBackPress = () => {
            Alert.alert(
                "Cancel Email Verification",
                "Are you sure you want to go back?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "OK",
                        onPress: async () => {
                            const user = auth.currentUser;
                            if (user && !user.emailVerified) await user.delete();
                            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
                        },
                    },
                ]
            );
            return true;
        };

        BackHandler.addEventListener("hardwareBackPress", onBackPress);
        return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress);
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Image
                    source={{
                        uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/VDRo2IU0ne/5bskn3a3_expires_30_days.png",
                    }}
                    resizeMode="stretch"
                    style={styles.image}
                />

                <Text style={styles.title}>
                    Verify your Email
                </Text>
                <Text style={styles.subtitle}>
                    Please check your email for the verification link.
                </Text>

                {/* --- ADDED THIS LINE --- */}
                <Text style={styles.spamText}>
                    (Don't forget to check your spam folder!)
                </Text>
                {/* ---------------------- */}

                {checking && (
                    <View style={styles.checkingContainer}>
                        <ActivityIndicator size="large" color="#603F26" />
                        <Text style={styles.checkingText}>
                            Checking verification status...
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

// --- ADDED STYLESHEET FOR CLEANLINESS ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    container: {
        paddingVertical: 40,
        alignItems: "center",
        paddingHorizontal: 20, // Added for better text wrapping
    },
    image: {
        width: 203,
        height: 203,
        borderRadius: 40,
        marginBottom: 54,
    },
    title: {
        color: "#603F26",
        fontSize: 20,
        marginBottom: 17,
        fontWeight: 'bold',
    },
    subtitle: {
        color: "#6B5E5E",
        fontSize: 14,
        textAlign: 'center',
    },
    spamText: {
        color: "#6B5E5E",
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
    },
    checkingContainer: {
        marginVertical: 30,
        alignItems: "center",
    },
    checkingText: {
        color: "#6B5E5E",
        marginTop: 10,
    },
});

export default EmailVerificationScreen;