import React, { useEffect, useState, useMemo } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import { getAuth } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import TopHeader from '../components/TopHeader';
import SkeletonBox from '../components/Skeleton';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Maps'>;

export default function ViewProfileScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.navigate('Profile');
            return true;
        });

        const unsubscribe = navigation.addListener('focus', fetchUserData);

        return () => {
            backHandler.remove();
            unsubscribe();
        };
    }, [navigation]);

    const fetchUserData = async () => {
        try {
            const cached = await AsyncStorage.getItem('cachedUserData');
            if (cached) {
                setUserData(JSON.parse(cached));
                setLoading(false);
            }
        } catch (cacheError) {
            console.error('Error reading from cache:', cacheError);
        }

        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser?.email) throw new Error("No user found");

            const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data();
                await AsyncStorage.setItem('cachedUserData', JSON.stringify(data));
            } else {
                throw new Error("User not found in Firestore.");
            }
        } catch (error) {
            console.error('Error fetching from Firestore:', error);

            if (!userData) setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const fullName = useMemo(() => {
        if (!userData) return '';
        const nameParts = [];
        if (userData.firstName) nameParts.push(userData.firstName);
        if (userData.middleInitial) nameParts.push(`${userData.middleInitial}.`);
        if (userData.lastName) nameParts.push(userData.lastName);
        return nameParts.join(' ');
    }, [userData]);


    const getInitials = () => {
        if (!userData) return '';
        let initials = userData.firstName?.[0] || '';
        if (userData.lastName) initials += userData.lastName[0];
        return initials.toUpperCase();
    };

    const profileFields = userData ? [
        { icon: 'person-outline', label: 'Full Name', value: fullName },
        { icon: 'calendar-outline', label: 'Age', value: userData.age?.toString() || '-' },
        { icon: 'call-outline', label: 'Contact Number', value: userData.contactNumber || '-' },
        { icon: 'briefcase-outline', label: 'User Type', value: userData.userType || '-' },
        { icon: 'male-female-outline', label: 'Gender', value: userData.gender || '-' },
        { icon: 'mail-outline', label: 'Email', value: userData.email || '-' },
    ] : [];

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader
                title="Profile"
                onBackPress={() => navigation.navigate("Profile")}
                onSupportPress={() => navigation.navigate('Support')}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerCard}>
                    <View style={styles.avatarContainer}>
                        {loading && !userData ? (
                            <SkeletonBox width={100} height={100} borderRadius={50} />
                        ) : userData?.profileImage ? (
                            <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.profilePlaceholder}>
                                <Text style={styles.initials}>{getInitials()}</Text>
                            </View>
                        )}
                    </View>
                    {loading && !userData ? (
                        <View style={{ alignItems: 'center' }}>
                            <SkeletonBox width={200} height={28} style={{ marginVertical: 8 }} />
                            <SkeletonBox width={150} height={20} />
                        </View>
                    ) : (
                        <>
                            <Text style={styles.name}>{fullName}</Text>
                            <Text style={styles.email}>{userData?.email}</Text>
                        </>
                    )}
                </View>

                <View style={styles.infoCard}>
                    {loading && !userData
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonBox key={i} width="100%" height={50} style={{ marginBottom: 16 }} />
                        ))
                        : profileFields.map((item, idx) => (
                            <View key={idx} style={styles.infoRow}>
                                <Ionicons name={item.icon as any} size={24} color="#8D6E63" />
                                <View style={styles.infoTextContainer}>
                                    <Text style={styles.fieldLabel}>{item.label}</Text>
                                    <Text style={styles.fieldValue}>{item.value}</Text>
                                </View>
                            </View>
                        ))}
                </View>

                {(!loading || userData) && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <Ionicons name="pencil-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F4EF' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    avatarContainer: {
        marginBottom: 12,
    },
    profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#EFEBE9' },
    profilePlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#6D4C41',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#EFEBE9'
    },
    initials: { fontSize: 32, color: '#FFF', fontWeight: 'bold' },
    name: { fontSize: 24, fontWeight: 'bold', color: '#4E342E', textAlign: 'center' },
    email: { fontSize: 16, color: '#A1887F', marginTop: 4 },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    infoRowLast: {
        borderBottomWidth: 0,
    },
    infoTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    fieldLabel: { fontSize: 13, color: '#A1887F' },
    fieldValue: { fontSize: 16, color: '#4E342E', fontWeight: '600' },
    editButton: {
        flexDirection: 'row',
        backgroundColor: '#493628',
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
    },
    editButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});