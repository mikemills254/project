import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, SectionList, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, ScrollView
} from 'react-native';
import { useSelector } from 'react-redux';
import {
    collection, addDoc, onSnapshot, query, orderBy,
    serverTimestamp, doc, updateDoc, arrayRemove, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from "../Utilities/Firebaseconfig";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect } from 'react';

export default function ChatScreen({ route, navigation }) {
    const { name, id } = route.params;
    const [messages, setMessages] = useState([]);
    const [groupedMessages, setGroupedMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const sectionListRef = useRef();
    const { userID, userName, email } = useSelector(state => state.auth.user);

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const handleExit = async () => {
        const groupRef = doc(db, "groups", id);    
        try {
            const groupSnapshot = await getDoc(groupRef);
            const groupData = groupSnapshot.data();
            const { particapants, admin } = groupData;

            const updatedParticipants = particapants.filter(p => p.userID !== userID);

            await updateDoc(groupRef, {
                particapants: updatedParticipants
            });
    
            if (admin.userID === userID) {
                const remainingParticipants = particapants.filter(p => p.userID !== userID);
    
                if (remainingParticipants.length > 0) {
                    const newAdmin = remainingParticipants[0];
                    await updateDoc(groupRef, {
                        admin: {
                            userID: newAdmin.userID,
                            userName: newAdmin.userName,
                            email: newAdmin.email
                        }
                    });
                    console.log(`New admin assigned: ${newAdmin.userName}`);
                } else {
                    console.log("No participants left to assign as admin.");
                }
            }
    
            console.log("User successfully left the group.");
            navigation.navigate("MainScreens", { screen: "Groups" });
    
        } catch (error) {
            console.error("Error leaving the group:", error);
        }
    };
    

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerRight: () => {
                const handleLeaveGroup = () => {
                    Alert.alert(
                        "Warning",
                        "Are you sure you want to leave the group?",
                        [
                            {
                                text: "Cancel",
                                onPress: () => console.log("Cancelled"),
                                style: "cancel",
                            },
                            {
                                text: "Leave",
                                onPress: () => handleExit(),
                                style: "destructive",
                            },
                        ],
                        { cancelable: true }
                    );
                };

                return (
                    <TouchableOpacity
                        onPress={handleLeaveGroup}
                        className="text-primary border border-primary px-4 py-1 rounded-md"
                    >
                        <Text className="text-primary font-semibold">Leave</Text>
                    </TouchableOpacity>
                );
            }
        });
    }, [navigation]);




    

    const isYesterday = (date) => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return date.getDate() === yesterday.getDate() &&
            date.getMonth() === yesterday.getMonth() &&
            date.getFullYear() === yesterday.getFullYear();
    };

    const getDateLabel = (date) => {
        if (isToday(date)) {
            return 'Today';
        } else if (isYesterday(date)) {
            return 'Yesterday';
        } else {
            const daysDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
            if (daysDiff < 7) {
                return date.toLocaleDateString('en-US', { weekday: 'long' });
            }
            return date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
        }
    };

    const groupMessagesByDate = (msgs) => {
        const groups = {};
        msgs.forEach(message => {
            if (!message.createdAt) return;
            
            const date = new Date(message.createdAt.toDate());
            const dateString = date.toDateString();
            
            if (!groups[dateString]) {
                groups[dateString] = [];
            }
            groups[dateString].push(message);
        });

        return Object.keys(groups)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
                title: getDateLabel(new Date(date)),
                data: groups[date].sort((a, b) => 
                    a.createdAt.toDate() - b.createdAt.toDate()
                )
            }));
    };

    // Scroll handling functions
    const getItemLayout = (data, index) => {
        const ITEM_HEIGHT = 60;
        const SECTION_HEADER_HEIGHT = 40;
        return {
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index + SECTION_HEADER_HEIGHT,
            index,
        };
    };

    const handleScrollToIndexFailed = (info) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
            if (sectionListRef.current) {
                sectionListRef.current.scrollToLocation({
                    sectionIndex: groupedMessages.length - 1,
                    itemIndex: 0,
                    animated: true,
                    viewPosition: 1
                });
            }
        });
    };

    useEffect(() => {
        const q = query(
            collection(db, `s/${name}/messages`),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(newMessages);
            setGroupedMessages(groupMessagesByDate(newMessages));
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (sectionListRef.current && groupedMessages.length > 0) {
            const lastSection = groupedMessages.length - 1;
            const lastItemIndex = groupedMessages[lastSection].data.length - 1;
            
            sectionListRef.current.scrollToLocation({
                sectionIndex: lastSection,
                itemIndex: lastItemIndex,
                viewPosition: 1,
                animated: true
            });
        }
    }, [groupedMessages]);

    const handleUpdateLatestMessage = async (messageData) => {
        try {
            const groupRef = doc(db, "groups", id);
            const lastMessage = {
                text: messageData.text || '',
                type: messageData.type || 'text',
                sender: {
                    userID: messageData.sender.userID,
                    userName: messageData.sender.userName
                },
                timestamp: messageData.createdAt
            };

            if (messageData.type === 'image') {
                lastMessage.text = '📷 Image';
            } else if (messageData.type === 'document') {
                lastMessage.text = '📄 Document: ' + messageData.fileName;
            }

            await updateDoc(groupRef, {
                lastMessage: lastMessage
            });
        } catch (error) {
            console.error("Error updating last message:", error);
        }
    };

    const sendMessage = async (fileData = null) => {
        if ((!inputText.trim() && !fileData) || isLoading) return;

        try {
            const messageData = {
                text: inputText.trim(),
                sender: {
                    userID,
                    userName,
                    email
                },
                createdAt: serverTimestamp(),
                ...fileData
            };
            setMessages(messageData)

            await addDoc(collection(db, `s/${name}/messages`), messageData);
            await handleUpdateLatestMessage(messageData);
            
            setInputText('');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        }
    };
    

    const sendFile = async (uri, type, fileName = null) => {
        setIsLoading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            
            const fileRef = ref(storage, `-${name}/${Date.now()}-${fileName || 'image'}`);
            await uploadBytes(fileRef, blob);
            const downloadURL = await getDownloadURL(fileRef);
            
            await sendMessage({
                type,
                url: downloadURL,
                fileName: fileName
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to send file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled) {
            await sendFile(result.assets[0].uri, 'image');
        }
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'document-text';
            case 'doc':
            case 'docx':
                return 'document';
            case 'xls':
            case 'xlsx':
                return 'document';
            default:
                return 'document-attach';
        }
    };

    const getFileSize = (size) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    };


    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync();
            if (result.type === 'success') {
                setIsLoading(true);
                const { uri, name, size } = result;
                
                const response = await fetch(uri);
                const blob = await response.blob();
                
                const fileRef = ref(storage, `${name}/${Date.now()}-${name}`);
                await uploadBytes(fileRef, blob);
                const downloadURL = await getDownloadURL(fileRef);
                
                await sendMessage({
                    type: 'document',
                    url: downloadURL,
                    fileName: name,
                    fileSize: size
                });
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to pick document');
        } finally {
            setIsLoading(false);
        }
    };

    const renderMessage = ({ item }) => {
        const isOwnMessage = item.sender.userID === userID;

        return (
            <View className={`flex ${isOwnMessage ? 'items-end' : 'items-start'} mb-2`}>
                <View className={`max-w-[80%] ${isOwnMessage ? 'bg-gray-300' : 'bg-gray-200'} rounded-lg p-3`}>
                    {!isOwnMessage && (
                        <Text className="text-xs text-gray-800 mb-1">{item.sender.userName}</Text>
                    )}
                    
                    {item.type === 'image' && (
                        <Image 
                            source={{ uri: item.url }} 
                            className="w-48 h-48 rounded-lg mb-2"
                        />
                    )}
                    
                    {item.type === 'document' && (
                        <TouchableOpacity 
                            onPress={() => handleFileDownload(item.url, item.fileName)}
                            className="flex-row items-center p-2 bg-gray-100 rounded-lg mb-2"
                        >
                            <View className="mr-3">
                                <Ionicons 
                                    name={getFileIcon(item.fileName)} 
                                    size={24} 
                                    color="#666"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="font-medium" numberOfLines={1}>
                                    {item.fileName}
                                </Text>
                                {item.fileSize && (
                                    <Text className="text-xs text-gray-500">
                                        {getFileSize(item.fileSize)}
                                    </Text>
                                )}
                            </View>
                            <Ionicons name="download-outline" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                    
                    {item.text && (
                        <Text className={isOwnMessage ? 'text-gray-800' : 'text-black'}>
                            {item.text}
                        </Text>
                    )}
                    
                    <Text className={`text-xs mt-1 self-end ${isOwnMessage ? 'text-gray-800' : 'text-gray-500'}`}>
                        {item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <View className="py-2 px-4">
            <View className="bg-gray-200 rounded-full px-3 py-1 self-center">
                <Text className="text-center text-gray-600 text-xs font-medium">
                    {title}
                </Text>
            </View>
        </View>
    );

    const scrollViewRef = useRef(null)

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <ScrollView
                ref={scrollViewRef}
                className="flex-1 p-3 pb-40"
                contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
                scrollEventThrottle={16}
            >
                {groupedMessages.map((section, sectionIndex) => (
                    <View key={sectionIndex}>
                        {renderSectionHeader({ section })}
                        {section.data.map((item, index) => (
                            <View key={item.id}>
                                {renderMessage({ item })}
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
    
            <View className="flex-row items-center p-2 bg-white border-t border-gray-200">
                <TouchableOpacity onPress={pickImage} className="mr-2">
                    <Ionicons name="image" size={24} color="#666" />
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={pickDocument} className="mr-2">
                    <Ionicons name="attach" size={24} color="#666" />
                </TouchableOpacity> */}
                <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    multiline
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2 mr-2"
                />
                <TouchableOpacity
                    onPress={() => sendMessage()}
                    disabled={isLoading || !inputText.trim()}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#0000ff" />
                    ) : (
                        <Ionicons
                            name="send"
                            size={24}
                            color={inputText.trim() ? "#0084ff" : "#666"}
                        />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );    
}