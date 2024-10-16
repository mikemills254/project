import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { 
    View, 
    TextInput, 
    FlatList, 
    Text, 
    Image, 
    Pressable, 
    Animated, 
    TouchableWithoutFeedback, 
    Alert,
    ActivityIndicator // Importing ActivityIndicator for loading effect
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { collection, query, onSnapshot, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { db } from '../Utilities/Firebaseconfig';
import { getUserprofile } from "../Utilities/Utilities";
import ProfilePicture from "../assets/blank-profile-picture-973460_1280.png";
import FAB from '../components/FAB';
import { StatusBar } from 'expo-status-bar';

const HeaderRight = ({ onSearchPress }) => {
    const [isDropMenu, setDropMenu] = useState(false);
    const dropMenuAnimation = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation();

    const toggleDropMenu = useCallback(() => {
        const toValue = isDropMenu ? 0 : 1;
        setDropMenu(!isDropMenu);
        Animated.spring(dropMenuAnimation, {
            toValue,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
        }).start();
    }, [isDropMenu, dropMenuAnimation]);

    return (
        <View className="flex-row items-center mr-2">
            <Pressable onPress={onSearchPress} className="mr-4">
                <Icon name='search-outline' size={24} color="gray" />
            </Pressable>
            <View className="relative">
                <Pressable onPress={toggleDropMenu}>
                    <MaterialCommunityIcons name='dots-vertical' size={24} color="gray" />
                </Pressable>
                {isDropMenu && (
                    <TouchableWithoutFeedback onPress={toggleDropMenu}>
                        <Animated.View 
                            style={{
                                opacity: dropMenuAnimation,
                                transform: [{
                                    translateY: dropMenuAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 0]
                                    })
                                }]
                            }}
                            className="absolute right-0 top-10 w-40 bg-white rounded-md shadow-xl"
                        >
                            <Pressable onPress={() => navigation.navigate("OtherScreens", {
                                screen: "CreateGroup",
                            })}>
                                <View className="flex-row p-3">
                                    <FontAwesome name="group" size={14} color="gray" />
                                    <Text className="ml-2">New Group</Text>
                                </View>
                            </Pressable>
                            <Pressable>
                                <View className="flex-row p-3">
                                    <MaterialCommunityIcons name="account-edit" size={20} color="gray" />
                                    <Text className="ml-2">Edit Profile</Text>
                                </View>
                            </Pressable>
                            <Pressable>
                                <View className="flex-row p-3">
                                    <MaterialCommunityIcons name="cog" size={20} color="gray" />
                                    <Text className="ml-2">Settings</Text>
                                </View>
                            </Pressable>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                )}
            </View>
        </View>
    );
};

const MessageList = () => {
    const [searchText, setSearchText] = useState('');
    const { userID } = useSelector(state => state.auth.user);
    const [conversations, setConversations] = useState([]);
    const [friends, setFriends] = useState([]);
    const isFocused = useIsFocused();
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const searchAnimation = useRef(new Animated.Value(0)).current;
    const navigation = useNavigation();
    
    // New loading state
    const [loading, setLoading] = useState(true);

    const toggleSearch = useCallback(() => {
        const toValue = isSearchVisible ? 0 : 1;
        setIsSearchVisible(!isSearchVisible);
        Animated.spring(searchAnimation, {
            toValue,
            useNativeDriver: true,
            tension: 80,
            friction: 8,
        }).start();
    }, [isSearchVisible, searchAnimation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => <HeaderRight onSearchPress={toggleSearch} />,
            headerStyle: {
                backgroundColor: '#00e5e5',
            },
        });
    }, [navigation, toggleSearch]);

    const parseTimestamp = (timestamp) => {
        if (timestamp instanceof Date) return timestamp;
        if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
        if (typeof timestamp === 'string') return parseISO(timestamp);
        console.error('Invalid timestamp format:', timestamp);
        return new Date();
    };

    // Fetch friends from Firestore
    const fetchFriends = useCallback(async () => {
        if (!userID) return;
    
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("userID", "==", userID));
    
        try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0].data();
                const friendsData = userDoc.friends || [];
                setFriends(friendsData);
            } else {
                console.log("No user found with this userID:", userID);
            }
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    }, [userID]);

    // Fetch friends when component mounts or when `isFocused`
    useEffect(() => {
        const unsubscribe = fetchFriends();
    }, [fetchFriends, isFocused]);

    // Fetch latest conversations based on friend `chatID`
    useEffect(() => {
        const unsubscribeListeners = [];
    
        friends.forEach((friend) => {
            if (friend.chatID) {
                const chatsQuery = query(
                    collection(db, "chats", friend.chatID, "messages"),
                    orderBy("timestamp", "desc"),
                    limit(1)
                );
    
                const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
                    if (!snapshot.empty) {
                        const latestMessage = snapshot.docs[0].data();
                        const partnerID = latestMessage.sender === userID ? latestMessage.recipient : latestMessage.sender;
                        const partnerUser = await getUserprofile(partnerID);
    
                        const newConversation = {
                            chatID: friend.chatID,
                            partner: { 
                                id: partnerID, 
                                profile: partnerUser?.profileImage || friend.profileImage, 
                                name: partnerUser?.userName || friend.userName, 
                                mail: partnerUser?.email 
                            },
                            lastMessage: latestMessage.type === "text" ? latestMessage.content : "Media",
                            timestamp: parseTimestamp(latestMessage.timestamp),
                        };

                        setConversations((prevConversations) => {
                            const updatedConversations = prevConversations.filter(conv => conv.chatID !== friend.chatID);
                            return [...updatedConversations, newConversation].sort((a, b) => b.timestamp - a.timestamp);
                        });
                    }
                });
    
                unsubscribeListeners.push(unsubscribe);
            }
        });
    
        setLoading(false); // Set loading to false after fetching conversations

        return () => unsubscribeListeners.forEach(unsub => unsub());
    }, [friends, userID]);

    const formatMessageDate = (timestamp) => {
        const date = parseTimestamp(timestamp);
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday ' + format(date, 'HH:mm');
        return format(date, 'dd/MM/yyyy');
    };

    const filteredConversations = conversations.filter(item =>
        item.partner.name?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <View className="flex-1 bg-white p-4">
            <StatusBar style="light"/>
            {isSearchVisible && (
                <Animated.View style={{ opacity: searchAnimation }} className="mb-2">
                    <TextInput
                        placeholder="Search messages"
                        value={searchText}
                        onChangeText={setSearchText}
                        className="border border-gray-300 rounded-md p-2 bg-white"
                    />
                </Animated.View>
            )}

            {loading ? ( // Show loading indicator while fetching
                <ActivityIndicator size="large" color="#00e5e5" className="mt-4" />
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={item => item.chatID}
                    renderItem={({ item }) => (
                        <Pressable
                            className="flex-row items-center p-2 border-b border-gray-200"
                            onPress={() => navigation.navigate("OtherScreens", {
                                screen: "Chat",
                                params: {
                                    chatID: item.chatID,
                                    id: item.partner.id,
                                    mail: item.partner.mail,
                                    name: item.partner.name,
                                    profile: item.partner.profile
                                }
                            })}
                        >
                            <Image
                                source={item.partner.profile ? { uri: item.partner.profile } : ProfilePicture}
                                className="h-12 w-12 rounded-full"
                            />
                            <View className="ml-3 flex-1">
                                <Text className="font-bold">{item.partner.name}</Text>
                                <Text className="text-gray-500">{item.lastMessage}</Text>
                            </View>
                            <Text className="text-gray-400">{formatMessageDate(item.timestamp)}</Text>
                        </Pressable>
                    )}
                />
            )}
            <FAB />
        </View>
    );
};

export default MessageList;
