import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    ScrollView,
    BackHandler,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getAuth, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import TopHeader from '../components/TopHeader';
import BottomFooter from '../components/BottomFooter';
import { useUser } from '../context/UserContext';
import { setActiveStatus } from '../components/helper';
import GuestLockOverlay from '../components/guestLockOverlay';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [name, setName] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string>('');
    const { isGuest } = useUser();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This is a navigation screen, so focus event is more reliable for updates
        const unsubscribe = navigation.addListener('focus', () => {
            fetchUserData();
        });

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

        return () => {
            unsubscribe();
            backHandler.remove();
        };
    }, [navigation, isGuest]);

    const fetchUserData = async () => {
        if (isGuest) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const docRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();

                const nameParts = [];
                if (data.firstName) nameParts.push(data.firstName);
                if (data.middleInitial) nameParts.push(`${data.middleInitial}.`);
                if (data.lastName) nameParts.push(data.lastName);

                setName(nameParts.join(' '));
                setProfileImage(data.profileImage || '');
            }
        } catch (err) {
            console.error(err);
            setName('Error loading name');
        } finally {
            setLoading(false);
        }
    };

    const handleLogOut = () => {
        Alert.alert(
            'Log Out', 'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        if (auth.currentUser) await setActiveStatus(auth.currentUser.uid, false);
                        await signOut(getAuth());
                        await AsyncStorage.clear();
                        navigation.replace('Login');
                    },
                },
            ]
        );
    };

    const renderMenuItem = (icon: any, label: string, onPress?: () => void, danger?: boolean) => (
        <TouchableOpacity
            key={label}
            style={styles.menuItem}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons name={icon} size={22} color={danger ? '#D32F2F' : '#8D6E63'} />
            <Text style={[styles.menuText, danger && styles.dangerText]}>{label}</Text>
            {!danger && <Ionicons name="chevron-forward-outline" size={20} color="#C7C7CD" />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Profile" onSupportPress={() => navigation.navigate('Support')} />
            {isGuest && <GuestLockOverlay />}

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Profile Header Card */}
                <View style={styles.headerCard}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#6D4C41" />
                    ) : (
                        <>
                            <View style={styles.avatarContainer}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                                ) : (
                                    <View style={styles.profilePlaceholder}>
                                        <Text style={styles.initials}>
                                            {name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.username}>{isGuest ? 'Guest User' : name}</Text>
                            <Text style={styles.userRole}>{isGuest ? 'Limited Access' : 'Registered User'}</Text>
                        </>
                    )}
                </View>

                {/* Menu Sections */}
                <View style={styles.menuCard}>
                    <Text style={styles.sectionTitle}>ACCOUNT</Text>
                    {renderMenuItem('person-circle-outline', 'View Profile', () => navigation.navigate('ViewProfile'))}
                    {renderMenuItem('lock-closed-outline', 'Change Password', () => navigation.navigate('ChangePassword'))}
                </View>

                <View style={styles.menuCard}>
                    <Text style={styles.sectionTitle}>POLICIES & SUPPORT</Text>
                    {renderMenuItem('document-text-outline', 'Terms and Privacy', () => navigation.navigate('Terms'))}
                    {renderMenuItem('help-buoy-outline', 'FAQ', () => navigation.navigate('FAQScreen'))}
                </View>

                <View style={styles.menuCard}>
                    <Text style={styles.sectionTitle}>ACTIONS</Text>
                    {renderMenuItem('trash-outline', 'Delete Account', () => navigation.navigate('DeleteAccount'), true)}
                    {renderMenuItem('log-out-outline', 'Log Out', handleLogOut, true)}
                </View>
            </ScrollView>

            <BottomFooter active="Profile" />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F4EF' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    avatarContainer: {
        marginBottom: 12,
    },
    profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FFFFFF' },
    profilePlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#6D4C41',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#FFFFFF',
    },
    initials: { fontSize: 32, color: '#FFF', fontWeight: 'bold' },
    username: { fontSize: 24, fontWeight: 'bold', color: '#4E342E' },
    userRole: { fontSize: 14, color: '#A1887F', marginTop: 4 },
    menuCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A1887F',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: '#4E342E',
        marginLeft: 16,
    },
    dangerText: {
        color: '#D32F2F',
    },
});

export default ProfileScreen;