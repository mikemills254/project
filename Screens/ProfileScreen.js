import { View, Text, SafeAreaView, Image, ScrollView, Pressable } from 'react-native'
import React, { useState } from 'react'
import Emptyprofile from '../assets/blank-profile-picture-973460_1280.png'
import { useSelector, useDispatch } from 'react-redux'
import Ionicons from "react-native-vector-icons/Ionicons"
import { logOut, updateUser } from "../Utilities/appSlice"
import * as ImagePicker from 'expo-image-picker';
import { db } from '../Utilities/Firebaseconfig'
import { query, collection, getDocs , doc, where, updateDoc } from "firebase/firestore"; 


export default function ProfileScreen() {
    const { email, userName, userID,profileImage, id } = useSelector(state => state.auth.user)
    const dispatch = useDispatch()
    const [ profilePic, setProfilePic] = useState("")
    
    const MenuItem = ({ iconName, text, color = "#1f2937" }) => (
        <Pressable 
            className="flex-row items-center mb-2 bg-gray-100 rounded-xl p-4"
            style={({ pressed }) => [
                {
                    backgroundColor: pressed ? '#e5e7eb' : '#f3f4f6',
                }
            ]}
        >
            <View className="bg-white p-2 rounded-full mr-4">
                <Ionicons name={iconName} size={24} color={color}/>
            </View>
            <Text className="flex-1 text-md font-semibold" style={{color}}>{text}</Text>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af"/>
        </Pressable>
    )

    const handleUpdateUser = async (newProfileImage) => {
        try {
            const q = query(collection(db, "users"), where("userID", "==", userID));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(async (snapshot) => {
                const docID = snapshot.id;
                const docRef = doc(db, "users", docID);
                await updateDoc(docRef, {
                    profileImage: newProfileImage, // Use the passed image URI
                });
            });
        } catch (error) {
            console.log("Error updating profile image:", error);
        }
    };
    

    const handleLogOut = () => {
        dispatch(logOut())
    }

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            alert('Permission to access media library is required!');
            return;
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
    
        if (!result.canceled) {
            const selectedImage = result.assets[0].uri;
            setProfilePic(selectedImage);
            handleUpdateUser(selectedImage);
            dispatch(updateUser(selectedImage));
        }
    };
    

    return (
        <ScrollView className="flex-1 bg-white">
            <SafeAreaView className="flex-1 bg-white px-4 py-6">
                <View className="items-center mb-8">
                    <View className="relative p-2 border border-border rounded-full">
                        <View className="rounded-full h-32 w-32 border-4 border-white shadow-lg overflow-hidden">
                            <Image 
                                source={profileImage ? { uri: profileImage } : Emptyprofile} 
                                className="w-full h-full"
                            />
                        </View>
                        <Pressable
                            onPress={pickImage} 
                            className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-2"
                            style={({ pressed }) => [{
                                backgroundColor: pressed ? '#e5e7eb' : '#f3f4f6',
                            }]}
                        >
                            <Ionicons name="camera" size={20} color="#4b5563"/>
                        </Pressable>
                    </View>
                    <Text className="text-2xl font-bold mt-4 mb-1">{userName}</Text>
                    <Text className="text-gray-500">{email}</Text>
                </View>

                <View className="mb-4">
                    <MenuItem iconName="notifications-outline" text="Notifications"/>
                    <MenuItem iconName="settings-outline" text="Settings"/>
                    <MenuItem iconName="shield-outline" text="Privacy"/>
                    <MenuItem iconName="help-circle-outline" text="Help Center"/>
                </View>

                <Pressable 
                    className="flex-row items-center justify-center border border-error rounded-xl p-4 mt-4"
                    style={({ pressed }) => [{
                        backgroundColor: pressed ? '#dc2626' : '#ef4444',
                    }]}
                    onPress={() => handleLogOut()}
                >
                    <Ionicons name="log-out-outline" size={24} color="red"/>
                    <Text className="text-error text-lg font-semibold ml-3">Log Out</Text>
                </Pressable>
            </SafeAreaView>
        </ScrollView>
    )
}