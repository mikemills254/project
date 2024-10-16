import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const mockUser = {
    name: "Jane Doe",
    username: "@janedoe",
    bio: "Passionate about technology and design. Love to chat!",
    profilePic: "https://example.com/profile-pic.jpg",
    groups: [
        { id: 1, name: "Tech Enthusiasts", members: 120 },
        { id: 2, name: "Design Hub", members: 85 },
        { id: 3, name: "Coffee Lovers", members: 200 },
        { id: 4, name: "Book Club", members: 50 },
    ]
};

export default function UserProfile({ route }) {
    console.log("user", route.params)
    return (
        <View className="flex-1 bg-gray-100">
            <StatusBar style="light" />
            
            {/* Header */}
            <View className="bg-primary-dark pt-12 pb-6 rounded-b-3xl shadow-md">
                <View className="flex-row items-center justify-between px-4">
                    <TouchableOpacity>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Ionicons name="settings-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
                
                <View className="items-center mt-4">
                    <Image 
                        source={{ uri: mockUser.profilePic }}
                        className="w-24 h-24 rounded-full border-4 border-white"
                    />
                    <Text className="text-white text-2xl font-bold mt-2">{mockUser.name}</Text>
                    <Text className="text-blue-200 text-sm">{mockUser.username}</Text>
                </View>
            </View>
            
            {/* Bio */}
            <View className="bg-white mx-4 my-4 p-4 rounded-xl shadow">
                <Text className="text-gray-800">{mockUser.bio}</Text>
            </View>
            
            {/* Groups */}
            <View className="flex-1 bg-white mx-4 rounded-xl shadow">
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                    <Text className="text-lg font-semibold">Groups</Text>
                    <TouchableOpacity>
                        <Text className="text-blue-500">See All</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView className="flex-1">
                    {mockUser.groups.map(group => (
                        <TouchableOpacity key={group.id} className="flex-row items-center p-4 border-b border-gray-100">
                            <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                                <Text className="text-blue-600 font-semibold">{group.name.charAt(0)}</Text>
                            </View>
                            <View className="flex-1">
                                <Text className="font-semibold">{group.name}</Text>
                                <Text className="text-gray-500 text-sm">{group.members} members</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="gray" />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}