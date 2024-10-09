import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, TextInput, Image, Pressable } from 'react-native';
import { BottomSheet } from '@rneui/themed';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getDocs, collection, query } from 'firebase/firestore';
import profile from "../assets/blank-profile-picture-973460_1280.png"
import { db } from "../Utilities/Firebaseconfig";
import { useNavigation, useRoute } from '@react-navigation/native';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useSelector } from 'react-redux';

const FAB = () => {
    const [isVisible, setIsVisible] = useState(false);
    const animationValue = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const navigation = useNavigation();
    const route = useRoute();
    const { email, userID } = useSelector(state => state.auth.user);

    const isGroupsScreen = route.name === 'Groups';

    const handleFABPress = () => {
        if (isGroupsScreen) {
            navigation.navigate("OtherScreens", {
                screen: "CreateGroup"
            });
        } else {
            toggleBottomSheet();
        }
    };

    const renderFABContent = () => {
        if (isGroupsScreen) {
            return (
                <TouchableOpacity
                    onPress={handleFABPress}
                    className="absolute bottom-5 right-5 w-14 h-14 bg-primary rounded-full justify-center items-center shadow-lg"
                    accessibilityLabel="Create New Group"
                >
                    <MaterialCommunityIcons name="account-group-outline" size={30} color="white" />
                </TouchableOpacity>
            );
        }

        return (
            <>
                <TouchableOpacity
                    onPress={handleFABPress}
                    className="absolute bottom-5 right-5 w-14 h-14 bg-primary rounded-full justify-center items-center shadow-lg"
                    accessibilityLabel="Toggle Bottom Sheet"
                >
                    <MaterialCommunityIcons name="chat-plus" size={30} color="white" />
                </TouchableOpacity>

                <BottomSheet
                    isVisible={isVisible}
                    onBackdropPress={toggleBottomSheet}
                    containerStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
                >
                    <Animated.View 
                        style={{ transform: [{ translateY: modalTranslateY }], height: 500 }}
                        className="bg-white rounded-t-3xl px-4 pt-4"
                    >
                        <View className="flex-1">
                        <View className="flex flex-row items-center bg-gray-100 rounded-xl px-3 mb-4">
                            <TextInput
                                placeholder='Search email or username'
                                className="flex-1 py-3 text-base"
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            <Ionicons name="search" size={20} className="text-gray-500" />
                        </View>

                        {searchQuery.trim() !== "" && filteredUsers.length > 0 && (
                            <>
                                {filteredUsers.map((user, index) => (
                                    <Pressable
                                        onPress={() => {
                                            navigation.navigate("OtherScreens", {
                                                screen: "Chat",
                                                params: {
                                                    id: user.userID,
                                                    mail: user.email,
                                                    name: user.userName,
                                                    profile: user?.profileImage
                                                }
                                            });
                                        }}  
                                        key={index} className="bg-gray-100 shadow-md p-2 mb-2 flex flex-row items-center w-full"
                                    >
                                        <View className="h-12 w-12 rounded-full flex item-center justify-center border border-border bg-white">
                                            <Image
                                                source={user.profileImage ? {uri: user.profileImage} : profile}
                                                className="w-full h-full rounded-full"
                                                 resizeMode="cover"
                                            />
                                        </View>
                                        <View className="ml-4 flex-1">
                                            <Text className="text-lg font-semibold">{user.userName}</Text>
                                            <Text className="text-sm text-gray-500">{user.email}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </>
                        )}
                    
                        <View className="flex-1 bg-gray-50 rounded-xl p-4">
                        </View>
                    </View>
                    </Animated.View>
                </BottomSheet>
            </>
        );
    };

    // Your existing functions
    const toggleBottomSheet = () => {
        if (isVisible) {
            Animated.timing(animationValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start(() => setIsVisible(false));
        } else {
            setIsVisible(true);
            Animated.timing(animationValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

    const modalTranslateY = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
    });

    // Your existing useEffect and handleSearch functions
    useEffect(() => {
        const getAllUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const querySnapshot = await getDocs(q);
                
                const usersArray = [];
                querySnapshot.forEach((doc) => {
                    usersArray.push(doc.data());
                });

                setUsers(usersArray);
                setFilteredUsers(usersArray);
            } catch (error) {
                console.log("error", error);
            }
        };

        getAllUsers();
    }, []); 

    const handleSearch = (query) => {
        setSearchQuery(query);
    
        if (query.trim() === "") {
            setFilteredUsers([]);
            return;
        }
    
        const lowerCaseQuery = query.toLowerCase();
    
        const newFilteredUsers = users.filter((user) => {
            return (
                (user.userName.toLowerCase().includes(lowerCaseQuery) || 
                user.email.toLowerCase().includes(lowerCaseQuery)) &&
                user.email !== email && user.userID !== userID
            );
        });
    
        setFilteredUsers(newFilteredUsers);
    };

    return renderFABContent();
};

export default FAB;