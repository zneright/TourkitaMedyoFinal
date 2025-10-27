import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    BackHandler,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../Navigation/types';
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import TopHeader from '../components/TopHeader';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CLOUDINARY_UPLOAD_PRESET = "profile";
const CLOUDINARY_CLOUD_NAME = "dupjdmjha";

export default function EditProfileScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [password, setPassword] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [userRef, setUserRef] = useState<any>(null);

    const [formData, setFormData] = useState({
        firstName: "",
        middleInitial: "",
        lastName: "",
        contactNumber: "",
        age: "",
        userType: "",
        gender: "",
    });
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });
        return () => backHandler.remove();
    }, [navigation]);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const auth = getAuth();
                const currentUser = auth.currentUser;
                if (!currentUser?.email) throw new Error("No user found");

                const q = query(collection(db, "users"), where("email", "==", currentUser.email));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    setUserRef(userDoc.ref);
                    const data = userDoc.data();
                    setFormData({
                        firstName: data.firstName || "",
                        middleInitial: data.middleInitial || "",
                        lastName: data.lastName || "",
                        contactNumber: data.contactNumber || "",
                        age: data.age?.toString() || "",
                        userType: data.userType || "",
                        gender: data.gender || "",
                    });
                    setProfileImage(data.profileImage || null);
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const getInitials = () => {
        const { firstName, lastName } = formData;
        if (!firstName) return '';
        let initials = firstName[0];
        if (lastName) initials += lastName[0];
        return initials.toUpperCase();
    };

    const handleInputChange = (field: string, value: string) => {
        let processedValue = value;
        // Apply real-time filtering based on the field
        if (field === 'firstName' || field === 'lastName') {
            processedValue = value.replace(/[^a-zA-Z-' ]/g, '');
        } else if (field === 'middleInitial') {
            processedValue = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        } else if (field === 'contactNumber' || field === 'age') {
            processedValue = value.replace(/[^0-9]/g, '');
        }

        setFormData(prev => ({ ...prev, [field]: processedValue }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string | null } = {};
        const { firstName, lastName, middleInitial, contactNumber, age } = formData;

        const nameRegex = /^[a-zA-Z-' ]+$/;
        if (!firstName.trim()) newErrors.firstName = "First Name is required.";
        else if (!nameRegex.test(firstName)) newErrors.firstName = "First Name contains invalid characters.";

        if (!lastName.trim()) newErrors.lastName = "Last Name is required.";
        else if (!nameRegex.test(lastName)) newErrors.lastName = "Last Name contains invalid characters.";

        if (middleInitial.trim() && !/^[A-Z]+$/i.test(middleInitial)) {
            newErrors.middleInitial = "M.I. must only contain letters.";
        }

        const ageNum = Number(age);
        if (!age.trim()) newErrors.age = "Age is required.";
        else if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) newErrors.age = "Age must be between 18 and 100.";

        const contactRegex = /^09\d{9}$/;
        if (!contactNumber.trim()) newErrors.contactNumber = "Contact number is required.";
        else if (!contactRegex.test(contactNumber)) newErrors.contactNumber = "Must be a valid 11-digit number starting with 09.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "We need camera roll permissions to make this work!");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const uploadToCloudinary = async (uri: string) => {
        setUploading(true);
        try {
            const data = new FormData();
            data.append("file", { uri, type: "image/jpeg", name: "profile.jpg" } as any);
            data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: data,
            });

            const json = await response.json();
            return json.secure_url;
        } catch (error) {
            console.error("Cloudinary upload failed:", error);
            Alert.alert("Upload Error", "Failed to upload image.");
            return null;
        } finally {
            setUploading(false);
        }
    };

    const saveChanges = async () => {
        if (!userRef) {
            Alert.alert("Error", "User reference not found. Please try again.");
            return;
        }

        setLoading(true);
        try {
            let finalProfileImage = profileImage;
            if (profileImage && !profileImage.startsWith("https://")) {
                const uploadedUrl = await uploadToCloudinary(profileImage);
                if (!uploadedUrl) {
                    setLoading(false);
                    return;
                }
                finalProfileImage = uploadedUrl;
            }

            await updateDoc(userRef, {
                ...formData,
                age: parseInt(formData.age, 10),
                profileImage: finalProfileImage,
            });

            Alert.alert("Success", "Profile updated successfully.");
            navigation.navigate("ViewProfile");
        } catch (error) {
            console.error("Failed to save changes:", error);
            Alert.alert("Error", "Failed to save changes.");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePress = () => {
        if (validateForm()) {
            setModalVisible(true);
        } else {
            Alert.alert("Invalid Information", "Please correct the errors before saving.");
        }
    };


    const reauthenticateAndSave = async () => {
        setModalVisible(false);
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser?.email && password) {
            setLoading(true);
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            try {
                await reauthenticateWithCredential(currentUser, credential);
                await saveChanges();
            } catch (error) {
                Alert.alert("Authentication Failed", "Incorrect password. Please try again.");
            } finally {
                setPassword('');
                setLoading(false);
            }
        } else {
            Alert.alert("Error", "Password cannot be empty.");
        }
    };

    if (loading && !modalVisible) {
        return (
            <SafeAreaView style={styles.container}>
                <TopHeader title="Edit Profile" showBackButton />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#6D4C41" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <TopHeader title="Edit Profile" onBackPress={() => navigation.goBack()} />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={uploading}>
                        {profileImage ? (
                            <Image source={{ uri: profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.profilePlaceholder}>
                                <Text style={styles.initials}>{getInitials()}</Text>
                            </View>
                        )}
                        <View style={styles.cameraIcon}>
                            <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                        </View>
                        {uploading && <View style={styles.uploadOverlay}><ActivityIndicator size="large" color="#FFFFFF" /></View>}
                    </TouchableOpacity>
                </View>

                <View style={styles.formCard}>
                    <FormInput icon="person-outline" label="First Name" value={formData.firstName} onChange={(v) => handleInputChange("firstName", v)} error={errors.firstName} />
                    <FormInput icon="person-outline" label="Middle Initial" value={formData.middleInitial} onChange={(v) => handleInputChange("middleInitial", v)} maxLength={1} error={errors.middleInitial} />
                    <FormInput icon="person-outline" label="Last Name" value={formData.lastName} onChange={(v) => handleInputChange("lastName", v)} error={errors.lastName} />
                    <FormInput icon="call-outline" label="Contact Number" value={formData.contactNumber} onChange={(v) => handleInputChange("contactNumber", v)} keyboardType="phone-pad" maxLength={11} error={errors.contactNumber} />
                    <FormInput icon="calendar-outline" label="Age" value={formData.age} onChange={(v) => handleInputChange("age", v)} keyboardType="numeric" maxLength={3} error={errors.age} />
                    <FormPicker icon="briefcase-outline" label="User Type" value={formData.userType} onValueChange={(v) => handleInputChange("userType", v)} items={[{ label: "Student", value: "Student" }, { label: "Tourist", value: "Tourist" }, { label: "Local", value: "Local" }, { label: "Foreign National", value: "Foreign National" }, { label: "Researcher", value: "Researcher" }]} />
                    <FormPicker icon="male-female-outline" label="Gender" value={formData.gender} onValueChange={(v) => handleInputChange("gender", v)} items={[{ label: "Male", value: "Male" }, { label: "Female", value: "Female" }, { label: "Non-Binary", value: "Non-Binary" }, { label: "Prefer Not to Say", value: "Prefer Not to Say" }]} />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleSavePress} disabled={loading || uploading}>
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="save-outline" size={20} color="#FFFFFF" /><Text style={styles.saveButtonText}>Save Changes</Text></>}
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirm Your Identity</Text>
                        <Text style={styles.modalSubtitle}>Please enter your password to save changes.</Text>
                        <TextInput style={styles.modalInput} placeholder="Enter your password" placeholderTextColor="#A1887F" value={password} onChangeText={setPassword} secureTextEntry />
                        <TouchableOpacity style={styles.modalButton} onPress={reauthenticateAndSave}>
                            <Text style={styles.modalButtonText}>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

// Reusable Form Components
const FormInput = ({ icon, label, value, onChange, error, ...props }) => (
    <View style={styles.inputWrapper}>
        <View style={[styles.formGroup, error ? styles.errorBorder : {}]}>
            <Ionicons name={icon as any} size={22} color="#A1887F" style={styles.inputIcon} />
            <View style={styles.inputContainer}>
                <Text style={styles.label}>{label}</Text>
                <TextInput style={styles.input} placeholderTextColor="#A5A5A5" value={value} onChangeText={onChange} {...props} />
            </View>
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

const FormPicker = ({ icon, label, value, onValueChange, items }) => (
    <View style={styles.formGroup}>
        <Ionicons name={icon as any} size={22} color="#A1887F" style={styles.inputIcon} />
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <RNPickerSelect onValueChange={onValueChange} value={value} items={items} style={{ inputIOS: styles.pickerInput, inputAndroid: styles.pickerInput, iconContainer: styles.pickerIconContainer }} useNativeAndroidPickerStyle={false} Icon={() => <Ionicons name="chevron-down" size={20} color="#8D6E63" />} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9F4EF" },
    scrollContent: { padding: 16, paddingBottom: 100 },
    avatarSection: { alignItems: 'center', marginVertical: 20 },
    avatarContainer: { position: 'relative' },
    profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFFFFF' },
    profilePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#6D4C41', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
    initials: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
    cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6D4C41', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF' },
    uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: 60 },
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    inputWrapper: {
        marginBottom: 8,
    },
    formGroup: { flexDirection: 'row', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingVertical: 12 },
    inputIcon: { marginRight: 16, marginTop: 18 },
    inputContainer: { flex: 1 },
    label: { fontSize: 13, color: '#A1887F', marginBottom: 4 },
    input: { height: 30, fontSize: 16, color: '#4E342E', paddingVertical: 0 },
    pickerInput: { height: 30, fontSize: 16, color: '#4E342E', paddingVertical: 0 },
    pickerIconContainer: { top: '50%', transform: [{ translateY: -10 }], right: 0 },
    saveButton: { flexDirection: 'row', backgroundColor: '#493628', paddingVertical: 14, borderRadius: 12, marginTop: 24, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.6)" },
    modalContent: { width: '90%', backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, alignItems: "center" },
    modalTitle: { fontSize: 20, fontWeight: "bold", color: '#4E342E', marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: '#A1887F', textAlign: 'center', marginBottom: 20 },
    modalInput: { width: "100%", height: 50, backgroundColor: '#F9F4EF', borderColor: "#EFEBE9", borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, fontSize: 16 },
    modalButton: { width: "100%", backgroundColor: "#493628", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginBottom: 10 },
    modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
    modalCancelButton: { width: "100%", paddingVertical: 12, alignItems: "center" },
    modalCancelText: { color: "#8D6E63", fontWeight: "600", fontSize: 14 },
    errorBorder: {
        borderBottomColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 45,
    },
});