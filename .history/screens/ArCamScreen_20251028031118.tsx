import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import * as FileSystem from 'expo-file-system';
import {
    ViroARScene,
    ViroARSceneNavigator,
    Viro3DObject,
    ViroARImageMarker,
    ViroAmbientLight,
    ViroNode,
    ViroARTrackingTargets,
    ViroVideo,
} from '@reactvision/react-viro';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';
import { useRoute } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import GuestLockOverlay from '../components/guestLockOverlay';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystems';


// ---------- AR SCENE ----------
function DynamicARScene({ arSceneNavigator }) {
    const { localUris, targetName, physicalWidth, modelScale } = arSceneNavigator.viroAppProps;
    const [videoScale, setVideoScale] = useState([1, 0.5, 0.5]);
    const [videoPosition, setVideoPosition] = useState([0, 0.3, 0]);
    const [modelPosition, setModelPosition] = useState([0, 0, 0]);
    useEffect(() => {
        if (!localUris?.image || !targetName) return;

        ViroARTrackingTargets.createTargets({
            [targetName]: {
                source: { uri: localUris.image },
                orientation: 'Up',
                physicalWidth: physicalWidth || 0.15,
                type: 'Image',
            },
        });

        // ⏳ After 5 seconds, move video upward to y = 1 smoothly
        const timer = setTimeout(() => {
            setVideoPosition([0, 0.5, -.5]);
            setModelPosition([0, 0, -.5]);
            setVideoScale([1, .5, .5]);
        }, 5000);

        return () => clearTimeout(timer);
    }, [localUris, targetName, physicalWidth]);

    return (
        <ViroARScene>
            <ViroAmbientLight color="#FFFFFF" />

            {localUris?.model && localUris?.image && (
                <ViroARImageMarker target={targetName}>


                    {localUris?.video && (
                        <ViroVideo
                            source={{ uri: localUris.video }}
                            position={videoPosition}
                            rotation={[0, 0, 0]}
                            scale={videoScale}
                            loop={true}
                            paused={false}
                            volume={1.0}
                        />
                    )}
                    <ViroNode position={modelPosition} scale={modelScale}>
                        <Viro3DObject
                            source={{ uri: localUris.model }}
                            type="GLB"
                            position={[0, 0, 0]}
                        />
                    </ViroNode>
                </ViroARImageMarker>
            )}
        </ViroARScene>
    );
}


// ---------- MAIN SCREEN ----------
export default function ArCamScreen() {
    const route = useRoute();
    const { arTargetId } = route.params || {};
    const { isGuest } = useUser();

    const [arData, setArData] = useState(null);
    const [localUris, setLocalUris] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloaded, setIsDownloaded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Pinch scale states
    const [modelScale, setModelScale] = useState([0.1, 0.1, 0.1]);
    const baseScale = useRef(0.1);
    const pinchStartScale = useRef(0.1);

    const handlePinchEvent = (event) => {
        const { scale } = event.nativeEvent;
        const next = Math.max(0.02, Math.min(2.0, pinchStartScale.current * scale));
        setModelScale([next, next, next]);
    };

    const handlePinchStateChange = (event) => {
        if (event.nativeEvent.state === State.BEGAN) {
            pinchStartScale.current = baseScale.current;
        } else if (event.nativeEvent.state === State.END) {
            baseScale.current = modelScale[0];
        }
    };

    // Fetch AR data
    useEffect(() => {
        const fetchAR = async () => {
            if (!arTargetId) {
                setIsLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'arTargets', arTargetId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setArData(snap.data());
                } else {
                    console.warn('No AR data found.');
                }
            } catch (e) {
                console.error('Error fetching AR data:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAR();
    }, [arTargetId]);

    // Prepare asset URIs
    useEffect(() => {
        if (!arData) return;

        const prepareAssets = async () => {
            const { name, modelUrl, imageUrl, videoUrl } = arData;
            const dirName = getSafeDirName(name);
            const uris = {
                model: `${SHARED_ASSETS_DIR}${dirName}/${getFilenameFromUrl(modelUrl)}`,
                image: `${SHARED_ASSETS_DIR}${dirName}/${getFilenameFromUrl(imageUrl)}`,
                video: videoUrl ? `${SHARED_ASSETS_DIR}${dirName}/${getFilenameFromUrl(videoUrl)}` : null,
            };

            const modelExists = (await FileSystem.getInfoAsync(uris.model)).exists;
            const imageExists = (await FileSystem.getInfoAsync(uris.image)).exists;
            const videoExists = !uris.video || (await FileSystem.getInfoAsync(uris.video)).exists;

            if (modelExists && imageExists && videoExists) {
                setLocalUris(uris);
                setIsDownloaded(true);
            } else {
                setLocalUris(uris);
                setIsDownloaded(false);
            }
        };

        prepareAssets();
    }, [arData]);

    // Download handler
    const handleDownload = async () => {
        if (!arData) return;
        setIsDownloading(true);
        const { modelUrl, imageUrl, videoUrl } = arData;
        const assets = [
            { remote: modelUrl, local: localUris.model },
            { remote: imageUrl, local: localUris.image },
        ];
        if (videoUrl) assets.push({ remote: videoUrl, local: localUris.video });

        try {
            let downloaded = 0;
            for (const asset of assets) {
                const dir = asset.local.substring(0, asset.local.lastIndexOf('/'));
                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

                const downloadResumable = FileSystem.createDownloadResumable(
                    asset.remote,
                    asset.local,
                    {},
                    (p) => {
                        const progress = (downloaded + p.totalBytesWritten / p.totalBytesExpectedToWrite) / assets.length;
                        setDownloadProgress(progress);
                    }
                );
                await downloadResumable.downloadAsync();
                downloaded++;
            }
            setIsDownloaded(true);
        } catch (e) {
            console.error('Download failed:', e);
        } finally {
            setIsDownloading(false);
        }
    };

    // UI rendering
    if (isGuest) return <GuestLockOverlay />;

    if (isLoading)
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text>Loading AR content...</Text>
            </View>
        );

    if (!isDownloaded)
        return (
            <View style={styles.center}>
                {isDownloading ? (
                    <>
                        <Text>Downloading AR assets...</Text>
                        <Text>{`${(downloadProgress * 100).toFixed(0)}%`}</Text>
                    </>
                ) : (
                    <>
                        <Text>Additional assets required for this AR experience.</Text>
                        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
                            <Text style={styles.downloadText}>Download</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );

    return (
        <View style={styles.container}>
            <PinchGestureHandler
                onGestureEvent={handlePinchEvent}
                onHandlerStateChange={handlePinchStateChange}
            >
                <View style={{ flex: 1 }}>
                    <ViroARSceneNavigator
                        autofocus
                        initialScene={{ scene: DynamicARScene }}
                        worldAlignment="Gravity"
                        viroAppProps={{
                            localUris,
                            targetName: arData.name,
                            physicalWidth: arData.physicalWidth,
                            modelScale,
                        }}
                    />
                </View>
            </PinchGestureHandler>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    downloadBtn: { backgroundColor: '#007AFF', padding: 12, borderRadius: 25, marginTop: 20 },
    downloadText: { color: '#fff', fontWeight: 'bold' },
});