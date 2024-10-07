import FAB from '../components/FAB';
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, Image, Pressable } from 'react-native';
import profile from "../assets/blank-profile-picture-973460_1280.png";
import { useNavigation } from '@react-navigation/native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../Utilities/Firebaseconfig';
import { useSelector } from 'react-redux';
import { format } from 'date-fns'; 
import { useIsFocused } from '@react-navigation/native'
import Icon from "react-native-vector-icons/Ionicons"
import { StatusBar } from 'expo-status-bar';
import AntDesign from "react-native-vector-icons/AntDesign"

const MessageList = () => {
    const [searchText, setSearchText] = useState('');
    const navigation = useNavigation();
    const { userID, profileImage } = useSelector(state => state.auth.user);
    const [messages, setMessages] = useState([]);
    const isFocused = useIsFocused()

    useEffect(() => {
        const getAllMessages = () => {
            const sentMessagesQuery = query(
                collection(db, "messages"),
                where('sender.id', '==', userID),
                orderBy('timestamp', 'desc')
            );
            
            const receivedMessagesQuery = query(
                collection(db, "messages"),
                where('recipient.id', '==', userID),
                orderBy('timestamp', 'desc')
            );
    
            const unsubscribeSent = onSnapshot(sentMessagesQuery, (sentSnapshot) => {
                const unsubscribeReceived = onSnapshot(receivedMessagesQuery, (receivedSnapshot) => {
                    const sentMessages = sentSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    const receivedMessages = receivedSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    const allMessages = [...sentMessages, ...receivedMessages];
                    setMessages(allMessages);
                });
                
                return () => unsubscribeReceived();
            });
    
            return () => unsubscribeSent();
        };
    
        const unsubscribe = getAllMessages();
        return () => unsubscribe();
    }, [userID]);

    // Group messages by conversation
    const groupMessagesByConversation = (messages) => {
        const groupedMessages = {};
        messages.forEach((message) => {
            let conversationPartnerId;
            let conversationPartner;
            
            if (message.sender.id === userID) {
                conversationPartnerId = message.recipient.id;
                conversationPartner = message.recipient;
            } else {
                conversationPartnerId = message.sender.id;
                conversationPartner = message.sender;
            }
            
            if (!groupedMessages[conversationPartnerId] || 
                message.timestamp > groupedMessages[conversationPartnerId].timestamp) {
                groupedMessages[conversationPartnerId] = {
                    partner: conversationPartner,
                    lastMessage: message.type === "text" ? message.content : message.type === "image" ? <Icon size={20} name="image"/>: <AntDesign size={20} name="filetext1"/>,
                    timestamp: message.timestamp
                };
            }
        });
        return Object.values(groupedMessages);
    };

    const groupedMessages = groupMessagesByConversation(messages);

    // Filter messages based on search text
    const filteredMessages = groupedMessages.filter(item =>
        item.partner.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return format(date, 'dd/MM/yyyy HH:mm');
    };

    const today = new Date().toLocaleDateString();

    return (
        <View className="flex-1 bg-white p-3">
            <StatusBar style="dark"/>
            <TextInput
                placeholder="Search messages"
                value={searchText}
                onChangeText={setSearchText}
                className="border border-gray-300 rounded-md px-4 py-2 mb-0 bg-white"
            />

            <FlatList
                data={filteredMessages}
                keyExtractor={item => item.partner.id}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => navigation.navigate("OtherScreens", {
                            screen: "Chat",
                            params: {
                                id: item.partner.id,
                                mail: item.partner.email,
                                name: item.partner.name
                            }
                        })}
                        key={item.id}
                        className="flex flex-row p-2 w-full items-center bg-white"
                    >
                        <View className="w-12 h-12 rounded-full overflow-hidden mr-2">
                            <Image source={ profile } className="w-full h-full object-cover" />
                        </View>

                        <View className="flex-1 rounded-lg p-3 shadow-sm bg-white">
                            <View className="flex flex-row justify-between">
                                <Text className="text-base font-semibold text-gray-800">
                                    {item.partner.name}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                    {formatTimestamp(item.timestamp) === today ? "Today" : formatTimestamp(item.timestamp)}
                                </Text>
                            </View>

                            <Text className="text-sm text-gray-700 mt-1">
                                {item.lastMessage}
                            </Text>
                        </View>
                    </Pressable>
                )}
            />
            {
                isFocused ? <FAB /> : null
            }
        </View>
    );
};

export default function MainScreen() {
    return (
        <MessageList />
    );
}
