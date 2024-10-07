import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from "../Utilities/Firebaseconfig";
import FAB from '../components/FAB';
import { useLayoutEffect } from 'react';

const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    // Convert Firestore timestamp to JavaScript Date
    const date = timestamp.toDate();
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Today - show time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        // Within last week - show day name
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        // Older - show date
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
};

export default function GroupScreen({ navigation }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const { userID } = useSelector(state => state.auth.user);


    useEffect(() => {
        // Fetch all groups
        const unsubscribe = onSnapshot(collection(db, "groups"), (snapshot) => {
            const filteredGroups = snapshot.docs
                .map(doc => {
                    const groupData = doc.data();
                    const isAdmin = groupData.admin?.userID === userID;
                    const isParticipant = groupData.particapants?.some(p => p.userID === userID);

                    // Only include groups where user is admin or participant
                    if (isAdmin || isParticipant) {
                        return {
                            id: doc.id,
                            ...groupData,
                            isAdmin
                        };
                    }
                    return null;
                })
                .filter(group => group !== null) // Remove null entries
                .sort((a, b) => {
                    if (a.isAdmin && !b.isAdmin) return -1;
                    if (!a.isAdmin && b.isAdmin) return 1;
                    return a.name.localeCompare(b.name);
                });

            setGroups(filteredGroups);
            setLoading(false);
        }, error => {
            console.error("Error fetching groups:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userID]);

    const renderGroup = ({ item }) => (
        <TouchableOpacity 
            className="flex-row items-center p-4 border-b border-gray-200"
            onPress={() => navigation.navigate('OtherScreens', { 
                screen: "GroupChat", 
                params: { name: item.name, profile: item.groupImage,id: item.id }
            })}
        >
            {item.groupImage ? (
                <Image 
                    source={{ uri: item.groupImage }} 
                    className="w-12 h-12 rounded-full"
                />
            ) : (
                <View className="w-12 h-12 rounded-full bg-gray-300 justify-center items-center">
                    <Text className="text-xl font-bold text-gray-600">
                        {item.name[0].toUpperCase()}
                    </Text>
                </View>
            )}
            <View className="ml-4 flex-1">
                <Text className="font-semibold text-lg">{item.name}</Text>
                <View className="flex-row justify-between">
                <Text className="text-gray-500">
                        {item.lastMessage?.text}
                    </Text>
                    <Text className="text-gray-500">
                        {formatTimestamp(item.lastMessage?.timestamp)}
                    </Text>
                    
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-white">
            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            ) : groups.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-gray-500">No groups found</Text>
                    <Text className="text-gray-500">Create or join a group to get started</Text>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    renderItem={renderGroup}
                    keyExtractor={item => item.id}
                />
            )}
            <FAB />
        </View>
    );
}