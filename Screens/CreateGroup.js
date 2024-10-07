import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../Utilities/Firebaseconfig';
import { useSelector } from 'react-redux';
import profile from "../assets/blank-profile-picture-973460_1280.png";
import * as ImagePicker from 'expo-image-picker';

export default function CreateGroup({ navigation }) {
    const [groupName, setGroupName] = useState('');
    const [groupImage, setGroupImage] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { userID, userName, email } = useSelector(state => state.auth.user);

    useEffect(() => {
        fetchUsers();
    }, []);
    
    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: "New Group",
            headerLeft: () => (
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    className="ml-2 mr-4"
                >
                    <Ionicons name="chevron-back-outline" size={24} color="black" />
                </TouchableOpacity>
            ),
            headerRight: () => (
                isLoading ? (
                    <ActivityIndicator className="mr-4" size="large" />
                ) : (
                    <TouchableOpacity 
                        onPress={handleCreateGroup}
                        disabled={groupName.trim() === '' || selectedUsers.length === 0}
                        className="mr-4"
                    >
                        <Text 
                            className={`text-primary-dark font-semibold text-lg ${
                                groupName.trim() === '' || selectedUsers.length === 0 ? 'opacity-50' : ''
                            }`}
                        >
                            Create
                        </Text>
                    </TouchableOpacity>
                )
            ),
        });
    }, [navigation, groupName, selectedUsers, isLoading]);

    const fetchUsers = async () => {
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs
                .map(doc => doc.data())
                .filter(user => user.userID !== userID);
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setGroupImage(result.assets[0].uri);
        }
    };

    const toggleUserSelection = (user) => {
        console.log("the user", user)
        if (selectedUsers.some(selected => selected.userID === user.userID)) {
            setSelectedUsers(selectedUsers.filter(selected => selected.userID !== user.userID));
            console.log("selected user", selectedUsers)
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const filteredUsers = users.filter(user =>
        user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateGroup = async () => {
        if (groupName.trim() === '' || selectedUsers.length === 0) {
            // You might want to show a toast or alert here
            console.log('Error', 'Group name and at least one participant are required');
            return;
        }
    
        setIsLoading(true);
    
        try {
            const adminData = {
                userName,
                email,
                userID
            };
            const groupData = {
                name: groupName.trim(),
                particapants: [...selectedUsers, adminData],
                admin: adminData,
                groupImage: groupImage,
                lastMessage: null
            };
    
            const docRef = await addDoc(collection(db, "groups"), groupData);
            
    
            console.log('Success', 'Group created successfully');
            
            navigation.goBack();
        } catch (error) {
            console.error("Error creating group:", error);
            console.log('Error', 'Failed to create group. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row items-center p-4">
                <TouchableOpacity onPress={pickImage} className="w-16 h-16 rounded-full bg-gray-200 justify-center items-center">
                    {groupImage ? (
                        <Image source={{ uri: groupImage }} className="w-16 h-16 rounded-full" />
                    ) : (
                        <MaterialIcons name="camera-alt" size={24} color="gray" />
                    )}
                </TouchableOpacity>
                <TextInput
                    placeholder="Group name (required)"
                    value={groupName}
                    onChangeText={setGroupName}
                    className="flex-1 ml-4 text-lg"
                />
            </View>

            {/* Selected Users Section */}
            {selectedUsers.length > 0 && (
                <View className="p-4">
                    <Text className="text-sm text-gray-500 mb-2">
                        {selectedUsers.length} participant{selectedUsers.length > 1 ? 's' : ''}
                    </Text>
                    <FlatList
                        data={selectedUsers}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={item => item.userID}
                        renderItem={({ item }) => (
                            <View className="mr-2 items-center">
                                <View className="relative">
                                    <Image 
                                        source={item.profilePic ? { uri: item.profilePic } : profile} 
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <TouchableOpacity 
                                        onPress={() => toggleUserSelection(item)}
                                        className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-1"
                                    >
                                        <Ionicons name="close" size={12} color="black" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-xs mt-1" numberOfLines={1}>{item.userName}</Text>
                            </View>
                        )}
                    />
                </View>
            )}

            {/* Search Bar */}
            <View className="px-4 mb-2">
                <TextInput
                    placeholder="Search for participants"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    className="bg-gray-100 p-2 rounded-lg"
                />
            </View>

            {/* Users List */}
            <FlatList
                data={filteredUsers}
                keyExtractor={item => item.userID}
                renderItem={({ item }) => (
                    <Pressable 
                        onPress={() => toggleUserSelection(item)}
                        className="flex-row items-center p-4"
                    >
                        <Image 
                            source={item.profileImage ? { uri: item.profileImage } : profile} 
                            className="w-12 h-12 rounded-full"
                        />
                        <View className="flex-1 ml-4">
                            <Text className="font-semibold">{item.userName}</Text>
                            <Text className="text-gray-500">{item.email}</Text>
                        </View>
                        {selectedUsers.some(selected => selected.userID === item.userID) && (
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        )}
                    </Pressable>
                )}
            />
        </View>
    );
}