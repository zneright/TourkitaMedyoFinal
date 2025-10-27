import React, { useState, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Image, // Import Image component
    ScrollView,
    Dimensions,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

// Updated slides array to mix images and animations
const slides = [
    {
        key: '1',
        title: 'Welcome to Tourkita!',
        text: 'Your personal guide to exploring the rich history and culture of Intramuros, the Walled City.',
        // Using a static image for the logo
        image: require('../assets/TourkitaLogo.jpg'),
    },
    {
        key: '2',
        title: 'Discover Intramuros',
        text: 'Learn about historical landmarks and museums managed by the Intramuros Administration (IA).',
        // Using a static image for the map
        image: { uri: 'https://intramuros.gov.ph/wp-content/uploads/2021/07/Intramuros-Visitors-Map-scaled.jpg' },
    },
    {
        key: '3',
        title: 'Augmented Reality',
        text: 'Bring history to life! Point your camera at landmarks to see historical information and 3D models.',
        animation: { uri: 'https://lottie.host/6afca818-fd46-43db-988a-7ec6d492e15b/CJv1kZx33z.lottie' },
    },
    {
        key: '4',
        title: 'Geolocation Navigation',
        text: 'Never get lost. Our smart map will guide you to all the must-see spots within the walls.',
        animation: { uri: 'https://lottie.host/9f635c9a-0e9a-4e8c-843f-561b7f08e42e/jB3n5s6C5D.json' },
    },
    {
        key: '5',
        title: 'Share Your Thoughts',
        text: 'Help us improve your journey. You can provide feedback on landmarks and your overall experience directly in the app.',
        animation: { uri: 'https://lottie.host/2a553f1f-0e10-44d4-9f7e-d316a3c10397/h3uG33gI2E.json' },
    },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Introduction'>;

// Component for Lottie Animations
const SlideAnimation = ({ source }: { source: { uri: string } }) => {
    const [loading, setLoading] = useState(true);
    return (
        <View style={styles.mediaContainer}>
            <LottieView
                source={source}
                autoPlay
                loop
                style={styles.media}
                onAnimationLoaded={() => setLoading(false)}
            />
            {loading && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#603F26" />}
        </View>
    );
};

// Component for Static Images
const SlideImage = ({ source }: { source: any }) => {
    const [loading, setLoading] = useState(true);
    return (
        <View style={styles.mediaContainer}>
            <Image
                source={source}
                style={styles.media}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
            />
            {loading && <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#603F26" />}
        </View>
    );
};

const IntroductionScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const handleFinish = () => navigation.replace('Maps');
    const handleSkip = () => navigation.replace('Maps');

    const handleNext = () => {
        if (scrollViewRef.current && activeIndex < slides.length - 1) {
            scrollViewRef.current.scrollTo({ x: width * (activeIndex + 1), animated: true });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                    useNativeDriver: false,
                    listener: (event) => {
                        const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                        setActiveIndex(slideIndex);
                    }
                })}
            >
                {slides.map((slide) => (
                    <View key={slide.key} style={styles.slide}>
                        {/* --- CONDITIONAL RENDERING LOGIC --- */}
                        {slide.animation && <SlideAnimation source={slide.animation} />}
                        {slide.image && <SlideImage source={slide.image} />}

                        <View style={styles.textContainer}>
                            <Text style={styles.title}>{slide.title}</Text>
                            <Text style={styles.text}>{slide.text}</Text>
                        </View>
                    </View>
                ))}
            </Animated.ScrollView>

            <View style={styles.bottomContainer}>
                <View style={styles.pagination}>
                    {slides.map((_, index) => {
                        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });
                        return <Animated.View key={index.toString()} style={[styles.dot, { width: dotWidth, opacity }]} />;
                    })}
                </View>

                {activeIndex === slides.length - 1 ? (
                    <TouchableOpacity style={styles.button} onPress={handleFinish}>
                        <Text style={styles.buttonText}>Finish</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.button} onPress={handleNext}>
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    slide: {
        width: width,
        height: height,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: height * 0.1,
    },
    // Unified container for both images and animations
    mediaContainer: {
        width: width,
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Unified style for both image and lottie components
    media: {
        width: width * 0.8,
        height: '100%',
    },
    textContainer: {
        width: width,
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 26,
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
        lineHeight: 24,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#603F26',
        marginHorizontal: 4,
    },
    button: {
        backgroundColor: '#603F26',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 30,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 30,
        zIndex: 10,
    },
    skipText: {
        color: '#603F26',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default IntroductionScreen;