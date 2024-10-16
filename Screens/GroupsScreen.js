import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, FlatList, Keyboard, Animated
} from 'react-native';
import { useSelector } from 'react-redux';
import {
    collection, addDoc, onSnapshot, query, orderBy,
    serverTimestamp, doc, updateDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from "../Utilities/Firebaseconfig";
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Audio } from 'expo-av';
import uuid from 'react-native-uuid';


const MEDIA_OPTIONS = [
    { id: 1, icon: 'image', label: 'Image', type: 'image' },
    { id: 2, icon: 'document', label: 'Document', type: 'document' },
    // { id: 3, icon: 'videocam', label: 'Video', type: 'video' },
    // { id: 4, icon: 'mic', label: 'Audio', type: 'audio' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ChatScreen({ route, navigation }) {
    const { name, id } = route.params;
    const [messages, setMessages] = useState([]);
    const [groupedMessages, setGroupedMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [attachMedia, setAttachMedia] = useState(false);
    const flatListRef = useRef(null);
    const { userID, userName, email } = useSelector(state => state.auth.user);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const attachMenuAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            e => setKeyboardHeight(e.endCoordinates.height)
        );
        
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0)
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleExitConfirmation}
                    className="px-4 py-2"
                >
                    <Text className="text-red-500 font-semibold">Leave</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation]);

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
            
            const grouped = newMessages.reduce((acc, message) => {
                if (!message.createdAt) return acc;
                
                const dateLabel = getDateLabel(message.createdAt);
                if (!acc[dateLabel]) {
                    acc[dateLabel] = [];
                }
                acc[dateLabel].push(message);
                return acc;
            }, {});
            
            const groupedArray = Object.entries(grouped).map(([date, msgs]) => ({
                title: date,
                data: msgs
            }));
            
            setGroupedMessages(groupedArray);
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, [name]);

    const handleExitConfirmation = () => {
        Alert.alert(
            "Leave Group",
            "Are you sure you want to leave this group?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Leave", onPress: handleExit, style: "destructive" }
            ]
        );
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
    
            if (admin.userID === userID && updatedParticipants.length > 0) {
                const newAdmin = updatedParticipants[0];
                await updateDoc(groupRef, {
                    admin: {
                        userID: newAdmin.userID,
                        userName: newAdmin.userName,
                        email: newAdmin.email
                    }
                });
            }
    
            navigation.navigate("MainScreens", { screen: "Groups" });
        } catch (error) {
            console.error("Error leaving the group:", error);
            Alert.alert("Error", "Failed to leave the group. Please try again.");
        }
    };

    const getDateLabel = (timestamp) => {
        const messageDate = timestamp.toDate();
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (messageDate.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (messageDate.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            if (messageDate.getFullYear() !== today.getFullYear()) {
                options.year = 'numeric';
            }
            return messageDate.toLocaleDateString('en-US', options);
        }
    };

    const updateLatestMessage = async (messageData) => {
        try {
            const groupRef = doc(db, "groups", id);
            let lastMessageText = '';
    
            switch (messageData.type) {
                case 'text':
                    lastMessageText = messageData.text;
                    break;
                case 'image':
                    lastMessageText = '📷 Image';
                    break;
                case 'document':
                    lastMessageText = `📄 ${messageData.fileName}`;
                    break;
                case 'video':
                    lastMessageText = '🎥 Video';
                    break;
                case 'audio':
                    lastMessageText = '🎵 Audio';
                    break;
                default:
                    lastMessageText = 'New message';
            }
    
            const lastMessage = {
                text: lastMessageText,
                type: messageData.type,
                sender: {
                    userID: messageData.sender.userID,
                    userName: messageData.sender.userName
                },
                timestamp: messageData.createdAt || serverTimestamp()
            };
    
            await updateDoc(groupRef, { lastMessage });
        } catch (error) {
            console.error("Error updating last message:", error);
        }
    };

    const sendMessage = async (fileData = null) => {
        if ((!inputText.trim() && !fileData) || isLoading) return;

        setIsLoading(true);
        try {
            const messageData = {
                text: inputText.trim(),
                sender: {
                    userID,
                    userName,
                    email
                },
                type: "text",
                createdAt: serverTimestamp(),
                ...fileData
            };

            console.log("the message", messageData)

            await addDoc(collection(db, `s/${name}/messages`), messageData);
            await updateLatestMessage(messageData);
            
            setInputText('');
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert('Error', 'Failed to send message. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            setIsLoading(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });
    
            if (!result.canceled && result.assets[0]) {
                const imageUri = result.assets[0].uri;
                
                const response = await fetch(imageUri);
                const blob = await response.blob();
                const imageRef = ref(storage, `${name}/images/${Date.now()}.jpg`);
                await uploadBytes(imageRef, blob);
                const imageURL = await getDownloadURL(imageRef);
                
                const imageMessage = {
                    text: '',
                    type: 'image',
                    url: imageURL,
                    sender: {
                        userID,
                        userName,
                        email
                    },
                    createdAt: serverTimestamp()
                };
    
                await addDoc(collection(db, `s/${name}/messages`), imageMessage);
                await updateLatestMessage(imageMessage);
            }
        } catch (error) {
            console.error("Error sending image:", error);
            Alert.alert("Error", "Failed to send image. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const pickDocument = async () => {
        try {
            setIsLoading(true);
            const result = await DocumentPicker.getDocumentAsync();
            
            if (!result.canceled && result.assets[0]) {
                const { name: fileName, size, uri, mimeType } = result.assets[0];
                
                if (size > MAX_FILE_SIZE) {
                    throw new Error('File size exceeds 10MB limit');
                }
    
                const response = await fetch(uri);
                const blob = await response.blob();
                const docRef = ref(storage, `${name}/documents/${Date.now()}-${fileName}`);
                await uploadBytes(docRef, blob);
                const downloadURL = await getDownloadURL(docRef);
                
                const documentMessage = {
                    text: '',
                    type: 'document',
                    fileName,
                    fileSize: size,
                    url: downloadURL,
                    mimeType,
                    sender: {
                        userID,
                        userName,
                        email
                    },
                    createdAt: serverTimestamp()
                };
    
                await addDoc(collection(db, `s/${name}/messages`), documentMessage);
                await updateLatestMessage(documentMessage);
            }
        } catch (error) {
            console.error("Error sending document:", error);
            Alert.alert('Error', 'Failed to send document. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileDownload = async (url, fileName) => {
        try {
            const { status } = await FileSystem.downloadAsync(
                url,
                FileSystem.documentDirectory + fileName
            );
            
            if (status === 200) {
                Alert.alert('Success', 'File downloaded successfully!');
            }
        } catch (error) {
            console.error("Error downloading file:", error);
            Alert.alert('Error', 'Failed to download file. Please try again.');
        }
    };

    const renderMessage = ({ item }) => {
        const isOwnMessage = item.sender.userID === userID;
    
        return (
            <View className={`flex ${isOwnMessage ? 'items-end' : 'items-start'} mb-2`}>
                <View 
                    className={`max-w-[80%] ${isOwnMessage ? 'bg-blue-500' : 'bg-gray-200'} 
                    rounded-lg p-3 ${isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                >
                    {!isOwnMessage && (
                        <Text className={`text-xs ${isOwnMessage ? 'text-white' : 'text-gray-600'} mb-1`}>
                            {item.sender.userName}
                        </Text>
                    )}
                    
                    {item.type === 'image' && (
                        <TouchableOpacity onPress={() => handleFileDownload(item.url, 'image.jpg')}>
                            <Image 
                                source={{ uri: item.url }} 
                                className="w-48 h-48 rounded-lg mb-2"
                            />
                        </TouchableOpacity>
                    )}
                    
                    {item.type === 'document' && (
                        <TouchableOpacity 
                            onPress={() => handleFileDownload(item.url, item.fileName)}
                            className={`flex-row items-center p-2 ${isOwnMessage ? 'bg-blue-400' : 'bg-white'} rounded-lg mb-2 w-full`}
                        >
                            <Ionicons 
                                name="document-text" 
                                size={24} 
                                color={isOwnMessage ? "white" : "#666"} 
                                style={{ marginRight: 8 }}
                            />
                            <View className="flex-1 w-full">
                                <Text 
                                    className={`font-medium ${isOwnMessage ? 'text-white' : 'text-black'}`} 
                                    numberOfLines={1}
                                >
                                    {item.fileName}
                                </Text>
                                <Text className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                    {(item.fileSize / 1024).toFixed(1)} KB
                                </Text>
                            </View>
                            <Ionicons 
                                name="download-outline" 
                                size={20} 
                                color={isOwnMessage ? "white" : "#666"}
                            />
                        </TouchableOpacity>
                    )}
                    
                    {item.type === 'video' && (
                        <TouchableOpacity onPress={() => handleVideoPlay(item.url)}>
                            <View className="relative w-48 h-48 rounded-lg mb-2 bg-black">
                                {item.thumbnailURL && (
                                    <Image 
                                        source={{ uri: item.thumbnailURL }} 
                                        className="w-full h-full rounded-lg"
                                    />
                                )}
                                <View className="absolute inset-0 flex items-center justify-center">
                                    <Ionicons name="play-circle" size={48} color="white" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    
                    {item.type === 'audio' && (
                        <TouchableOpacity onPress={() => handleAudioPlay(item.url)}
                            className={`flex-row items-center p-2 ${isOwnMessage ? 'bg-blue-400' : 'bg-white'} rounded-lg mb-2 w-full`}
                        >
                            <Ionicons 
                                name="musical-note" 
                                size={24} 
                                color={isOwnMessage ? "white" : "#666"} 
                                style={{ marginRight: 8 }}
                            />
                            <Text className={`font-medium ${isOwnMessage ? 'text-white' : 'text-black'}`}>
                                Audio Message
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    {item.text && (
                        <Text className={isOwnMessage ? 'text-white' : 'text-black'}>
                            {item.text}
                        </Text>
                    )}
                    
                    <Text className={`text-xs mt-1 ${isOwnMessage ? 'text-white' : 'text-gray-500'}`}>
                        {item.createdAt?.toDate().toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </View>
            </View>
        );
    };

    const renderHeader = ({ section: { title } }) => (
        <View className="py-2 px-4">
            <View className="bg-gray-100 rounded-full px-3 py-1 self-center">
                <Text className="text-center text-gray-600 text-xs font-medium">
                    {title}
                </Text>
            </View>
        </View>
    );

    const toggleAttachMenu = useCallback(() => {
        const newValue = !attachMedia;
        setAttachMedia(newValue);
    
        Animated.spring(attachMenuAnimation, {
            toValue: newValue ? 1 : 0,
            useNativeDriver: true,
            tension: 100,
            friction: 6,
        }).start();
    }, [attachMedia]);

    const handleMediaOption = (type) => {
        switch (type) {
            case 'image':
                pickImage();
                break;
            case 'document':
                pickDocument();
                break;
            case 'video':
                pickVideo();
                break;
            case 'audio':
                pickAudio();
                break;
            default:
                console.warn('Unhandled media type:', type);
        }
        toggleAttachMenu();
    };

    const pickVideo = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });
    
            if (!result.canceled && result.assets[0]) {
                const thumbnail = await VideoThumbnails.getThumbnailAsync(result.assets[0].uri);
                await uploadMedia(result.assets[0].uri, 'video', thumbnail.uri);
            }
        } catch (error) {
            console.error("Error picking video:", error);
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const pickAudio = async () => {
        try {
            let result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    
            if (!result.canceled && result.assets[0]) {
                await uploadMedia(result.assets[0].uri, 'audio');
            }
        } catch (error) {
            console.error("Error picking audio:", error);
            Alert.alert("Error", "Failed to pick audio");
        }
    };

    const uploadMedia = async (uri, type, thumbnailUri = null, fileName = null, mimeType = null) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileRef = ref(storage, `${type}/${Date.now()}_${fileName || 'media'}`);
            await uploadBytes(fileRef, blob);
            const mediaURL = await getDownloadURL(fileRef);
            
            let thumbnailURL = null;
            if (thumbnailUri) {
                const thumbnailResponse = await fetch(thumbnailUri);
                const thumbnailBlob = await thumbnailResponse.blob();
                const thumbnailRef = ref(storage, `thumbnails/${Date.now()}_thumbnail.jpg`);
                await uploadBytes(thumbnailRef, thumbnailBlob);
                thumbnailURL = await getDownloadURL(thumbnailRef);
            }
            
            const mediaMessage = {
                sender: {
                    userID: userID,
                    userName: userName,
                    email: email
                },
                url: mediaURL,
                thumbnailURL,
                type: "video",
                fileName,
                mimeType: "video/mp4",
                timestamp: new Date().getTime(),
                id: uuid.v4(),
            };


            await addDoc(collection(db, `s/${name}/messages`), mediaMessage);
            updateLatestMessage(mediaMessage)
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            Alert.alert("Error", `Failed to upload ${type}`);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <StatusBar style='dark'/>
            <FlatList
                ref={flatListRef}
                data={groupedMessages}
                keyExtractor={(item, index) => item.title + index}
                renderItem={({ item: section }) => (
                    <View key={section.title}>
                        {renderHeader({ section })}
                        {section.data.map(message => renderMessage({ item: message }))}
                    </View>
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={<View className="h-4" />}
                className="px-2"
            />

            {uploadProgress > 0 && uploadProgress < 100 && (
                <View className="px-4 py-2">
                    <View className="h-2 bg-gray-200 rounded-full">
                        <View 
                            className="h-2 bg-blue-500 rounded-full" 
                            style={{ width: `${uploadProgress}%` }} 
                        />
                    </View>
                </View>
            )}

            <Animated.View
                style={{
                    opacity: attachMenuAnimation,
                    transform: [{
                        translateY: attachMenuAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0]
                        })
                    }],
                    position: 'absolute',
                    bottom: 70,
                    left: 12,
                    right: 12,
                    zIndex: attachMenuAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-1, 1]
                    })
                }}
                className="bg-[#0c5255] shadow-lg rounded-md overflow-hidden"
            >
                <View className="p-3">
                    <FlatList
                        data={MEDIA_OPTIONS}
                        numColumns={3}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                onPress={() => handleMediaOption(item.type)}
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    marginBottom: 20,
                                    width: 80,
                                    marginTop: 20,
                                }}
                            >
                                <Ionicons name={item.icon} size={24} color="white" />
                                <Text className="text-sm mt-1 text-white">{item.label}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Animated.View>
            
            <View className="flex-row items-center p-4 bg-white border-t border-gray-200">
                <TouchableOpacity onPress={toggleAttachMenu} className="p-2">
                    <Ionicons name="attach" size={24} color="gray" />
                </TouchableOpacity>
                <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    multiline
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 mr-2 max-h-24"
                    style={{
                        paddingTop: Platform.OS === 'ios' ? 10 : 8,
                        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                    }}
                />
                <TouchableOpacity
                    onPress={() => sendMessage()}
                    disabled={isLoading || !inputText.trim()}
                    className={`p-2 rounded-full ${!inputText.trim() ? 'opacity-50' : ''}`}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#0084ff" />
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