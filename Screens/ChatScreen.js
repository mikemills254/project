import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Animated, FlatList, TouchableOpacity, TouchableWithoutFeedback, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import MessageBubble from '../components/MessageBubble';
import { useSelector } from 'react-redux';
import { serverTimestamp, doc, addDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../Utilities/Firebaseconfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import uuid from 'react-native-uuid';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';


const mediaOptions = [
    { id: 1, icon: 'image', label: 'Image', type: 'image' },
    { id: 2, icon: 'document', label: 'Document', type: 'document' },
    { id: 3, icon: 'videocam', label: 'Video', type: 'video' },
    { id: 4, icon: 'mic', label: 'Audio', type: 'audio' },
];

export default function ChatScreen({ route, navigation }) {
    const [message, setMessage] = useState("");
    const [groupedMessages, setGroupedMessages] = useState([]);
    const { userID } = useSelector(state => state.auth.user);
    const attachMenuAnimation = useRef(new Animated.Value(0)).current;
    const [attachMedia, setAttachMedia] = useState(false);
    const [mediaUploads, setMediaUploads] = useState({});
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState(null);

    console.log("params", route.params)

    useEffect(() => {
        const chatID = route.params.chatID;
        const q = query(
            collection(db, "chats", chatID, "messages"),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let messages = [];
            snapshot.forEach(doc => {
                messages.push(doc.data());
            });
            const grouped = groupMessagesByDate(messages);
            setGroupedMessages(grouped);
        });

        return () => unsubscribe();
    }, [route.params.chatID]);

    const groupMessagesByDate = (messages) => {
        const grouped = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        messages.forEach(msg => {
            const messageDate = msg.timestamp ? msg.timestamp.toDate() : new Date();
            let dateString;

            if (isSameDay(messageDate, today)) {
                dateString = 'Today';
            } else if (isSameDay(messageDate, yesterday)) {
                dateString = 'Yesterday';
            } else {
                dateString = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }

            if (!grouped[dateString]) {
                grouped[dateString] = [];
            }
            grouped[dateString].push(msg);
        });

        return Object.keys(grouped).map(date => ({
            title: date,
            data: grouped[date]
        }));
    };

    const isSameDay = (date1, date2) => {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable>
                    <Ionicons name='ellipsis-vertical' size={20}/>
                </Pressable>
            )
        });
    }, [navigation]);

    const handleSendMessage = async (messageContent, messageType = 'text', mediaUri = null, thumbnail = null, name = null) => {
        const messageId = uuid.v4();
    
        let newMessage = {
            type: messageType,
            sender: userID,
            recipient: route.params.id,
            timestamp: serverTimestamp(),
            id: messageId,
            thumbnail: thumbnail,
            content: messageContent,
            chatID: route.params.chatID,
            status: 'sending',
            name: name // Add the name to the message object
        };
    
        // Update UI immediately
        setGroupedMessages(prev => {
            const newGroupedMessages = [...prev];
            const lastGroup = newGroupedMessages[newGroupedMessages.length - 1];
            if (lastGroup && lastGroup.title === 'Today') {
                lastGroup.data.push(newMessage);
            } else {
                newGroupedMessages.push({ title: 'Today', data: [newMessage] });
            }
            return newGroupedMessages;
        });
        setMessage("");
    
        if (messageType === 'text') {
            try {
                await addDoc(collection(db, "chats", route.params.chatID, "messages"), newMessage);
                updateMessageStatus(messageId, 'sent');
            } catch (error) {
                console.error("Error sending message:", error);
                updateMessageStatus(messageId, 'error');
            }
        } else {
            // For media messages, pass the name along
            uploadMedia(mediaUri, messageType, messageId, name, thumbnail);
        }
    };
    

    const updateMessageStatus = (messageId, status) => {
        setGroupedMessages(prev => 
            prev.map(group => ({
                ...group,
                data: group.data.map(msg => 
                    msg.id === messageId ? { ...msg, status } : msg
                )
            }))
        );
    };

    const uploadMedia = async (uri, type, messageId, name, thumbnail = null) => {
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileRef = ref(storage, `${type}/${Date.now()}_media`);
    
            updateMessageStatus(messageId, 'uploading');
    
            await uploadBytes(fileRef, blob);
    
            const mediaURL = await getDownloadURL(fileRef);
    
            const mediaMessage = {
                sender: userID,
                recipient: route.params.id,
                content: mediaURL,
                type,
                name: name,
                thumbnail: thumbnail,
                timestamp: serverTimestamp(),
                id: messageId,
                chatID: route.params.chatID,
                status: 'sent'
            };
    
            await addDoc(collection(db, "chats", route.params.chatID, "messages"), mediaMessage);
    
            updateMessageStatus(messageId, 'sent');
            setMediaUploads(prev => {
                const newUploads = { ...prev };
                delete newUploads[messageId];
                return newUploads;
            });
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            Alert.alert("Error", `Failed to upload ${type}`);
            updateMessageStatus(messageId, 'error');
        }
    };
    

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

    const closeMenuOnOutsideClick = () => {
        if (attachMedia) {
            toggleAttachMenu();
        }
    };

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
        }
        toggleAttachMenu();
    };

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });
    
            if (!result.canceled && result.assets[0]) {
                handleSendMessage(result.assets[0].uri, 'image', result.assets[0].uri);
            }
        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const pickVideo = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 1,
            });
    
            if (!result.canceled && result.assets[0]) {
                const { uri: videoUri } = result.assets[0];
                try {
                    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
                        time: 0,
                    });
                    handleSendMessage(videoUri, 'video', videoUri, thumbnailUri, result.assets[0].name);
                } catch (thumbnailError) {
                    console.error("Error generating thumbnail:", thumbnailError);
                    handleSendMessage(videoUri, 'video', videoUri, null, result.assets[0].name);
                }
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
                handleSendMessage(result.assets[0].uri, 'audio', result.assets[0].uri, result.assets[0].name);
            }
        } catch (error) {
            console.error("Error picking audio:", error);
            Alert.alert("Error", "Failed to pick audio");
        }
    };

    const pickDocument = async () => {
        try {
            let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    
            if (!result.canceled && result.assets[0]) {
                const { uri, name } = result.assets[0];
                handleSendMessage(uri, 'file', uri, null, name);
            }
        } catch (error) {
            console.error("Error picking document:", error);
            Alert.alert("Error", "Failed to pick document");
        }
    };    

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return;

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording', error);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setIsRecording(false);
            handleSendMessage(uri, 'audio', uri);
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const renderDateHeader = ({ section: { title } }) => (
        <View className="py-2 px-4 bg-gray-200 rounded-full self-center my-2">
            <Text className="text-xs text-gray-600">{title}</Text>
        </View>
    );

    const renderMessage = ({ item }) => (
        <MessageBubble 
            message={item} 
            mediaUploadProgress={mediaUploads[item.id]}
        />
    );

    return (
        <TouchableWithoutFeedback onPress={closeMenuOnOutsideClick}>
            <View className="flex-1">
                <StatusBar style='dark' />
                <FlatList
                    data={groupedMessages}
                    renderItem={({ item }) => (
                        <>
                            {renderDateHeader({ section: item })}
                            <FlatList
                                data={item.data}
                                renderItem={renderMessage}
                                keyExtractor={(msg) => msg.id}
                            />
                        </>
                    )}
                    keyExtractor={(item) => item.title}
                    className="flex-1 p-4 py-2"
                />
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
                    <View className="flex flex-row p-3 items-center justify-evenly">
                        {mediaOptions.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                className="w-20 h-20 flex flex-col items-center justify-center p-2"
                                onPress={() => handleMediaOption(item.type)}
                            >
                                <Ionicons name={item.icon} size={24} color="white" />
                                <Text className="text-xs mt-1 text-white">{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                <View className="flex-row items-center bg-white w-full justify-between p-2 border-t border-gray-300">
                    <Pressable className="p-1" onPress={toggleAttachMenu}>
                        <Ionicons name='attach' size={24} color="gray" />
                    </Pressable>
                    <View className="h-12 flex flex-row w-[80%] items-center justify-between rounded-md px-2 bg-gray-100">
                        <TextInput
                            placeholder='Type something..'
                            multiline
                            value={message}
                            selectionColor={"gray"}
                            onChangeText={setMessage}
                            className="py-2 text-gray-800 flex-1"
                        />
                        {message.length > 0 && (
                            <Pressable onPress={() => handleSendMessage(message)}>
                                <Ionicons name='send' size={18} color="gray" />
                            </Pressable>
                        )}
                    </View>
                    <TouchableOpacity 
                        onPress={isRecording ? stopRecording : startRecording}
                        className="p-2"
                    >
                        <Ionicons 
                            name={isRecording ? "stop-circle" : "mic-outline"} 
                            size={26} 
                            color={isRecording ? "red" : "gray"}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
    )
}