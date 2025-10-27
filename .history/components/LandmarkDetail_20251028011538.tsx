import React from "react";
import {
    Modal,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
} from "react-native";

// Re-using the Marker type, you might want to move this to a shared types file
type Marker = {
    id: string;
    name: string;
    image: string;
    category: string;
    latitude: number;
    longitude: number;
    openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
    address?: string;
    description?: string;
};

type LandmarkDetailModalProps = {
    visible: boolean;
    marker: Marker | null;
    onClose: () => void;
    onNavigate: (marker: Marker) => void;
    getOpenStatus: (marker: Marker) => string;
};

const LandmarkDetailModal = ({
    visible,
    marker,
    onClose,
    onNavigate,
    getOpenStatus,
}: LandmarkDetailModalProps) => {
    if (!marker) return null; // Don't render anything if there's no marker

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>X</Text>
                    </TouchableOpacity>

                    <Image
                        source={{ uri: marker.image }}
                        style={styles.modalImage}
                        resizeMode="cover"
                    />

                    <View style={styles.infoContainer}>
                        <Text style={styles.modalTitle}>{marker.name}</Text>
                        <Text style={styles.modalAddress}>{marker.address}</Text>
                        <Text style={styles.modalDescription}>{marker.description}</Text>
                        <Text style={styles.modalStatus}>{getOpenStatus(marker)}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.navigateButton}
                        onPress={() => onNavigate(marker)}
                    >
                        <Text style={styles.navigateButtonText}>Navigate</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        backgroundColor: "#2c2c2c", // A slightly lighter dark color
        borderRadius: 15,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 10,
        backgroundColor: "rgba(0,0,0,0.5)",
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    closeButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    modalImage: {
        width: "100%",
        height: 200, // Fixed height for consistency
        borderRadius: 10,
        marginBottom: 15,
    },
    infoContainer: {
        alignItems: "center",
        marginBottom: 20,
        width: "100%",
    },
    modalTitle: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 5,
    },
    modalAddress: {
        color: "#d3d3d3",
        fontSize: 14,
        textAlign: "center",
        marginBottom: 10,
    },
    modalDescription: {
        color: "#b0b0b0",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 10,
    },
    modalStatus: {
        color: "#4CAF50", // Green for open status
        fontSize: 14,
        fontWeight: "600",
        textAlign: "center",
    },
    navigateButton: {
        width: "100%",
        paddingVertical: 12,
        backgroundColor: "#493628",
        borderRadius: 8,
        alignItems: "center",
    },
    navigateButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "600",
    },
});

export default LandmarkDetailModal;