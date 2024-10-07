import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, Text, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker'; // To handle image picking
import { Audio } from 'expo-av'; // To handle voice recording
import { Ionicons } from '@expo/vector-icons'; // Assuming you're using expo for icons
import ChatBubble from '../components/ChatBubble';
import { addDoc, collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import Storage functions
import * as DocumentPicker from 'expo-document-picker';
import { db, storage } from "../Utilities/Firebaseconfig"
import { useSelector } from 'react-redux';
import uuid from 'react-native-uuid';


export default function ChatScreen({ route, navigation }) {
    const { id, name, mail, profile } = route.params || {};
    console.log("params", route.params)
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [recording, setRecording] = useState(null);
    const [recordedUri, setRecordedUri] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const { userID, userName, email, profileImage } = useSelector(state => state.auth.user)
    const scrollToLatest = useRef(null)
    const [ isLoading, setIsLoading ] = useState(false)

    useEffect(() => {
            setTimeout(() => {
                scrollToLatest.current?.scrollToEnd({ animated: true });
            }, 1000)
    },[messages])

    useEffect(() => {
        const q1 = query(
            collection(db, "messages"),
            where('sender.id', 'in', [userID, id]),
            where('recipient.id', 'in', [userID, id]),
            orderBy('timestamp', 'asc')
        );
    
        const unsubscribe = onSnapshot(q1, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log("the messages", newMessages[newMessages.length - 1].fileName)
            setMessages(newMessages);
        });
    
        return () => unsubscribe();
    }, [userID, id]);


    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });
    
            if (!result.canceled && result.assets[0]) {
                const response = await fetch(result.assets[0].uri);
                const blob = await response.blob();
                const imageRef = ref(storage, `images/${Date.now()}.jpg`);
                await uploadBytes(imageRef, blob);
                const imageURL = await getDownloadURL(imageRef);
                
                const imageMessage = {
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
                    content: imageURL,
                    type: "image",
                    timestamp: new Date().getTime(),
                    id: uuid.v4()
                };

                console.log("image", imageMessage)
                setMessages(prevMessages => [...prevMessages, imageMessage]);
                
                await addDoc(collection(db, 'messages'), imageMessage);
            }
        } catch (error) {
            console.error("Error sending image:", error);
            Alert.alert("Error", "Failed to send image");
        }
    };

    const groupMessagesByDate = (messages) => {
        return messages.reduce((acc, message) => {
            const date = new Date(message.timestamp).toLocaleDateString(); // Format date as needed
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(message);
            return acc;
        }, {});
    };

    const groupedMessages = groupMessagesByDate(messages);
    const today = new Date().toLocaleDateString();

    const pickFiles = async () => {
        let results = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
    
        if (!results.canceled && results.assets) {
            for (const fileAsset of results.assets) {
                try {
                    const response = await fetch(fileAsset.uri);
                    const blob = await response.blob();
                    
                    const fileName = fileAsset.name;
                    const fileRef = ref(storage, `groups/${name}/files/${Date.now()}_${fileName}`);
                    
                    await uploadBytes(fileRef, blob);
                    const fileURL = await getDownloadURL(fileRef);
                    
                    const fileMessage = {
                        sender: {
                            id: userID,
                            name: userName,
                            email: email,
                            profile: profileImage || ""
                        },
                        content: fileURL,
                        fileName: fileName,
                        fileSize: fileAsset.size,
                        mimeType: fileAsset.mimeType,
                        type: "file",
                        timestamp: serverTimestamp(),
                        id: uuid.v4()
                    };
                    
                    await addDoc(collection(db, `s/${name}/messages`), fileMessage);
                    await updateLatestMessage(fileMessage);
                } catch (error) {
                    console.error("Error uploading file:", error);
                    Alert.alert("Error", `Failed to upload ${fileAsset.name}`);
                }
            }
        }
    };

    const handleSendMessage = async () => {
        if (inputMessage.trim() === "") return;
        
        try {
            setIsLoading(true)
            const message = {
                sender: {
                    id: userID,
                    name: userName,
                    email: email,
                    profile: profileImage ? profileImage : ""
                },
                recipient: {
                    id: id,
                    name: name,
                    email: mail,
                    profile: profile ? profile : ""
                },
                content: inputMessage.trim(),
                type: "text",
                timestamp: new Date().getTime(),
                id: uuid.v4()
            };
            console.log("the message", message)
            setInputMessage('');
            
            await addDoc(collection(db, 'messages'), message);
            setIsLoading(false)
        } catch (error) {
            setIsLoading(false)
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message");
        }
    };

    const handleLongPress = () => {
        console.log("askdjkla")
    }

    return (
        <View className="flex-1 bg-gray-100">
            <ScrollView
                className="flex-1 px-4 py-3"
                ref={scrollToLatest}
            >
                {Object.keys(groupedMessages).map((date) => (
                    <View key={date} className="mb-4">
                        <Text className="font-medium text-center text-gray-400">
                            {date === today ? 'Today' : date}
                        </Text>
                         
                        {groupedMessages[date].map((message) => (
                            <ChatBubble key={message?.id} message={message} />
                        ))}
                    </View>
                ))}
            </ScrollView>

            {recordedUri && (
                <View className="flex-row items-center bg-white p-2 border-t border-gray-300">
                <Ionicons name="mic" size={24} color="red" />
                <Text className="ml-2">Voice message recorded</Text>
                <TouchableOpacity onPress={handleSendVoiceMessage} className="ml-3">
                    <Ionicons name="send" size={24} color="blue" />
                </TouchableOpacity>
                </View>
            )}

            <View className="flex-row items-center bg-white px-3 py-2 border-t border-gray-300">

                <TouchableOpacity onPress={pickFiles} className="mr-3">
                    <Ionicons name="attach" size={24} color="gray" />
                </TouchableOpacity>

                <TouchableOpacity onPress={pickImage} className="mr-3">
                    <Ionicons name="image" size={24} color="gray" />
                </TouchableOpacity>

                <TextInput
                    placeholder="Type a message..."
                    value={inputMessage}
                    multiline
                    onChangeText={setInputMessage}
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-800"
                />

                <TouchableOpacity onPress={handleSendMessage} className="ml-3">
                    {
                        isLoading ? <ActivityIndicator/> : <Ionicons name='send' size={24} color="#0084ff"/>
                    }
                </TouchableOpacity>
            </View>
        </View>
    );
}
