import { View, Text, TextInput, ActivityIndicator, TouchableOpacity, StatusBar, Alert, Image, ScrollView } from 'react-native';
import Icon from "react-native-vector-icons/Ionicons";
import React, { useState } from 'react';
import Logo from "../assets/icons8-whatsapp-1024.png"
import { createUserWithEmailAndPassword, AuthErrorCodes } from 'firebase/auth';
import { auth, db } from '../Utilities/Firebaseconfig';
import { collection, addDoc } from 'firebase/firestore';
import { registerSuccess } from '../Utilities/appSlice'
import { useDispatch } from "react-redux"

export default function SignUpScreen({ navigation }) {
    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ userName, setUsername ] = useState('');
    const [ isVisible, setVisible ] = useState(true);
    const [ isLoading, setIsLoading ] = useState(false);
    const [ isDisabled, setDisabled ] = useState(false)
    const [ error, setError ] = useState("")
    const dispatch = useDispatch()

    const handleRegister = async () => {
        if (userName === '' || email === '' || password === '') {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }

        setIsLoading(true);
        setDisabled(true)

        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);

            if (!userCred) {
                setError("Unable to register user");
                setIsLoading(true);
                setDisabled(true)
                return;
            }

            const user = {
                userID: userCred.user.uid,
                userName: userName,
                email: email,
                joined: new Date().toISOString(),
            };

            const docRef = await addDoc(collection(db, "users"), user);
            console.log('User registered with ID:', docRef.id);

            dispatch(registerSuccess({
                email: email,
                userName: userName,
                userID: userCred.user.uid,
                accessToken: await userCred.user.getIdToken() 
            }))


        } catch (error) {
            if (error.code === AuthErrorCodes.EMAIL_EXISTS) {
                console.log("Error: Email is already in use.");
                setError('Error', 'Email is already in use.');
            } else if (error.code === AuthErrorCodes.INVALID_EMAIL) {
                console.log("Error: nvalid email address.");
                setError('Error', 'Invalid email address.');
            } else if (error.code === AuthErrorCodes.WEAK_PASSWORD) {
                console.log("Error: 'Password is too weak.");
                setError('Error', 'Password is too weak.');
            } else {
                console.log("Error:", error);
                setError('Error', 'Registration failed. Please try again later.');
            }
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <ScrollView
            className="flex-1 bg-white p-5 pt-20"
            contentContainerStyle={{ alignItems: 'center' }}  // Move layout styles here
        >
            <StatusBar barStyle="dark-content" />
            <Image source={Logo} className="w-40 h-40" />
        
            <Text className="text-2xl font-semibold text-gray-800 mb-10">Register</Text>
        
            {error && <Text className="text-red-500 mb-4">{error}</Text>}
        
            <View className="w-full mb-2">
                <Text className="text-base mb-1 text-gray-700">Username</Text>
                <TextInput
                    className="w-full h-12 bg-white rounded-md px-4 mb-5 text-sm border border-border focus:border-primary"
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#888"
                    value={userName}
                    disabled={isDisabled}
                    onChangeText={setUsername}
                    editable={!isLoading} 
                />
            </View>
        
            <View className="w-full mb-2">
                <Text className="text-base mb-1 text-gray-700">Email</Text>
                <TextInput
                    className="w-full h-12 bg-white rounded-md px-4 mb-5 text-sm border border-border focus:border-primary"
                    placeholder="e.g. johndoe@gmail.com"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    value={email}
                    disabled={isDisabled}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    editable={!isLoading}
                />
            </View>
        
            <View className="w-full mb-6">
                <Text className="text-base mb-1 text-gray-700">Password</Text>
                <View className="flex flex-row items-center bg-white border border-gray-300 rounded-md h-12 pr-2 focus:border-primary">
                    <TextInput
                        className="flex-1 px-4 h-full"
                        placeholder="Enter your password"
                        placeholderTextColor="#888"
                        secureTextEntry={isVisible}
                        value={password}
                        disabled={isDisabled}
                        onChangeText={setPassword}
                        editable={!isLoading}
                    />
                    <TouchableOpacity onPress={() => setVisible(!isVisible)} className="p-3">
                        <Icon name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={22} color="#888" />
                    </TouchableOpacity>
                </View>
            </View>
        
            <View className="mb-4">
                <Text className="my-3 text-center text-gray-600">
                    By continuing, you agree to our 
                    <Text className="text-blue-500 underline"> terms of services</Text> and
                    <Text className="text-blue-500 underline"> privacy policy.</Text>
                </Text>
            </View>
        
            <TouchableOpacity
                className="w-full h-12 bg-primary justify-center items-center rounded-md"
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text className="text-white text-md font-semibold uppercase">Register</Text>
                )}
            </TouchableOpacity>
        
            <View className="w-full flex-row justify-center items-center mt-5">
                <Text className="text-gray-600 text-md">Already have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AuthScreens', { screen: 'Login' })}>
                    <Text className="text-primary text-md ml-1">Login</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
