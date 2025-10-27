
import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import * as FileSystem from 'expo-file-system';
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystems';

// --- A self-contained component for each item in the list ---
const RelicItem = ({ item, navigation }) => {
    const [status, setStatus] = useState('checking'); // 'checking', 'downloaded', 'not_downloaded', 'downloading'
    const [progress, setProgress] = useState(0);

    // Construct the predictable local file path using the shared system
    const localUri = `${SHARED_ASSETS_DIR}${getSafeDirName(item.locationName)}/${getFilenameFromUrl(item.modelUrl)}`;

    useEffect(() => {
        const checkFile = async () => {
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            setStatus(fileInfo.exists ? 'downloaded' : 'not_downloaded');
        };
        checkFile();
    }, [localUri]);

    const handleDownload = async () => {
        setStatus('downloading');
        setProgress(0);
        try {
            const dir = localUri.substring(0, localUri.lastIndexOf('/'));
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

            const downloadResumable = FileSystem.createDownloadResumable(
                item.modelUrl,
                localUri,
                {},
                p => setProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite)
            );
            await downloadResumable.downloadAsync();
            setStatus('downloaded');
        } catch (e) { console.error("Download failed:", e); setStatus('not_downloaded'); }
    };

    const handleDelete = async () => {
        try {
            await FileSystem.deleteAsync(localUri, { idempotent: true });
            setStatus('not_downloaded');
            setProgress(0);
        } catch (e) { console.error("Delete failed:", e); }
    };

    const handleView = () => {
        if (status === 'downloaded') {
            navigation.navigate("View3D", {
                modelUrl: item.modelUrl,
                title: item.name, // This title is crucial for the View3D screen to find the local file
            });
        }
    };

    const renderStatus = () => {
        switch (status) {
            case 'downloading':
                return (
                    <View style={styles.statusContainer}>
                        <Text style={styles.progressText}>{`${(progress * 100).toFixed(0)}%`}</Text>
                        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
                    </View>
                );
            case 'downloaded':
                return (
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={handleView}>
                            <Ionicons name="eye" size={16} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                            <Ionicons name="trash" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                );
            case 'checking':
                return <ActivityIndicator size="small" />;
            default: // 'not_downloaded'
                return (
                    <TouchableOpacity style={[styles.actionButton, styles.downloadButton]} onPress={handleDownload}>
                        <Ionicons name="download" size={16} color="white" />
                    </TouchableOpacity>
                );
        }
    };

    return (
        <TouchableOpacity style={styles.item} onPress={handleView} disabled={status !== 'downloaded'}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={styles.itemDetails}>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
            {renderStatus()}
        </TouchableOpacity>
    );
};

export default function RelicList({ route, navigation }) {
    const { relics, title } = route.params;
    return (
        <View style={styles.container}>
            <Button />
            <Text style={styles.header}>{title} - Relics & Artifacts</Text>
            <FlatList
                data={relics}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <RelicItem item={item} navigation={navigation} />}
                ListEmptyComponent={<Text style={styles.empty}>No relics found for this landmark.</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F4EF", padding: 16 },
    header: { marginTop: 45, fontSize: 22, fontWeight: "bold", marginBottom: 15, color: '#4E342E', textAlign: 'center' },
    item: { padding: 12, marginBottom: 12, backgroundColor: "#FFF", borderRadius: 12, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: '#EFEBE9', elevation: 2 },
    itemDetails: { flex: 1, marginLeft: 12, marginRight: 8 },
    itemText: { fontSize: 16, fontWeight: '600', color: '#3E2723' },
    itemDescription: { fontSize: 13, color: '#795548', marginTop: 2 },
    image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#E0E0E0' },
    empty: { textAlign: "center", marginTop: 40, color: "#999" },
    statusContainer: { alignItems: 'center', width: 60 },
    actionsRow: { flexDirection: 'row' },
    actionButton: { padding: 8, borderRadius: 20, marginHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
    downloadButton: { backgroundColor: '#007AFF', width: 36, height: 36 },
    viewButton: { backgroundColor: '#4CAF50', width: 36, height: 36 },
    deleteButton: { backgroundColor: '#D32F2F', width: 36, height: 36 },
    progressText: { fontSize: 12, color: '#333' },
    progressBar: { height: 4, width: '100%', backgroundColor: '#E0E0E0', borderRadius: 2, marginTop: 2 },
    progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
});
