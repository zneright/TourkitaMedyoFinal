import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
import Button from '../components/Button';

export default function View3D({ route }) {
    const { modelUrl, title } = route?.params || {}; 

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title || "3D Viewer"}</Text> 
            <FilamentScene>
                <Scene modelUrl={modelUrl} />
                <Button />
            </FilamentScene>
        </View>
    );
}

function Scene({ modelUrl }) {
    const cameraManipulator = useCameraManipulator({
        orbitHomePosition: [0, 0, 8],
        targetPosition: [0, 0, 0],
        orbitSpeed: [0.003, 0.003],
    });

    const viewHeight = Dimensions.get('window').height;
    const previousScale = useSharedValue(1);
    const scaleMultiplier = 100;

    // 🟢 Panning gesture (for rotation)
    const panGesture = Gesture.Pan()
        .onBegin((event) => {
            const yCorrected = viewHeight - event.translationY;
            cameraManipulator?.grabBegin(event.translationX, yCorrected, false);
        })
        .onUpdate((event) => {
            const yCorrected = viewHeight - event.translationY;
            cameraManipulator?.grabUpdate(event.translationX, yCorrected);
        })
        .maxPointers(1)
        .onEnd(() => {
            cameraManipulator?.grabEnd();
        });

    // 🟢 Pinch gesture (for zoom)
    const pinchGesture = Gesture.Pinch()
        .onBegin(({ scale }) => {
            previousScale.value = scale;
        })
        .onUpdate(({ scale, focalX, focalY }) => {
            const delta = scale - previousScale.value;
            cameraManipulator?.scroll(focalX, focalY, -delta * scaleMultiplier);
            previousScale.value = scale;
        });

    // 🟢 Combine both gestures
    const combinedGesture = Gesture.Race(pinchGesture, panGesture);
    if (!modelUrl) {
        return (
            <View style={[styles.modelView, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#999' }}>No 3D model available.</Text>
            </View>
        );
    }

    return (
        <GestureDetector gesture={combinedGesture}>
            <FilamentView style={styles.modelView}>
                <Camera cameraManipulator={cameraManipulator} />
                <DefaultLight />
                <Model source={{ uri: modelUrl }} transformToUnitCube />
            </FilamentView>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F4EF',
        paddingTop: 30,
        alignItems: 'center',
    },
    modelView: {
        width: '100%',
        height: 500,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4E342E',
        marginBottom: 10,
    },
});
