import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import {
    ViroARScene,
    ViroARSceneNavigator,
    Viro3DObject,
    ViroNode,
    ViroText,
    ViroAmbientLight,
    ViroARImageMarker,
    ViroARTrackingTargets,
} from "@reactvision/react-viro";
import { PinchGestureHandler, State } from "react-native-gesture-handler";

function TestARScene({ arSceneNavigator }) {
    const { modelScale } = arSceneNavigator.viroAppProps;
    const [lastPinch, setLastPinch] = useState("");

    useEffect(() => {
        ViroARTrackingTargets.createTargets({
            testTarget: {
                source: {
                    uri: "https://firebasestorage.googleapis.com/v0/b/admin-login-244c5.firebasestorage.app/o/models%2Fmarkers%2F1761314136922_IMG_20180713_0001.jpg?alt=media&token=877731d7-b38d-440b-9de0-669b0e9c812a",
                },
                orientation: "Up",
                physicalWidth: 0.1,
            },
        });
    }, []);

    return (
        <ViroARScene>
            <ViroAmbientLight color="#FFFFFF" />
            <ViroARImageMarker target="testTarget">
                <ViroNode position={[0, 0, 0]} scale={modelScale}>
                    <Viro3DObject
                        source={{
                            uri: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb",
                        }}
                        type="GLB"
                        position={[0, 0, 0]}
                    />
                </ViroNode>
                <ViroText
                    text={lastPinch || "Pinch to zoom the model"}
                    position={[0, 0.2, 0]}
                    style={{ fontSize: 16, color: "#FFFFFF", textAlign: "center" }}
                />
            </ViroARImageMarker>
        </ViroARScene>
    );
}

export default function ARTestScreen() {
    const [modelScale, setModelScale] = useState<[number, number, number]>([0.1, 0.1, 0.1]);
    const baseScale = useRef(0.1);
    const pinchStartScale = useRef(0.1);

    const handlePinchEvent = (event: any) => {
        const { scale } = event.nativeEvent;
        const next = Math.max(0.02, Math.min(2.0, pinchStartScale.current * scale));
        setModelScale([next, next, next]);
    };

    const handlePinchStateChange = (event: any) => {
        if (event.nativeEvent.state === State.BEGAN) {
            pinchStartScale.current = baseScale.current;
        } else if (event.nativeEvent.state === State.END) {
            baseScale.current = modelScale[0];
        }
    };

    return (
        <View style={styles.container}>
            <PinchGestureHandler
                onGestureEvent={handlePinchEvent}
                onHandlerStateChange={handlePinchStateChange}
            >
                <View style={{ flex: 1 }}>
                    <ViroARSceneNavigator
                        autofocus
                        initialScene={{ scene: TestARScene }}
                        worldAlignment="Gravity"
                        viroAppProps={{ modelScale }}
                    />
                </View>
            </PinchGestureHandler>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000" },
});
