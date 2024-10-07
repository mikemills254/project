import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Image, KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, FlatList, Keyboard
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
import { useLayoutEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';


export default function ChatScreen({ route, navigation }) {
    const { name, id } = route.params;
    const [messages, setMessages] = useState([]);
    const [groupedMessages, setGroupedMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const flatListRef = useRef();
    const { userID, userName, email } = useSelector(state => state.auth.user);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Keyboard handling
    useEffect(() => {
        const keyboardWillShowListener = Platform.OS === 'ios' 
            ? Keyboard.addListener('keyboardWillShow', (e) => setKeyboardHeight(e.endCoordinates.height))
            : Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
        
        const keyboardWillHideListener = Platform.OS === 'ios'
            ? Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0))
            : Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

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

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerRight: () => (
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert(
                            "Leave Group",
                            "Are you sure you want to leave this group?",
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Leave", onPress: handleExit, style: "destructive" }
                            ]
                        );
                    }}
                    className="px-4 py-2"
                >
                    <Text className="text-red-500 font-semibold">Leave</Text>
                </TouchableOpacity>
            )
        });
    }, [navigation]);

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
            console.log("message", newMessages[newMessages.length - 1])
            
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
    }, []);

    const updateLatestMessage = async (messageData) => {
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
                lastMessage.text = `📄 ${messageData.fileName}`;
            }

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
                createdAt: serverTimestamp(),
                ...fileData
            };

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

    const uploadFile = async (uri, type, fileName = null) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            
            const fileRef = ref(storage, `${name}/${Date.now()}-${fileName || 'file'}`);
            
            const uploadTask = uploadBytes(fileRef, blob);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }
            );
            
            await uploadTask;
            const downloadURL = await getDownloadURL(fileRef);
            
            return downloadURL;
        } catch (error) {
            throw error;
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
                console.log("image has been uploaded")
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
                const { name, size, uri, mimeType } = result.assets[0];
                
                // Check file size (10MB limit)
                if (size > 10 * 1024 * 1024) {
                    throw new Error('File size exceeds 10MB limit');
                }
    
                // Upload document to Firebase Storage
                const response = await fetch(uri);
                const blob = await response.blob();
                const docRef = ref(storage, `${name}/documents/${Date.now()}-${name}`);
                await uploadBytes(docRef, blob);
                const downloadURL = await getDownloadURL(docRef);
                
                // Create and send document message
                const documentMessage = {
                    text: '',
                    type: 'document',
                    fileName: name,
                    fileSize: size,
                    url: downloadURL,  // Use the Firebase Storage URL instead of local URI
                    mimeType,
                    sender: {
                        userID,
                        userName,
                        email
                    },
                    createdAt: serverTimestamp()
                };
                setMessages(prevMessages => [...prevMessages, documentMessage])
    
                await addDoc(collection(db, `s/${name}/messages`), documentMessage);
                await updateLatestMessage(documentMessage);
            }
        } catch (error) {
            console.error("Error sending document:", error);
            Alert.alert('Error', error.message || 'Failed to send document. Please try again.');
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
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
                            className={`flex-row items-center p-2 ${isOwnMessage ? 'bg-blue-400' : 'bg-white'} rounded-lg mb-2`}
                        >
                            <Ionicons 
                                name="document-text" 
                                size={24} 
                                color={isOwnMessage ? "white" : "#666"} 
                                style={{ marginRight: 8 }}
                            />
                            <View className="flex-1">
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

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
            <FlatList
                ref={flatListRef}
                data={groupedMessages}
                keyExtractor={(item, index) => item.title + index}
                renderItem={({ item: section }) => (
                    <View key={section.id}>
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
            
            <View className="flex-row items-center p-4 bg-white border-t border-gray-200">
                <TouchableOpacity onPress={pickImage} className="mr-2">
                    <Ionicons name="image" size={24} color="#666" />
                </TouchableOpacity>
                {/* <TouchableOpacity onPress={pickDocument} className="mr-2">
                    <Ionicons name="document-text" size={24} color="#666" />
                </TouchableOpacity> */}
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