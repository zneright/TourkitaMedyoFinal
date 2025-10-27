import React, { useState, useEffect, } from "react";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { RootStackParamList } from '../Navigation/types';
import { BackHandler } from "react-native";
import {
    SafeAreaView,
    View,
    ScrollView,
    Image,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    StyleSheet,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Checkbox from "expo-checkbox";
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from "firebase/firestore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SignUpScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [lastName, setLastName] = useState("");
    const [middleInitial, setMiddleInitial] = useState("");
    const [firstName, setFirstName] = useState("");
    const [gender, setGender] = useState("Male");
    const [userType, setUserType] = useState("Tourist");
    const [age, setAge] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [isChecked, setIsChecked] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeStatus, setActiveStatus] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

    const onChangeField = (field: keyof typeof errors, value: string) => {
        switch (field) {
            case "lastName":
                setLastName(value);
                break;
            case "firstName":
                setFirstName(value);
                break;
            case "age":
                setAge(value);
                break;
            case "contactNumber":
                setContactNumber(value);
                break;
            case "password":
                setPassword(value);
                break;
            case "confirmPassword":
                setConfirmPassword(value);
                break;
            case "email":
                setEmail(value);
                break;
        }
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    const onToggleCheckbox = () => {
        setIsChecked(prev => {
            if (errors.terms) {
                setErrors(prevErrors => ({ ...prevErrors, terms: false }));
            }
            return !prev;
        });
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            navigation.goBack();
            return true;
        });

        return () => backHandler.remove();
    }, []);
    const validateForm = () => {
        const newErrors: { [key: string]: string | null } = {};

        const nameRegex = /^[a-zA-Z-' ]+$/;
        if (!lastName.trim()) newErrors.lastName = "Last Name is required.";
        else if (!nameRegex.test(lastName)) newErrors.lastName = "Last Name contains invalid characters.";

        if (!firstName.trim()) newErrors.firstName = "First Name is required.";
        else if (!nameRegex.test(firstName)) newErrors.firstName = "First Name contains invalid characters.";

        if (middleInitial.trim() && !/^[A-Z]$/i.test(middleInitial)) {
            newErrors.middleInitial = "M.I. must be a single letter.";
        }

        const ageNum = Number(age);
        if (!age.trim()) newErrors.age = "Age is required.";
        else if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) newErrors.age = "Age must be between 18 and 100.";

        const contactRegex = /^09\d{9}$/;
        if (!contactNumber.trim()) newErrors.contactNumber = "Contact number is required.";
        else if (!contactRegex.test(contactNumber)) newErrors.contactNumber = "Must be a valid 11-digit number starting with 09.";

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!password) newErrors.password = "Password is required.";
        else if (!passwordRegex.test(password)) newErrors.password = "Must be 8+ chars with uppercase, lowercase, number, and special character.";

        if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password.";
        else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) newErrors.email = "Email is required.";
        else if (!emailRegex.test(email)) newErrors.email = "Email format is invalid.";

        if (!isChecked) newErrors.terms = "You must accept the terms and conditions.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleNext = async () => {

        setIsSubmitting(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);

            const userData = {
                uid: user.uid,
                firstName,
                middleInitial,
                lastName,
                gender,
                userType,
                age: parseInt(age),
                contactNumber,
                email,
                status: "Registered",
                profileImage: "https://static.vecteezy.com/system/resources/previews/005/544/718/non_2x/profile-icon-design-free-vector.jpg",
                activeStatus: false,
                hasViewedIntro: false,
            };

            await setDoc(doc(db, "users", user.uid), userData, { merge: true });

            Alert.alert("Success!", "Check your email for the verification link.");

            navigation.navigate("EmailVerification", { userData });

        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                setErrors(prev => ({ ...prev, email: "This email address is already registered." }));
            } else {
                Alert.alert("Signup Error", error.message || "An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.formCard}>
                    <Image
                        source={require('../assets/TourkitaLogo.jpg')}
                        resizeMode="contain"
                        style={styles.logo}
                    />

                    <View style={styles.tabContainer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.inactiveTab}>Login</Text>
                        </TouchableOpacity>
                        <Text style={styles.activeTab}>Sign Up</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Last Name</Text>
                            <TextInput
                                style={[styles.input, errors.lastName && styles.errorInput]}
                                value={lastName}
                                onChangeText={(val) => onChangeField("lastName", val)}
                            />
                            {errors.lastName && <Text style={styles.errorText}>Last Name is required.</Text>}
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>M.I.(Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={middleInitial}
                                onChangeText={setMiddleInitial}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>First Name</Text>
                    <TextInput
                        style={[styles.input, errors.firstName && styles.errorInput]}
                        value={firstName}
                        onChangeText={(val) => onChangeField("firstName", val)}
                    />
                    {errors.firstName && <Text style={styles.errorText}>First Name is required.</Text>}

                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Gender</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={gender} onValueChange={setGender}>
                                    <Picker.Item label="Male" value="Male" />
                                    <Picker.Item label="Female" value="Female" />
                                    <Picker.Item label="Non-Binary" value="Non-Binary" />
                                    <Picker.Item label="Prefer Not to Say" value="Prefer Not to Say" />
                                </Picker>
                            </View>
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>User Type</Text>
                            <View style={styles.pickerContainer}>
                                <Picker selectedValue={userType} onValueChange={setUserType}>
                                    <Picker.Item label="Tourist" value="Tourist" />
                                    <Picker.Item label="Student" value="Student" />
                                    <Picker.Item label="Local" value="Local" />
                                    <Picker.Item label="Foreign National" value="Foreign National" />
                                    <Picker.Item label="Researcher" value="Researcher" />
                                </Picker>
                            </View>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                style={[styles.input, errors.age && styles.errorInput]}
                                keyboardType="numeric"
                                value={age}
                                onChangeText={(val) => onChangeField("age", val)}
                            />
                            {errors.age && <Text style={styles.errorText}>Age must be a positive number.</Text>}
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>Contact Number</Text>
                            <TextInput
                                style={[styles.input, errors.contactNumber && styles.errorInput]}
                                keyboardType="phone-pad"
                                value={contactNumber}
                                onChangeText={(val) => onChangeField("contactNumber", val)}
                            />
                            {errors.contactNumber && <Text style={styles.errorText}>Contact number must start with 09 and be 11 digits.</Text>}
                        </View>
                    </View>

                    <Text style={styles.label}>Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, errors.password && styles.errorInput, { flex: 1 }]}
                            secureTextEntry={!showPassword}
                            value={password}
                            onChangeText={(val) => onChangeField("password", val)}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(prev => !prev)} style={styles.eyeIcon}>
                            <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#603F26" />
                        </TouchableOpacity>
                    </View>
                    {errors.password && <Text style={styles.errorText}>Password must be at least 7 characters and include letters & numbers.</Text>}

                    <Text style={styles.label}>Confirm Password</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, errors.confirmPassword && styles.errorInput, { flex: 1 }]}
                            secureTextEntry={!showConfirmPassword}
                            value={confirmPassword}
                            onChangeText={(val) => onChangeField("confirmPassword", val)}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(prev => !prev)} style={styles.eyeIcon}>
                            <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={24} color="#603F26" />
                        </TouchableOpacity>
                    </View>
                    {errors.confirmPassword && <Text style={styles.errorText}>Passwords do not match.</Text>}

                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={[styles.input, errors.email && styles.errorInput]}
                        keyboardType="email-address"
                        value={email}
                        onChangeText={(val) => onChangeField("email", val)}
                        autoCapitalize="none"
                    />
                    {errors.email && <Text style={styles.errorText}>Email format is invalid.</Text>}

                    <View style={styles.checkboxContainer}>
                        <Checkbox
                            value={isChecked}
                            onValueChange={onToggleCheckbox}
                            color={isChecked ? "#603F26" : undefined}
                            style={errors.terms ? styles.errorCheckbox : undefined}
                        />
                        <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                            <Text style={styles.termsText}> Term and privacy policy</Text>
                        </TouchableOpacity>
                    </View>
                    {errors.terms && <Text style={styles.errorText}>You must accept the terms and conditions.</Text>}

                    <TouchableOpacity
                        style={[styles.button, isSubmitting && { backgroundColor: "#A5A5A5" }]}
                        onPress={handleNext}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.buttonText}>{isSubmitting ? "Processing..." : "Next"}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
    scrollContainer: { paddingVertical: 40, alignItems: "center" },
    formCard: {
        width: "90%",
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    logo: { width: 120, height: 120, alignSelf: "center", marginBottom: 10 },
    tabContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginBottom: 20,
        gap: 20,
    },
    activeTab: {
        color: "#603F26",
        borderBottomWidth: 2,
        borderColor: "#603F26",
        fontWeight: "600",
        paddingBottom: 5,
    },
    inactiveTab: {
        color: "#A5A5A5",
        paddingBottom: 5,
    },
    label: {
        color: "#A5A5A5",
        fontSize: 13,
        marginBottom: 4,
        marginLeft: 6,
    },
    input: {
        backgroundColor: "#F5F5F5",
        height: 40,
        borderRadius: 5,
        paddingLeft: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F5F5F5",
    },
    errorInput: {
        borderColor: "red",
        backgroundColor: "#fff0f0",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    column: {
        width: "48%",
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 5,
    },
    checkboxContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    errorCheckbox: {
        borderColor: "red",
        borderWidth: 1,
        borderRadius: 3,
    },
    termsText: {
        color: "#603F26",
        textDecorationLine: "underline",
    },
    button: {
        backgroundColor: "#603F26",
        borderRadius: 5,
        paddingVertical: 12,
        alignItems: "center",
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    eyeIcon: {
        position: "absolute",
        right: 10,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
        padding: 5,
        top: 0,
    },
    errorText: {
        color: "red",
        fontSize: 11,
        marginBottom: 6,
        marginLeft: 6,
    },
});

export default SignUpScreen;
