import React, { useEffect, useState, useRef } from "react";
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Alert,
    BackHandler,
    Image,
} from "react-native";
import { useNavigation, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { auth, db } from "../firebase";
import { RootStackParamList } from "../Navigation/types";
import { doc, setDoc } from "firebase/firestore";
import Icon from 'react-native-vector-icons/Feather'; 

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;
type EmailVerificationRouteProp = RouteProp<RootStackParamList, "EmailVerification">;

const EmailVerificationScreen = ({ route }: { route: EmailVerificationRouteProp }) => {
    // --- All logic remains unchanged ---
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
        checkEmailVerification();
        intervalRef.current = setInterval(checkEmailVerification, 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
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
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Icon name="mail" size={50} color="#603F26" />
                    </View>

                    <Text style={styles.title}>Verify your Email</Text>

                    <Text style={styles.subtitle}>
                        A verification link has been sent to your email address.
                    </Text>

                    <View style={styles.tipBox}>
                        <Text style={styles.tipText}>
                            Tip: Don't forget to check your spam folder!
                        </Text>
                    </View>

                    {checking && (
                        <View style={styles.checkingContainer}>
                            <ActivityIndicator size="large" color="#603F26" />
                            <Text style={styles.checkingText}>
                                Waiting for verification...
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F5F5', // Lighter background color
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#603F26',
        marginBottom: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: '#6B5E5E',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    tipBox: {
        backgroundColor: '#FDF8E2', // A light yellow for the tip box
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '100%',
        marginBottom: 30,
    },
    tipText: {
        color: '#C0A063', // A darker yellow for the text
        fontSize: 13,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    checkingContainer: {
        alignItems: 'center',
    },
    checkingText: {
        color: '#6B5E5E',
        marginTop: 15,
        fontSize: 14,
    },
});

export default EmailVerificationScreen;