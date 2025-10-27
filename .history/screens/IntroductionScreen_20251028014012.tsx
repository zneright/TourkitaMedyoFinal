import React, { useState, useRef } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import LottieView from 'lottie-react-native'; // Import LottieView

const { width, height } = Dimensions.get('window');

// Define the content for each slide, now pointing to Lottie JSON files
const slides = [
    {
        key: '1',
        title: 'Welcome to Tourkita!',
        text: 'Your personal guide to exploring the rich history and culture of Intramuros, the Walled City.',
        animation: require('../assets/animations/welcome.json'), // Replace with your animation file
    },
    {
        key: '2',
        title: 'Discover Intramuros',
        text: 'Learn about historical landmarks and museums managed by the Intramuros Administration (IA).',
        animation: require('../assets/animations/map.json'), // Replace with your animation file
    },
    {
        key: '3',
        title: 'Augmented Reality',
        text: 'Bring history to life! Point your camera at landmarks to see historical information and 3D models.',
        animation: require('../assets/animations/ar_scan.json'), // Replace with your animation file
    },
    {
        key: '4',
        title: 'Geolocation Navigation',
        text: 'Never get lost. Our smart map will guide you to all the must-see spots within the walls.',
        animation: require('../assets/animations/navigation.json'), // Replace with your animation file
    },
    {
        key: '5',
        title: 'Share Your Thoughts',
        text: 'Help us improve your journey. You can provide feedback on landmarks and your overall experience directly in the app.',
        animation: require('../assets/animations/feedback.json'), // Replace with your animation file
    },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Introduction'>;

// New component to render the Lottie animation
const SlideAnimation = ({ source }: { source: any }) => {
    return (
        <View style={styles.animationContainer}>
            <LottieView
                source={source}
                autoPlay
                loop
                style={styles.lottie}
            />
        </View>
    );
};

const IntroductionScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const handleFinish = () => {
        navigation.replace('Maps');
    };

    const handleSkip = () => {
        navigation.replace('Maps');
    };

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
                        <SlideAnimation source={slide.animation} />
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
    // Updated styles for animation
    animationContainer: {
        width: width,
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lottie: {
        width: width * 0.8,
        height: width * 0.8,
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