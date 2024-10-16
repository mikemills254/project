import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react'
import Icon from 'react-native-vector-icons/Ionicons';
import Logo from "../assets/icons8-whatsapp-1024.png"
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from "../Utilities/Firebaseconfig"
import { getDocs, collection, query, where } from 'firebase/firestore';
import { useDispatch } from 'react-redux';
import { loginSuccess } from "../Utilities/appSlice"

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState('');
    const [isVisible, setVisible] = useState(true);
    const [error, setError] = useState("");
    const [isLoading, setLoading] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const dispatch = useDispatch();

    const handleLogin = async () => {
        if (email === '' || password === '') {
            setError('Please enter both email and password.');
            return;
        }
    
        try {
            setDisabled(true);
            setLoading(true);
            setError("");  // Clear any existing errors
            const userCred = await signInWithEmailAndPassword(auth, email, password);
    
            if (!userCred) {
                setError('Invalid email or password.');
                setDisabled(false);
                setLoading(false);
                return;
            }
    
            const userQuery = query(collection(db, "users"), where("email", "==", email));
            const userSnapshot = await getDocs(userQuery);
    
            if (userSnapshot.empty) {
                setError('No user found with this email.');
                setDisabled(false);
                setLoading(false);
                return;
            }
    
            const userData = userSnapshot.docs[0].data();
            dispatch(loginSuccess({
                userName: userData.userName,
                email: userData.email,
                userID: userCred.user.uid,
                accessToken: await userCred.user.getIdToken(),
            }));
        } catch (error) {
            console.log("error", error)
            switch (error.code) {
                case 'auth/user-not-found':
                    setError('No account found with this email.');
                    break;
                case 'auth/wrong-password':
                    setError('Incorrect password.');
                    break;
                case 'auth/invalid-email':
                    setError('The email address is badly formatted.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many login attempts, you have been temporarily blocked.');
                    break;
                default:
                    setError('Login failed. Please try again later.');
                    break;
            }
        } finally {
            setLoading(false);
            setDisabled(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-1 bg-white p-6 pt-20 items-center">
                    <StatusBar style="dark" />
                    <Image source={Logo} className="w-40 h-40" />
                    <Text className="text-2xl font-semibold text-gray-800 mb-4">Login</Text>
                    {error && <Text className="text-sm text-error mb-3">{error}</Text>}

                    <View className="w-full mb-1">
                        <Text className="text-base mb-1 text-gray-700">Email</Text>
                        <TextInput
                            className="w-full h-12 bg-white rounded-md px-4 mb-5 text-sm border border-border focus:border-primary"
                            placeholder="Enter your email"
                            placeholderTextColor="#888"
                            keyboardType="email-address"
                            value={email}
                            editable={!disabled}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                        />
                    </View>

                    <View className="w-full mb-6">
                        <Text className="text-base mb-1 text-gray-700">Password</Text>
                        <View className="flex flex-row items-center bg-white border border-gray-300 focus:border-primary rounded-md h-12">
                            <TextInput
                                className="flex-1 px-4 h-full"
                                placeholder="Enter your password"
                                placeholderTextColor="#888"
                                secureTextEntry={isVisible}
                                value={password}
                                editable={!disabled}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setVisible(!isVisible)} className="p-3">
                                <Icon name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate('Forgot')} className="w-full mb-3">
                        <Text className="text-primary-dark text-right">Forgot Password?</Text>
                    </TouchableOpacity>

                    <Text className="my-3 text-center text-gray-600">
                        By continuing, you agree to our 
                        <Text className="text-blue-500 underline"> terms of service</Text> and
                        <Text className="text-blue-500 underline"> privacy policy.</Text>
                    </Text>

                    <TouchableOpacity
                        className={`w-full h-12 ${disabled ? 'bg-primary-light' : 'bg-primary'} justify-center items-center rounded-md`}
                        onPress={handleLogin}
                        activeOpacity={0.8}
                        disabled={disabled}
                    >
                        {isLoading ? <ActivityIndicator size="medium" color="#fff" /> : <Text className="text-white text-lg font-bold uppercase">Login</Text>}
                    </TouchableOpacity>

                    <View className="w-full flex-row justify-center items-center mt-5 mb-5">
                        <Text className="text-gray-600 text-md">Don't have an account?</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AuthScreens', { screen: 'Signup' })}>
                            <Text className="text-primary text-md ml-1">Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}