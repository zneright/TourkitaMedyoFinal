import React, { useState, useRef } from "react";
import {
    Modal,
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Video from 'react-native-video';

type Marker = {
    id: string;
    name: string;
    image: string;
    category: string;
    latitude: number;
    longitude: number;
    audio?: string;
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const videoRef = useRef<Video>(null);

    if (!marker) return null;

    const status = getOpenStatus(marker);
    const isAvailable = status.toLowerCase().includes("open");
    const isUnavailable = status.toLowerCase().includes("closed");

    const statusColor = isAvailable ? "#28a745" : isUnavailable ? "#dc3545" : "#6c757d";

    const handleClose = () => {
        if (isPlaying) {
            setIsPlaying(false);
        }
        onClose();
    };

    const handleAudioToggle = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            {/* Hidden Video component for audio playback */}
            {marker.audio && (
                <Video
                    ref={videoRef}
                    source={{ uri: marker.audio }}
                    paused={!isPlaying}
                    audioOnly
                    onLoadStart={() => setIsAudioLoading(true)}
                    onLoad={() => setIsAudioLoading(false)}
                    onEnd={() => setIsPlaying(false)}
                    onError={(error) => {
                        console.error("Audio playback error:", error);
                        setIsPlaying(false);
                        setIsAudioLoading(false);
                    }}
                    style={{ height: 0, width: 0 }}
                />
            )}

            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Image
                        source={{ uri: marker.image }}
                        style={styles.modalImage}
                    />
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Icon name="close-circle" size={30} color="#fff" />
                    </TouchableOpacity>

                    <ScrollView
                        style={styles.contentContainer}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.modalCategory}>{marker.category.toUpperCase()}</Text>
                        <Text style={styles.modalTitle}>{marker.name}</Text>

                        {/* Status Section */}
                        <View style={styles.infoRow}>
                            <Icon name="time-outline" size={18} color={statusColor} />
                            <Text style={[styles.modalStatus, { color: statusColor }]}>{status}</Text>
                        </View>

                        {/* Address Section */}
                        <View style={styles.infoRow}>
                            <Icon name="location-outline" size={18} color="#493628" />
                            <Text style={styles.modalAddress}>{marker.address}</Text>
                        </View>

                        {/* MODIFIED: Audio Guide Button - Styled for prominence */}
                        {marker.audio && (
                            <TouchableOpacity
                                style={styles.audioButton}
                                onPress={handleAudioToggle}
                                disabled={isAudioLoading}
                            >
                                <View style={styles.audioButtonContent}>
                                    {isAudioLoading ? (
                                        <ActivityIndicator size="large" color="#FFF" />
                                    ) : (
                                        <FontAwesome
                                            name={isPlaying ? 'pause-circle' : 'play-circle'} // Use larger circle icons
                                            size={28} // Increased size
                                            color="#FFF"
                                        />
                                    )}
                                    <Text style={styles.audioButtonText}>
                                        {isAudioLoading
                                            ? 'Loading Audio Guide...'
                                            : isPlaying
                                                ? 'PAUSE AUDIO GUIDE'
                                                : 'LISTEN TO AUDIO GUIDE'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.modalDescription}>{marker.description}</Text>
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.navigateButton}
                        onPress={() => onNavigate(marker)}
                    >
                        <Text style={styles.navigateButtonText}>Navigate</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContainer: {
        width: "100%",
        maxHeight: "85%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalImage: {
        width: "100%",
        height: 220,
    },
    closeButton: {
        position: "absolute",
        top: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 15,
        zIndex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    modalCategory: {
        fontSize: 12,
        fontWeight: '700',
        color: '#8A6F57',
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#493628",
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalStatus: {
        fontSize: 14,
        fontWeight: "600",
        marginLeft: 8,
    },
    modalAddress: {
        color: "#493628",
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    modalDescription: {
        color: "#6B5E5E",
        fontSize: 14,
        lineHeight: 22,
        marginTop: 8,
        marginBottom: 20,
    },
    // MODIFIED: Audio Button Styles
    audioButton: {
        // Removed explicit width/height constraints, letting padding control size
        backgroundColor: "#8A6F57",
        paddingVertical: 12, // Increased padding
        paddingHorizontal: 15,
        borderRadius: 10, // Slightly rounder corners
        marginBottom: 15,
        // Aligns button to full-width relative to its container
        alignSelf: 'stretch',
    },
    audioButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center content horizontally
    },
    audioButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: 'bold', // Made text bold
        marginLeft: 12, // Increased space between icon and text
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        backgroundColor: "#493628",
        margin: 20,
        borderRadius: 12,
    },
    navigateButtonText: {
        color: "#FFF",
        fontSize: 18,
        fontWeight: "bold",
    },
});

export default LandmarkDetailModal;