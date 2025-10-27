/* eslint-disable */
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { getDirections } from "../services/directions";
import haversine from "haversine-distance";
import LottieView from "lottie-react-native";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";

const LandmarkContext = createContext({});

export default function LandmarkProvider({ children }: PropsWithChildren) {
    const [selectedLandmark, setSelectedLandmark] = useState();
    const [direction, setDirection] = useState();
    const [showDirection, setShowDirection] = useState(false);
    const [loadingDirection, setLoadingDirection] = useState(false);
    const [mode, setMode] = useState<"walking" | "cycling" | "driving" | "driving-traffic">("walking");
    const [arrived, setArrived] = useState(false);

    const loadDirection = async (
        target?: { latitude: number; longitude: number },
        customMode?: typeof mode
    ) => {
        const landmark = target || selectedLandmark;
        if (!landmark) return;

        setLoadingDirection(true);
        try {
            const userLocation = await Location.getCurrentPositionAsync();
            const newDirection = await getDirections(
                [userLocation.coords.longitude, userLocation.coords.latitude],
                [landmark.longitude, landmark.latitude],
                customMode || mode
            );
            setDirection(newDirection);
            setShowDirection(true);
        } catch (err) {
            console.error("Error fetching directions: ", err);
        } finally {
            setLoadingDirection(false);
        }
    };

    // ✅ 1. CREATE THE NEW NAVIGATION-ONLY FUNCTION
    // This function will be called from your MapsScreen to start navigation
    // without another component interpreting it as a request to open a sheet.
    const setNavigationOnly = (destination: any) => {
        if (destination) {
            // Set the landmark state to enable arrival detection and route refreshing
            setSelectedLandmark(destination);
            // Immediately load the direction for the new destination
            loadDirection(destination);
        }
    };


    useEffect(() => {
        let interval: any;
        if (selectedLandmark) {
            interval = setInterval(async () => {
                try {
                    const location = await Location.getCurrentPositionAsync({});
                    const userCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    const destCoords = {
                        latitude: selectedLandmark.latitude,
                        longitude: selectedLandmark.longitude,
                    };
                    const distanceMeters = haversine(userCoords, destCoords);
                    if (distanceMeters <= 30) {
                        setArrived(true);
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Error checking arrival:", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [selectedLandmark]);

    useEffect(() => {
        let refreshInterval: any;
        if (selectedLandmark && !arrived) {
            refreshInterval = setInterval(() => {
                loadDirection();
            }, 15000);
        }
        return () => clearInterval(refreshInterval);
    }, [selectedLandmark, mode, arrived]);

    return (
        <View style={{ flex: 1 }}>
            <LandmarkContext.Provider
                value={{
                    selectedLandmark,
                    setSelectedLandmark,
                    setNavigationOnly,
                    direction,
                    directionCoordinates: direction?.routes?.[0]?.geometry.coordinates,
                    duration: direction?.routes?.[0]?.duration,
                    distance: direction?.routes?.[0]?.distance,
                    showDirection,
                    setShowDirection,
                    loadingDirection,
                    loadDirection,
                    mode,
                    setMode,
                }}
            >
                {children}
            </LandmarkContext.Provider>

            {arrived && (
                <View style={styles.overlay}>
                    <View style={styles.messageBox}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setArrived(false)}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                        <LottieView
                            source={require("../assets/animations/success.json")}
                            autoPlay
                            loop
                            style={styles.animation}
                        />
                        <Text style={styles.title}>You’ve arrived!</Text>
                        <Text style={styles.subtitle}>
                            {selectedLandmark?.name || "Your destination"}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

export const useLandmark = () => useContext(LandmarkContext);

// Styles remain the same
const styles = StyleSheet.create({
    overlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        padding: 20,
    },
    messageBox: {
        backgroundColor: "white",
        borderRadius: 20,
        paddingVertical: 25,
        paddingHorizontal: 20,
        alignItems: "center",
        width: "85%",
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 10,
        padding: 5,
    },
    closeText: {
        fontSize: 20,
        color: "#444",
    },
    animation: {
        width: 150,
        height: 150,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#333",
        marginTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginTop: 4,
    },
});