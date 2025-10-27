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
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather for icons

const { width, height } = Dimensions.get('window');

// Define the content for each slide using URLs
const slides = [
    {
        key: '1',
        title: 'Welcome to Tourkita!',
        text: 'Your personal guide to exploring the rich history and culture of Intramuros, the Walled City.',
        image: { uri: 'https://firebasestorage.googleapis.com/v0/b/tourkita-mvp.appspot.com/o/logo%2FTourkitaLogo.png?alt=media&token=25f47970-3023-4f51-b850-2527b1b13b9c' },
    },
    {
        key: '2',
        title: 'Discover Intramuros',
        text: 'Learn about historical landmarks and museums managed by the Intramuros Administration (IA).',
        image: { uri: 'https://images.pexels.com/photos/10757913/pexels-photo-10757913.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
    {
        key: '3',
        title: 'Augmented Reality',
        text: 'Bring history to life! Point your camera at landmarks to see historical information and 3D models.',
        image: { uri: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
    {
        key: '4',
        title: 'Geolocation Navigation',
        text: 'Never get lost. Our smart map will guide you to all the must-see spots within the walls.',
        image: { uri: 'https://images.pexels.com/photos/5926365/pexels-photo-5926365.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
    },
    {
        key: 'feedback', // Special key for the feedback slide
        title: 'Enjoying Tourkita?',
        text: 'Your feedback helps us improve. Please take a moment to rate your experience.',
    },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Introduction'>;

// --- Helper Components ---

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
                <ActivityIndicator style={StyleSheet.absoluteFill} size="large" color="#603F26" />
            )}
        </View>
    );
};

const StarRating = ({ rating, setRating }) => {
    return (
        <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Icon
                        name="star"
                        size={40}
                        color={star <= rating ? '#FFC107' : '#E0E0E0'}
                        style={styles.star}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};


// --- Main Screen Component ---

const IntroductionScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [activeIndex, setActiveIndex] = useState(0);
    const [rating, setRating] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const handleFinish = () => {
        // Here, you would typically save the feedback to Firestore
        console.log(`User feedback received: ${rating} stars`);
        navigation.replace('Maps');
    };

    const handleSkip = () => {
        navigation.replace('Maps');
    };

    const handleNext = () => {
        if (activeIndex < slides.length - 1) {
            scrollViewRef.current?.scrollTo({ x: width * (activeIndex + 1), animated: true });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <ScrollView
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
                {slides.map((slide) => {
                    if (slide.key === 'feedback') {
                        return ( // Render feedback slide
                            <View key={slide.key} style={styles.slide}>
                                <View style={styles.textContainer}>
                                    <Text style={styles.title}>{slide.title}</Text>
                                    <Text style={styles.text}>{slide.text}</Text>
                                    <StarRating rating={rating} setRating={setRating} />
                                </View>
                            </View>
                        );
                    }
                    return ( // Render normal slides
                        <View key={slide.key} style={styles.slide}>
                            <SlideImage source={slide.image} />
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{slide.title}</Text>
                                <Text style={styles.text}>{slide.text}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            <View style={styles.bottomContainer}>
                {/* Pagination Dots */}
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
                        return <Animated.View key={index} style={[styles.dot, { width: dotWidth, opacity }]} />;
                    })}
                </View>

                {/* Next / Finish Button */}
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
        backgroundColor: '#F5F5F5', // Lighter background
    },
    slide: {
        width: width,
        height: height,
        alignItems: 'center',
        justifyContent: 'flex-start', // Align to top
        paddingTop: height * 0.1, // Push content down a bit
    },
    imageContainer: {
        width: width,
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '80%',
        height: '80%',
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
    starContainer: {
        flexDirection: 'row',
        marginTop: 40,
    },
    star: {
        marginHorizontal: 8,
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