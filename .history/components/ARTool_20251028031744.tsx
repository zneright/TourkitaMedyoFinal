import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import * as FileSystem from 'expo-file-system';
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroAmbientLight,
  Viro3DObject,
  ViroNode,
  ViroText,
  ViroARTrackingTargets,
  ViroVideo,
  ViroARImageMarker,
} from "@reactvision/react-viro";
import { useRoute } from "@react-navigation/native";  
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import Button from "./Button";
import { SHARED_ASSETS_DIR, getFilenameFromUrl, getSafeDirName } from '../utils/fileSystems';

function ARScene({ localModelUri, localImageUri, localVideoUri, targetName, physicalWidth }) {
  useEffect(() => {
    if (!localImageUri || !targetName) return;
    ViroARTrackingTargets.createTargets({
      [targetName]: {
        source: { uri: localImageUri },
        orientation: "Up",
        physicalWidth: physicalWidth || 0.15,
        type: "Image",
      },
    });
  }, [localImageUri, targetName, physicalWidth]);

  // Pinch-to-zoom state for the model
  const MIN_SCALE = 0.02;
  const MAX_SCALE = 2.0;
  const INITIAL_SCALE = 0.1;
  const [modelScale, setModelScale] = useState<[number, number, number]>([INITIAL_SCALE, INITIAL_SCALE, INITIAL_SCALE]);
  const baseScale = useRef<number>(INITIAL_SCALE);
  // Store the scale at the start of a pinch gesture so scaleFactor is applied relative to the gesture start
  const pinchStartScale = useRef<number>(INITIAL_SCALE);
  const [lastPinch, setLastPinch] = useState<string | null>(null);

  const handlePinch = (pinchState: number, scaleFactor: number) => {
    // pinchState: 1=start, 2=move, 3=end (common values). Different versions may vary slightly.
    // We store the scale at gesture start so the scaleFactor is applied relative to start — this prevents
    // multiplying against a stale baseScale and avoids the perceived delay/jumpiness.
    // Debug: log pinch events so we can verify the event values at runtime
    try { console.log('[AR] handlePinch', { pinchState, scaleFactor, baseScale: baseScale.current, pinchStart: pinchStartScale.current }); } catch (e) { }
    // update on-screen debug text
    try { setLastPinch(`state:${pinchState} factor:${scaleFactor.toFixed(3)}`); } catch (e) { }

    if (pinchState === 1) {
      // gesture started
      pinchStartScale.current = baseScale.current;
    }

    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, pinchStartScale.current * scaleFactor));
    setModelScale([next, next, next]);

    // When gesture ends, commit the base scale
    if (pinchState === 3) {
      baseScale.current = next;
    }
  };

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" />
      {localImageUri && localModelUri && (
        <ViroARImageMarker target={targetName}>
          <ViroNode position={[0, 0, 0]} scale={modelScale} onPinch={handlePinch}>
            <Viro3DObject
              source={{ uri: localModelUri }}
              type="GLB"
              position={[0, 0, 0]}
            />
          </ViroNode>
          {localVideoUri && <ViroVideo source={{ uri: localVideoUri }} loop position={[0, 0.5, 0]} scale={[0.5, 0.28, 1]} />}
          {lastPinch && <ViroText text={lastPinch} position={[0, 0.6, 0]} style={{ fontSize: 20, color: '#FFFFFF', textAlign: 'center' }} />}
        </ViroARImageMarker>
      )}
    </ViroARScene>
  );
}

export function CameraPan() {
  const route = useRoute();
  const { arTargetId } = (route.params || {}) as any;

  const [arData, setArData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localUris, setLocalUris] = useState<any>({});

  useEffect(() => {
    const fetchArTarget = async () => {
      if (!arTargetId) { setIsLoading(false); return; }
      try {
        const docRef = doc(db, "arTargets", arTargetId);
        const docSnap = await getDoc(docRef);
        setArData(docSnap.exists() ? docSnap.data() : null);
      } catch (error) { console.error("Error fetching AR Target:", error); }
      finally { if (arData === null) setIsLoading(false); }
    };
    fetchArTarget();
  }, [arTargetId]);

  useEffect(() => {
    if (!arData) return;
    const initialize = async () => {
      const { name, modelUrl, imageUrl, videoUrl } = arData;
      const targetDirName = getSafeDirName(name);

      const uris = {
        model: `${SHARED_ASSETS_DIR}${targetDirName}/${getFilenameFromUrl(modelUrl)}`,
        image: `${SHARED_ASSETS_DIR}${targetDirName}/${getFilenameFromUrl(imageUrl)}`,
        video: videoUrl ? `${SHARED_ASSETS_DIR}${targetDirName}/${getFilenameFromUrl(videoUrl)}` : null,
      };

      const modelExists = (await FileSystem.getInfoAsync(uris.model)).exists;
      const imageExists = (await FileSystem.getInfoAsync(uris.image)).exists;
      const videoExists = !uris.video || (await FileSystem.getInfoAsync(uris.video)).exists;

      if (modelExists && imageExists && videoExists) {
        console.log('ARCam: All assets already downloaded.');
        setLocalUris(uris);
        setIsDownloaded(true);
      } else {
        setLocalUris(uris);
        setIsDownloaded(false);
      }
      setIsLoading(false);
    };
    initialize();
  }, [arData]);

  const handleDownload = async () => {
    if (!arData) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    const { modelUrl, imageUrl, videoUrl } = arData;

    try {
      const assetsToDownload = [{ remote: modelUrl, local: localUris.model }, { remote: imageUrl, local: localUris.image }];
      if (videoUrl) { assetsToDownload.push({ remote: videoUrl, local: localUris.video }); }

      let downloadedCount = 0;
      const totalFiles = assetsToDownload.length;

      for (const asset of assetsToDownload) {
        const fileDir = asset.local.substring(0, asset.local.lastIndexOf('/'));
        await FileSystem.makeDirectoryAsync(fileDir, { intermediates: true });

        const downloadResumable = FileSystem.createDownloadResumable(asset.remote, asset.local, {}, (p) => {
          const progress = (downloadedCount + (p.totalBytesWritten / p.totalBytesExpectedToWrite)) / totalFiles;
          setDownloadProgress(progress);
        });
        await downloadResumable.downloadAsync();
        downloadedCount++;
      }
      setIsDownloaded(true);
    } catch (e) { console.error("ARCam Download failed:", e); }
    finally { setIsDownloading(false); }
  };

  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /><Text style={styles.infoText}>Checking Assets...</Text></View>;
  }

  if (!arData) {
    return <View style={styles.centered}><Text style={styles.infoText}>AR content not available for: {arTargetId}</Text></View>;
  }

  if (isDownloaded) {
    return (
      <View style={styles.container}>
        <ViroARSceneNavigator autofocus viroAppProps={{ enableGestures: true }} initialScene={{ scene: () => <ARScene localModelUri={localUris.model} localImageUri={localUris.image} localVideoUri={localUris.video} targetName={arData.name} physicalWidth={arData.physicalWidth} /> }} worldAlignment="Gravity" />
        <Button />
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      {isDownloading ? (
        <>
          <Text style={styles.downloadText}>Downloading AR Assets...</Text>
          <Text style={styles.downloadText}>{`${(downloadProgress * 100).toFixed(0)}%`}</Text>
          <View style={styles.progressBarContainer}><View style={[styles.progressBar, { width: `${downloadProgress * 100}%` }]} /></View>
        </>
      ) : (
        <>
          <Text style={styles.downloadText}>Additional assets required for this AR experience.</Text>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}><Text style={styles.buttonText}>Download</Text></TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', padding: 20 },
  infoText: { marginTop: 10, color: '#666' },
  downloadText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 20 },
  downloadButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  progressBarContainer: { height: 10, width: '80%', backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#007AFF' },
});