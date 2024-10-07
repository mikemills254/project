import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { sendPasswordResetEmail } from "firebase/auth";  // Import Firebase auth correctly
import { auth } from "../Utilities/Firebaseconfig";

export default function ForgetPasswordScreen() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (email === "") {
            setError("Email is required");
            return;
        } else if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setError("");  // Clear previous errors
        setIsLoading(true);  // Start loading indicator

        try {
            await sendPasswordResetEmail(auth, email);
            setIsLoading(false);
            setEmail("");  // Clear email field after success
            Alert.alert("Success", "Please check your email for password reset instructions");
        } catch (error) {
            setIsLoading(false);
            handleFirebaseError(error);
        }
    };

    const validateEmail = (email) => {
        // Simple email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleFirebaseError = (error) => {
        let errorMessage = "Something went wrong. Please try again.";

        // Handle specific Firebase error codes for better UX
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = "The email address is invalid.";
                break;
            case 'auth/user-not-found':
                errorMessage = "No user found with this email address.";
                break;
            default:
                errorMessage = error.message;
        }

        Alert.alert("Error", errorMessage);
    };

    return (
        <View className="flex-1 bg-white p-5 items-center">
            <StatusBar style="dark" />
            <View className="mt-20 w-full">
                <Text className="text-2xl font-bold mb-2">Forget Password</Text>
                <Text className="text-sm text-gray-500 mb-6">
                    Please provide your email address. You will receive an email with instructions on how to reset your password.
                </Text>

                <TextInput
                    placeholder="e.g., johndoe@gmail.com"
                    className="w-full h-12 bg-white rounded-md px-4 text-base border border-border focus:border-primary"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(text) => setEmail(text)}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {error ? (
                    <Text className="text-red-500 text-sm mt-2">{error}</Text>
                ) : null}

                <TouchableOpacity
                    className="w-full bg-primary mt-5 py-3 rounded-md items-center"
                    onPress={handleSubmit}
                    disabled={isLoading}  // Disable button while loading
                >
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#fff" />
                    ) : (
                        <Text className="text-white text-base font-semibold">SEND</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}
