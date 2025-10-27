// screens/IntroductionScreen.js

import React, { useState, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types'; // Make sure this path is correct

const { width, height } = Dimensions.get('window');

// Define the content for each slide
const slides = [
    {
        key: '1',
        title: 'Welcome to Tourkita!',
        text: 'Your personal guide to exploring the rich history and culture of Intramuros, the Walled City.',
        image: require('../assets/TourkitaLogo.jpg'), // Replace with a relevant image
    },
    {
        key: '2',
        title: 'Discover Intramuros',
        text: 'Learn about the historical landmarks, churches, and museums managed by the Intramuros Administration (IA).',
        image: require('../assets/intramuros_image.jpg'), // Replace with a relevant image
    },
    {
        key: '3',
        title: 'Augmented Reality',
        text: 'Bring history to life! Point your camera at landmarks to see historical information and 3D models.',
        image: require('../assets/ar_feature.jpg'), // Replace with a relevant image
    },
    {
        key: '4',
        title: 'Geolocation Navigation',
        text: 'Never get lost. Our smart map will guide you to all the must-see spots within the walls.',
        image: require('../assets/map_feature.jpg'), // Replace with a relevant image
    },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Introduction'>;

const IntroductionScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(slideIndex);
    };

    const handleGetStarted = () => {
        // Use replace so the user can't go back to the intro screen
        navigation.replace('Maps');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
            >
                {slides.map((slide) => (
                    <View key={slide.key} style={styles.slide}>
                        <Image source={slide.image} style={styles.image} resizeMode="contain" />
                        <Text style={styles.title}>{slide.title}</Text>
                        <Text style={styles.text}>{slide.text}</Text>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.pagination}>
                {slides.map((_, index) => (
                    <View
                        key={index}
                        style={[styles.dot, index === activeIndex ? styles.activeDot : {}]}
                    />
                ))}
            </View>

            {activeIndex === slides.length - 1 && (
                <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
                    <Text style={styles.buttonText}>Get Started</Text>
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    slide: {
        width: width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    image: {
        width: width * 0.7,
        height: height * 0.3,
        marginBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#603F26',
        marginBottom: 16,
        textAlign: 'center',
    },
    text: {
        fontSize: 16,
        color: '#6B5E5E',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 120,
        alignSelf: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D3D3D3',
        marginHorizontal: 8,
    },
    activeDot: {
        backgroundColor: '#603F26',
    },
    button: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: '#603F26',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default IntroductionScreen;