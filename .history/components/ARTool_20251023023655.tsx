import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import {
  ViroARScene,
  ViroARSceneNavigator,
  ViroAmbientLight,
  Viro3DObject,
  ViroNode,
  ViroARTrackingTargets,
  ViroVideo,
  ViroARImageMarker,
} from "@reactvision/react-viro";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Button from "./Button";
import { useRoute } from "@react-navigation/native";
function ARScene({ modelUrl, imageUrl, videoUrl, title }) {
  const [videoPosition, setVideoPosition] = useState([0, 1, -1]);
  const [videoScale, setVideoScale] = useState([1, 1, 1]);
  useEffect(() => {
    if (!imageUrl) return;


    ViroARTrackingTargets.createTargets({
      [title || "defaultTarget"]: {
        source: { uri: imageUrl },
        orientation: "Up",
        physicalWidth: 0.157,
        type: "Image",
      },
    });


    const timer = setTimeout(() => {
      setVideoPosition([0, 1.5, -1]);
      setVideoScale([2, 1, 1]);
    }, 5000);

    return () => clearTimeout(timer);
  }, [imageUrl, title]);

  return (
    <ViroARScene>
      <ViroAmbientLight color="#FFFFFF" />

      {imageUrl && modelUrl && (
        <ViroARImageMarker target={title || "defaultTarget"}>
          <Viro3DObject
            source={{ uri: modelUrl }}
            type="GLB"
            position={[0, -1, -1]}
          />

          {videoUrl && (
            <ViroVideo
              source={{ uri: videoUrl }}
              loop
              position={videoPosition}
              scale={videoScale}
            />
          )}
        </ViroARImageMarker>
      )}
    </ViroARScene>
  );
}


export function CameraPan() {
  const route = useRoute();
  const { modelUrl, imageUrl, videoUrl, title } = route.params || {};
  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        autofocus
        initialScene={{
          scene: () => (
            <ARScene
              modelUrl={modelUrl}
              imageUrl={imageUrl}
              videoUrl={videoUrl}
              title={title}
            />
          ),
        }}
        worldAlignment="Gravity"
      />
      <Button />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});