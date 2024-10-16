import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    View, 
    TextInput, 
    ScrollView, 
    TouchableOpacity, 
    Text, 
    Alert, 
    Image, 
    FlatList, 
    ActivityIndicator,
    Animated,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import ChatBubble from '../components/ChatBubble';
import { 
    addDoc, 
    collection, 
    onSnapshot, 
    query, 
    where, 
    orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import * as Contacts from 'expo-contacts';
import { db, storage } from "../Utilities/Firebaseconfig";
import { useSelector } from 'react-redux';
import uuid from 'react-native-uuid';
import { StatusBar } from 'expo-status-bar';

const mediaOptions = [
    { id: 1, icon: 'image', label: 'Image', type: 'image' },
    { id: 2, icon: 'document', label: 'Document', type: 'document' },
    { id: 3, icon: 'videocam', label: 'Video', type: 'video' },
    { id: 4, icon: 'mic', label: 'Audio', type: 'audio' },
    // { id: 6, icon: 'person', label: 'Contact', type: 'contact' },
];

export default function ChatScreen({ route, navigation }) {
    const { id, name, mail, profile, chatID } = route.params || {};
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [recording, setRecording] = useState(null);
    const [recordedUri, setRecordedUri] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [attachMedia, setAttachMedia] = useState(false);
    
    const { userID, userName, email, profileImage } = useSelector(state => state.auth.user);
    const scrollToLatest = useRef(null);
    const attachMenuAnimation = useRef(new Animated.Value(0)).current;

    console.log("prams", route.params)

    useEffect(() => {
        setTimeout(() => {
            scrollToLatest.current?.scrollToEnd({ animated: true });
        }, 1000);
    }, [messages]);

    useEffect(() => {
        const q = query(
            collection(db, 'messages'),
            where('chatID', '==', chatID),
            orderBy('timestamp', 'asc')
        );
    
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(newMessages);
        });
    
        return () => unsubscribe();
    }, [chatID]);

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

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });
    
            if (!result.canceled && result.assets[0]) {
                await uploadMedia(result.assets[0].uri, 'image');
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

    const pickDocument = async () => {
        try {
            let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    
            if (!result.canceled && result.assets[0]) {
                await uploadMedia(result.assets[0].uri, 'file', null, result.assets[0].name, result.assets[0].mimeType);
            }
        } catch (error) {
            console.error("Error picking document:", error);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const shareContact = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.PhoneNumbers],
                });
    
                if (data.length > 0) {
                    const contact = data[0];
                    const contactMessage = {
                        sender: {
                            id: userID,
                            name: userName,
                            email: email
                        },
                        recipient: {
                            id: id,
                            name: name,
                            email: mail
                        },
                        content: JSON.stringify(contact),
                        type: "contact",
                        timestamp: new Date().getTime(),
                        id: uuid.v4(),
                        chatID: chatID
                    };
    
                    await addDoc(collection(db, 'messages'), contactMessage);
                }
            }
        } catch (error) {
            console.error("Error sharing contact:", error);
            Alert.alert("Error", "Failed to share contact");
        }
    };

    const uploadMedia = async (uri, type, thumbnailUri = null, fileName = null, mimeType = null) => {
        try {
            setIsLoading(true)
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
                    id: userID,
                    name: userName,
                    email: email
                },
                recipient: {
                    id: id,
                    name: name,
                    email: mail
                },
                content: mediaURL,
                thumbnailURL,
                type,
                fileName,
                mimeType,
                timestamp: new Date().getTime(),
                id: uuid.v4(),
                chatID: chatID
            };

            await addDoc(collection(db, 'messages'), mediaMessage);
            setIsLoading(false)
        } catch (error) {
            setIsLoading(false)
            console.error(`Error uploading ${type}:`, error);
            Alert.alert("Error", `Failed to upload ${type}`);
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
            setRecordedUri(uri);
            setIsRecording(false);
            await uploadMedia(uri, 'audio');
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    const handleSendMessage = async () => {
        if (inputMessage.trim() === "") return;
        
        try {
            setIsLoading(true);
            const message = {
                sender: {
                    id: userID,
                    name: userName,
                    email: email
                },
                recipient: {
                    id: id,
                    name: name,
                    email: mail
                },
                content: inputMessage.trim(),
                type: "text",
                timestamp: new Date().getTime(),
                id: uuid.v4(),
                chatID: chatID
            };
            
            setInputMessage('');
            await addDoc(collection(db, 'messages'), message);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message");
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
            case 'contact':
                shareContact();
                break;
        }
        toggleAttachMenu();
    };

    return (
        <View className="flex-1 bg-gray-100">
            <StatusBar style="dark" />
            
            <ScrollView
                className="flex-1 px-4"
                ref={scrollToLatest}
            >
                {messages.map((message) => (
                    <ChatBubble key={message?.id} message={message} />
                ))}
            </ScrollView>

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
                        data={mediaOptions}
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

            <View className="flex-row items-center bg-white w-full justify-between py-2 border-t border-gray-300">
                <TouchableOpacity onPress={toggleAttachMenu} className="p-2">
                    <Ionicons name="attach" size={24} color="gray" />
                </TouchableOpacity>

                <View className="h-12 flex flex-row w-[80%] items-center justify-between rounded-md px-2 bg-gray-100">
                    <TextInput
                        placeholder="Type a message..."
                        value={inputMessage}
                        multiline
                        onChangeText={setInputMessage}
                        className="py-2 text-gray-800 flex-1"
                    />
                    <TouchableOpacity 
                        onPress={handleSendMessage} 
                        className="ml-3"
                        disabled={inputMessage.length === 0 && !isLoading}
                    >
                        {isLoading ? 
                            <ActivityIndicator color="gray" /> : 
                            <Ionicons 
                                name='send' 
                                size={18} 
                                color={inputMessage.length > 0 ? "gray" : "#D3D3D3"}
                            />
                        }
                    </TouchableOpacity>
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
    );
}