import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, TextInput, Image, Pressable } from 'react-native';
import { BottomSheet } from '@rneui/themed';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getDocs, collection, query, runTransaction  } from 'firebase/firestore';
import profile from "../assets/blank-profile-picture-973460_1280.png";
import { db } from "../Utilities/Firebaseconfig";
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { handleFindFriends } from "../Utilities/Utilities.js"
import { doc, arrayUnion, updateDoc, where } from 'firebase/firestore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const generateRandomId = (length = 20) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

const FAB = () => {
    const [isVisible, setIsVisible] = useState(false);
    const animationValue = useRef(new Animated.Value(0)).current;
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const navigation = useNavigation();
    const { email, userID } = useSelector(state => state.auth.user);

    const handleFABPress = () => {
        toggleBottomSheet();
    };

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

    useEffect(() => {
        const getAllUsers = async () => {
            try {
                // Retrieve the current user's friends list
                const currentUserFriends = await handleFindFriends(userID);
    
                // Create an array of friend IDs for easier lookup
                const friendIDs = currentUserFriends.map(friend => friend.friendID);
    
                // Fetch all users from Firestore
                const q = query(collection(db, "users"));
                const querySnapshot = await getDocs(q);
                
                const usersArray = [];
                
                for (const doc of querySnapshot.docs) {
                    const userData = doc.data();
    
                    // Filter out the current user and those already in the friends list
                    if (userData.userID !== userID && !friendIDs.includes(userData.userID)) {
                        usersArray.push({ ...userData }); // No chatID here
                    }
                }
    
                // Set the state with filtered users
                setUsers(usersArray);
                setFilteredUsers(usersArray);
            } catch (error) {
                console.log("Error fetching users:", error);
            }
        };
    
        getAllUsers();
    }, [email, userID]);

    const handleUserPress = async (user) => {
        const chatID = generateRandomId(); // Generate chatID when user presses to chat

        // Navigate to chat screen immediately
        navigation.navigate("OtherScreens", {
            screen: "Chat",
            params: {
                chatID,
                id: user.userID,
                mail: user.email,
                name: user.userName,
                profile: user?.profileImage
            }
        });

        // Update database in the background
        try {
            const usersRef = collection(db, "users");
            
            // Query for current user
            const currentUserQuery = query(usersRef, where("userID", "==", userID));
            const currentUserSnapshot = await getDocs(currentUserQuery);
            
            // Query for other user
            const otherUserQuery = query(usersRef, where("userID", "==", user.userID));
            const otherUserSnapshot = await getDocs(otherUserQuery);

            if (currentUserSnapshot.empty || otherUserSnapshot.empty) {
                throw new Error("One or both user documents not found");
            }

            const currentUserDoc = currentUserSnapshot.docs[0];
            const otherUserDoc = otherUserSnapshot.docs[0];

            // Update current user's friends list
            await updateDoc(currentUserDoc.ref, {
                friends: arrayUnion({
                    friendID: user.userID,
                    chatID: chatID
                })
            });

            // Update other user's friends list
            await updateDoc(otherUserDoc.ref, {
                friends: arrayUnion({
                    friendID: userID,
                    chatID: chatID
                })
            });

            console.log("Friend lists updated successfully");
        } catch (error) {
            console.error("Error updating friends lists:", error);
            // Optionally, you could show an error message to the user here
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
    
        if (query.trim() === "") {
            setFilteredUsers(users);
            return;
        }
    
        const lowerCaseQuery = query.toLowerCase();
    
        const newFilteredUsers = users.filter((user) => {
            return user.email.toLowerCase().includes(lowerCaseQuery) || 
                   user.userName.toLowerCase().includes(lowerCaseQuery);
        });
    
        setFilteredUsers(newFilteredUsers);
    };
    console.log("filteredUsers", filteredUsers)

    const renderFABContent = () => {
        return (
            <>
                <TouchableOpacity
                    onPress={handleFABPress}
                    className="absolute bottom-5 right-5 w-14 h-14 bg-primary rounded-full justify-center items-center shadow-lg"
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

                            {filteredUsers.map((user, index) => (
                                <Pressable
                                    onPress={() => handleUserPress(user)}  
                                    key={index}
                                    className="bg-gray-100 shadow-md p-2 mb-2 flex flex-row items-center w-full"
                                >
                                    <View className="h-12 w-12 rounded-full flex item-center justify-center border border-border bg-white">
                                        <Image
                                            source={user.profileImage ? { uri: user.profileImage } : profile}
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
                        
                            <View className="flex-1 bg-gray-50 rounded-xl p-4"></View>
                        </View>
                    </Animated.View>
                </BottomSheet>
            </>
        );
    };

    return renderFABContent();
};

export default FAB;
