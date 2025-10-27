import React, { useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types'; // Make sure this path is correct

const { width, height } = Dimensions.get('window');

// Define the content for each slide using URLs
const slides = [
    {
        key: '1',
        title: 'Welcome to Tourkita!',
        text: 'Your personal guide to exploring the rich history and culture of Intramuros, the Walled City.',
        // Replace with your actual logo URL from Firebase Storage or another service
        image: { uri: 'https://firebasestorage.googleapis.com/v0/b/tourkita-mvp.appspot.com/o/logo%2FTourkitaLogo.png?alt=media&token=25f47970-3023-4f51-b850-2527b1b13b9c' },
    },
    {
        key: '2',
        title: 'Discover Intramuros',
        text: 'Learn about the historical landmarks, churches, and museums managed by the Intramuros Administration (IA).',
        // Example image URL
        image: { uri: 'https://images.pexels.com/photos/10757913/pexels-photo-10757913.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
    {
        key: '3',
        title: 'Augmented Reality',
        text: 'Bring history to life! Point your camera at landmarks to see historical information and 3D models.',
        // Example image URL
        image: { uri: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
    {
        key: '4',
        title: 'Geolocation Navigation',
        text: 'Never get lost. Our smart map will guide you to all the must-see spots within the walls.',
        // Example image URL
        image: { uri: 'https://images.pexels.com/photos/5926365/pexels-photo-5926365.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Introduction'>;

// A small component to handle image loading state
const SlideImage = ({ source }: { source: { uri: string } }) => {
    const [loading, setLoading] = useState(true);
    return (
        <View style={styles.imageContainer}>
            <Image
                source={source}
                style={styles.image}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
            />
            {loading && (
                <ActivityIndicator
                    style={StyleSheet.absoluteFill}
                    size="large"
                    color="#603F26"
                />
            )}
        </View>
    );
};


const IntroductionScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [activeIndex, setActiveIndex] = useState(0);

    const handleScroll = (event: any) => {
        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
        setActiveIndex(slideIndex);
    };

    const handleGetStarted = () => {
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
                        <SlideImage source={slide.image} />
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
    imageContainer: { // Added to contain the image and activity indicator
        width: width * 0.7,
        height: height * 0.3,
        marginBottom: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
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