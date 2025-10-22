import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
    Camera,
    DefaultLight,
    FilamentScene,
    FilamentView,
    Model,
    useCameraManipulator
} from 'react-native-filament';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-worklets-core';
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystem';
import Button from '../components/Button';

export default function View3D({ route, navigation }) {
    const { modelUrl, title } = route?.params || {};

    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const localUri = modelUrl && title
        ? `${SHARED_ASSETS_DIR}${getSafeDirName(title)}/${getFilenameFromUrl(modelUrl)}`
        : null;

    useEffect(() => {
        const checkIfDownloaded = async () => {
            if (localUri) {
                const fileInfo = await FileSystem.getInfoAsync(localUri);
                setIsDownloaded(fileInfo.exists);
            }
        };
        checkIfDownloaded();
    }, [localUri]);

    const handleDownload = async () => {
        if (!modelUrl || !localUri) return;

        setIsDownloading(true);
        setDownloadProgress(0);
        try {
            const fileDir = localUri.substring(0, localUri.lastIndexOf('/'));
            await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });
            const downloadResumable = FileSystem.createDownloadResumable(
                modelUrl, localUri, {},
                p => setDownloadProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite)
            );
            await downloadResumable.downloadAsync();
            setIsDownloaded(true);
        } catch (e) { console.error("3DView Download Error:", e); }
        finally { setIsDownloading(false); }
    };

    const handleDelete = async () => {
        if (!localUri) return;
        try {
            await FileSystem.deleteAsync(localUri, { idempotent: true });
            setIsDownloaded(false);
        } catch (e) { console.error('3DView: Error deleting file', e); }
    };

    const renderContent = () => {
        if (!modelUrl) {
            return <View style={[styles.modelView, styles.centered]}><Text style={styles.infoText}>No 3D model provided.</Text></View>;
        }
        if (isDownloaded) {
            return <Scene modelUri={localUri} />;
        }
        if (isDownloading) {
            return (
                <View style={[styles.modelView, styles.centered]}>
                    <Text style={styles.infoText}>Downloading Model...</Text>
                    <Text style={styles.infoText}>{`${(downloadProgress * 100).toFixed(0)}%`}</Text>
                    <View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} /></View>
                </View>
            );
        }
        return (
            <View style={[styles.modelView, styles.centered]}>
                <TouchableOpacity style={styles.button} onPress={handleDownload}><Text style={styles.buttonText}>Download Model</Text></TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Button />
            <Text style={styles.title}>{title || "3D Viewer"}</Text>
            <FilamentScene>{renderContent()}</FilamentScene>
            {isDownloaded && modelUrl && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete}><Text style={styles.buttonText}>Delete Model</Text></TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function Scene({ modelUri }) {
    const cameraManipulator = useCameraManipulator({ orbitHomePosition: [0, 0, 8], targetPosition: [0, 0, 0], orbitSpeed: [0.003, 0.003] });
    const viewHeight = Dimensions.get('window').height;
    const previousScale = useSharedValue(1);
    const scaleMultiplier = 100;
    const panGesture = Gesture.Pan()
        .onBegin((e) => cameraManipulator?.grabBegin(e.translationX, viewHeight - e.translationY, false))
        .onUpdate((e) => cameraManipulator?.grabUpdate(e.translationX, viewHeight - e.translationY))
        .maxPointers(1).onEnd(() => cameraManipulator?.grabEnd());
    const pinchGesture = Gesture.Pinch()
        .onBegin(({ scale }) => { previousScale.value = scale; })
        .onUpdate(({ scale, focalX, focalY }) => {
            const delta = scale - previousScale.value;
            cameraManipulator?.scroll(focalX, focalY, -delta * scaleMultiplier);
            previousScale.value = scale;
        });
    const combinedGesture = Gesture.Race(pinchGesture, panGesture);

    return (
        <GestureDetector gesture={combinedGesture}>
            <FilamentView style={styles.modelView}>
                <Camera cameraManipulator={cameraManipulator} /><DefaultLight /><Model source={{ uri: modelUri }} transformToUnitCube />
            </FilamentView>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F4EF', padding: 16 },
    modelView: { width: '100%', height: 500 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    title: {
        marginTop: 45,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4E342E',
        marginBottom: 10,
        textAlign: 'center'
    },
    infoText: { color: '#999', fontSize: 16, marginBottom: 10 },
    buttonContainer: { marginTop: 20, alignItems: 'center', justifyContent: 'center', height: 60 },
    button: { backgroundColor: '#8D6E63', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, elevation: 3 },
    deleteButton: { backgroundColor: '#A93226' },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    progressBarContainer: { height: 10, width: '80%', backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden', marginTop: 10 },
    progressBar: { height: '100%', backgroundColor: '#5D4037' },
});