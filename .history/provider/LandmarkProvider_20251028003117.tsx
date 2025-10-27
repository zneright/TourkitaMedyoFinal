/* eslint-disable */
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { getDirections } from "../services/directions";
import haversine from "haversine-distance";
import LottieView from "lottie-react-native";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";

const LandmarkContext = createContext({});

export default function LandmarkProvider({ children }: PropsWithChildren) {
    // This state is ONLY for showing the landmark sheet.
    const [selectedLandmark, setSelectedLandmarkState] = useState(null);

    // ✅ 1. ADD NEW STATE FOR NAVIGATION
    // This state will hold the current navigation destination and control the route line.
    const [navigationDestination, setNavigationDestination] = useState(null);

    const [direction, setDirection] = useState(null);
    const [showDirection, setShowDirection] = useState(false);
    const [loadingDirection, setLoadingDirection] = useState(false);
    const [mode, setMode] = useState<"walking" | "cycling" | "driving" | "driving-traffic">("walking");
    const [arrived, setArrived] = useState(false);

    // This function now uses `navigationDestination` to load the route.
    const loadDirection = async (
        target?: { latitude: number; longitude: number },
        customMode?: typeof mode
    ) => {
        // Use the passed target or the current navigation destination.
        const landmark = target || navigationDestination;
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

    // ✅ 2. CREATE A NEW FUNCTION FOR NAVIGATION ONLY
    // This is called from MapsScreen when navigating from the event modal.
    const setNavigationOnly = (destination: any) => {
        if (destination) {
            setSelectedLandmarkState(null);
            setNavigationDestination(destination);
        }
    };

    const setSelectedLandmark = (landmark: any) => {
        setSelectedLandmarkState(landmark);
        setNavigationDestination(landmark);
    };

    useEffect(() => {
        let interval: any;
        if (navigationDestination) {
            interval = setInterval(async () => {
                try {
                    const location = await Location.getCurrentPositionAsync({});
                    const userCoords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    const destCoords = {
                        latitude: navigationDestination.latitude, 
                        longitude: navigationDestination.longitude, 
                    };
                    const distanceMeters = haversine(userCoords, destCoords);
                    if (distanceMeters <= 30) {
                        setArrived(true);
                        setNavigationDestination(null); 
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error("Error checking arrival:", err);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [navigationDestination]); 

    useEffect(() => {
        let refreshInterval: any;
        if (navigationDestination && !arrived) {
            loadDirection(navigationDestination); 
            refreshInterval = setInterval(() => {
                loadDirection(navigationDestination);
            }, 15000);
        } else {
            setDirection(null);
            setShowDirection(false);
        }
        return () => clearInterval(refreshInterval);
    }, [navigationDestination, mode, arrived]); 

    return (
        <View style={{ flex: 1 }}>
            <LandmarkContext.Provider
                value={{
                    selectedLandmark,
                    setSelectedLandmark,  
                    setNavigationOnly,  
                    navigationDestination,
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
                            loop={false} 
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

const styles = StyleSheet.create({
    overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", padding: 20, zIndex: 100 },
    messageBox: { backgroundColor: "white", borderRadius: 20, paddingVertical: 25, paddingHorizontal: 20, alignItems: "center", width: "85%" },
    closeButton: { position: "absolute", top: 10, right: 10, padding: 5 },
    closeText: { fontSize: 20, color: "#444" },
    animation: { width: 150, height: 150 },
    title: { fontSize: 22, fontWeight: "bold", color: "#333", marginTop: 10 },
    subtitle: { fontSize: 16, color: "#666", marginTop: 4 },
});