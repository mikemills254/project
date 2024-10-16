import { View, Text, SafeAreaView, Image, ScrollView, Pressable } from 'react-native'
import React, { useState } from 'react'
import Emptyprofile from '../assets/blank-profile-picture-973460_1280.png'
import { useSelector, useDispatch } from 'react-redux'
import Ionicons from "react-native-vector-icons/Ionicons"
import { logOut, updateUser } from "../Utilities/appSlice"
import * as ImagePicker from 'expo-image-picker'
import { db } from '../Utilities/Firebaseconfig'
import { query, collection, getDocs, doc, where, updateDoc } from "firebase/firestore"
import { StatusBar } from 'expo-status-bar'

export default function ProfileScreen() {
    const { email, userName, userID, profileImage } = useSelector(state => state.auth.user)
    const dispatch = useDispatch()
    const [profilePic, setProfilePic] = useState("")
    
    const MenuItem = ({ iconName, text, color = "#1f2937" }) => (
        <Pressable 
            className="flex-row items-center mb-3 bg-gray-50 rounded-2xl p-4 shadow-sm"
            style={({ pressed }) => [
                {
                    backgroundColor: pressed ? '#f3f4f6' : '#fafafa',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                }
            ]}
        >
            <View className="bg-white p-3 rounded-xl mr-4 shadow-sm">
                <Ionicons name={iconName} size={22} color={color}/>
            </View>
            <Text className="flex-1 text-base font-semibold" style={{color}}>{text}</Text>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af"/>
        </Pressable>
    )

    const handleUpdateUser = async (newProfileImage) => {
        try {
            const q = query(collection(db, "users"), where("userID", "==", userID))
            const querySnapshot = await getDocs(q)
            querySnapshot.forEach(async (snapshot) => {
                const docID = snapshot.id
                const docRef = doc(db, "users", docID)
                await updateDoc(docRef, { profileImage: newProfileImage })
            })
        } catch (error) {
            console.log("Error updating profile image:", error)
        }
    }

    const handleLogOut = () => {
        dispatch(logOut())
    }

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            alert('Permission to access media library is required!')
            return
        }
    
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        })
    
        if (!result.canceled) {
            const selectedImage = result.assets[0].uri
            setProfilePic(selectedImage)
            handleUpdateUser(selectedImage)
            dispatch(updateUser(selectedImage))
        }
    }

    return (
        <ScrollView className="flex-1 bg-white">
            <StatusBar style="dark"/>
            <SafeAreaView className="flex-1 bg-white px-5 py-8 mt-10">
                <View className="items-center mb-10">
                    <View className="relative border border-border rounded-full">
                        <View className="rounded-full h-36 w-36 border-4 border-white shadow-xl overflow-hidden">
                            <Image 
                                source={profileImage ? { uri: profileImage } : Emptyprofile} 
                                className="w-full h-full"
                            />
                        </View>
                        <Pressable
                            onPress={pickImage} 
                            className="absolute bottom-0 right-0 bg-white rounded-full p-3 shadow-lg"
                            style={({ pressed }) => [{
                                backgroundColor: pressed ? '#f3f4f6' : '#ffffff',
                                transform: [{ scale: pressed ? 0.95 : 1 }],
                            }]}
                        >
                            <Ionicons name="camera" size={22} color="#4b5563"/>
                        </Pressable>
                    </View>
                    <Text className="text-2xl font-bold mt-5 mb-1">{userName}</Text>
                    <Text className="text-gray-500 text-base">{email}</Text>
                </View>

                {/* Menu Section */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold mb-4 text-gray-800 px-1">Account Settings</Text>
                    <MenuItem iconName="notifications-outline" text="Notifications"/>
                    <MenuItem iconName="settings-outline" text="Settings"/>
                    <MenuItem iconName="shield-outline" text="Privacy"/>
                    <MenuItem iconName="help-circle-outline" text="Help Center"/>
                </View>

                {/* Logout Button */}
                <Pressable 
                    className="flex-row items-center justify-center bg-red-50 rounded-2xl p-4 mt-6"
                    style={({ pressed }) => [{
                        backgroundColor: pressed ? '#fee2e2' : '#fef2f2',
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    }]}
                    onPress={handleLogOut}
                >
                    <Ionicons name="log-out-outline" size={24} color="#ef4444"/>
                    <Text className="text-red-500 text-lg font-semibold ml-3">Log Out</Text>
                </Pressable>
            </SafeAreaView>
        </ScrollView>
    )
}