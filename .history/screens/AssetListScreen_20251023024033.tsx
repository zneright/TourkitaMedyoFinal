import React, { useState, useEffect, useMemo } from "react";
import { View, Text, SectionList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import * as FileSystem from 'expo-file-system';
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystem';

const AssetItem = ({ item, navigation, mode }) => {
    const [status, setStatus] = useState('checking');
    const [progress, setProgress] = useState(0);

    const requiredFiles = useMemo(() => {
        const files = [
            { remote: item.modelUrl, local: `${SHARED_ASSETS_DIR}${getSafeDirName(item.locationName)}/${getFilenameFromUrl(item.modelUrl)}` },
            { remote: item.imageUrl, local: `${SHARED_ASSETS_DIR}${getSafeDirName(item.locationName)}/${getFilenameFromUrl(item.imageUrl)}` },
        ];
        if (item.videoUrl) {
            files.push({ remote: item.videoUrl, local: `${SHARED_ASSETS_DIR}${getSafeDirName(item.locationName)}/${getFilenameFromUrl(item.videoUrl)}` });
        }
        return files;
    }, [item]);

    useEffect(() => {
        const checkFiles = async () => {
            for (const file of requiredFiles) {
                const fileInfo = await FileSystem.getInfoAsync(file.local);
                if (!fileInfo.exists) {
                    setStatus('not_downloaded');
                    return;
                }
            }
            setStatus('downloaded');
        };
        checkFiles();
    }, [requiredFiles]);

    const handleDownload = async () => {
        setStatus('downloading');
        setProgress(0);
        try {
            for (let i = 0; i < requiredFiles.length; i++) {
                const file = requiredFiles[i];
                const dir = file.local.substring(0, file.local.lastIndexOf('/'));
                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

                const downloadResumable = FileSystem.createDownloadResumable(
                    file.remote, file.local, {},
                    p => setProgress((i + (p.totalBytesWritten / p.totalBytesExpectedToWrite)) / requiredFiles.length)
                );
                await downloadResumable.downloadAsync();
            }
            setStatus('downloaded');
        } catch (e) { console.error("Download failed:", e); setStatus('not_downloaded'); }
    };

    const handleDelete = async () => {
        try {
            for (const file of requiredFiles) {
                await FileSystem.deleteAsync(file.local, { idempotent: true });
            }
            setStatus('not_downloaded');
            setProgress(0);
        } catch (e) { console.error("Delete failed:", e); }
    };

    const handleLaunch = () => {
        if (status !== 'downloaded') return;
        if (mode === '3D') {
            navigation.navigate("View3D", { modelUrl: item.modelUrl, title: item.name });
        } else if (mode === 'AR') {
            navigation.navigate("ArCam", { arTargetId: item.id });
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
                        <TouchableOpacity style={[styles.actionButton, styles.viewButton]} onPress={handleLaunch}>
                            <Ionicons name={mode === 'AR' ? 'camera' : 'eye'} size={18} color="white" />
                            <Text style={styles.actionButtonText}>View</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                            <Ionicons name="trash" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                );
            case 'checking': return <ActivityIndicator size="small" />;
            default:
                return (
                    <TouchableOpacity style={[styles.actionButton, styles.downloadButton]} onPress={handleDownload}>
                        <Ionicons name="download" size={18} color="white" />
                        <Text style={styles.actionButtonText}>Download</Text>
                    </TouchableOpacity>
                );
        }
    };

    return (
        <View style={styles.item}>
            <View style={styles.itemHeader}>
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
                <Text style={styles.itemText}>{item.name}</Text>
            </View>
            <Text style={styles.itemDescription}>{item.description}</Text>
            <View style={styles.itemFooter}>
                {renderStatus()}
            </View>
        </View>
    );
};

export default function AssetListScreen({ route, navigation }) {
    const { assets, title, mode } = route.params;
    const headerTitle = mode === 'AR' ? 'View in Real World' : 'View in 3D';

    const sections = useMemo(() => {
        const building = assets.filter(asset => asset.category !== 'Relics/Artifacts');
        const relics = assets.filter(asset => asset.category === 'Relics/Artifacts');

        const data = [];
        if (building.length > 0) {
            data.push({ title: 'Building', data: building });
        }
        if (relics.length > 0) {
            data.push({ title: 'Relics & Artifacts', data: relics });
        }
        return data;
    }, [assets]);

    return (
        <View style={styles.container}>
            <Button />
            <Text style={styles.header}>{title}</Text>
            <Text style={styles.subHeader}>{headerTitle}</Text>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AssetItem item={item} navigation={navigation} mode={mode} />}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.sectionHeader}>{title}</Text>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No viewable assets found for this landmark.</Text>}
                contentContainerStyle={{ paddingHorizontal: 8 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F4EF", paddingTop: 16 },
    header: { marginTop: 45, fontSize: 22, fontWeight: "bold", color: '#4E342E', textAlign: 'center' },
    subHeader: { fontSize: 16, color: '#795548', textAlign: 'center', marginBottom: 20 },
    sectionHeader: {
        fontSize: 18, fontWeight: 'bold', color: '#6D4C41', backgroundColor: '#EFEBE9',
        paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10, borderRadius: 8, overflow: 'hidden',
    },
    item: {
        padding: 12, marginBottom: 12, backgroundColor: "#FFF", borderRadius: 12,
        borderWidth: 1, borderColor: '#EFEBE9', elevation: 2,
    },
    itemHeader: {
        flexDirection: 'row', alignItems: 'center',
    },
    image: {
        width: 60, height: 60, borderRadius: 8, backgroundColor: '#E0E0E0',
    },
    itemText: {
        fontSize: 18, fontWeight: 'bold', color: '#3E2723',
        marginLeft: 12, flex: 1,
    },
    itemDescription: {
        fontSize: 14, color: '#5D4037', lineHeight: 20,
        marginTop: 8,
    },
    itemFooter: {
        flexDirection: 'row', justifyContent: 'flex-end',
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F5F5F5',
    },
    statusContainer: {
        flex: 1, alignItems: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
    },
    actionButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
        marginHorizontal: 4,
    },
    actionButtonText: {
        color: 'white', fontWeight: 'bold', fontSize: 14, marginLeft: 6,
    },
    downloadButton: {
        backgroundColor: '#007AFF',
    },
    viewButton: {
        backgroundColor: '#4CAF50',
    },
    deleteButton: {
        backgroundColor: '#D32F2F',
        paddingHorizontal: 12,
    },
    progressText: {
        fontSize: 12, color: '#333',
    },
    progressBar: {
        height: 5, width: '100%', backgroundColor: '#E0E0E0', borderRadius: 2.5, marginTop: 4,
    },
    progressFill: {
        height: '100%', backgroundColor: '#007AFF', borderRadius: 2.5,
    },
    empty: {
        textAlign: "center", marginTop: 40, color: "#999"
    },
});