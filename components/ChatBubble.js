import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Linking, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import { Video, ResizeMode, Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

const ChatBubble = ({ message, onLongPress }) => {
    const { recipient, sender, timestamp, content, type, fileName, fileSize, mimeType, thumbnailURL } = message;
    const { userID } = useSelector(state => state.auth.user);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef(null);
    const [videoStatus, setVideoStatus] = useState({});
    const [sound, setSound] = useState();

    const isSentByCurrentUser = sender.id === userID;

    useEffect(() => {
        return sound
            ? () => {
                  sound.unloadAsync();
              }
            : undefined;
    }, [sound]);

    const handleLongPress = () => {
        if (onLongPress) {
            onLongPress(message);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (typeof timestamp === 'number') {
            return format(new Date(timestamp), 'HH:mm');
        }
        return '';
    };

    const handleVideoPress = () => {
        setIsVideoModalVisible(true);
    };

    const handleCloseVideoModal = async () => {
        if (videoRef.current) {
            await videoRef.current.pauseAsync();
        }
        setIsVideoModalVisible(false);
        setIsPlaying(false);
    };

    const handlePlayPauseVideo = async () => {
        if (videoRef.current) {
            if (videoStatus.isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
            setIsPlaying(!videoStatus.isPlaying);
        }
    };

    const handlePlayPauseAudio = async () => {
        if (sound) {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
            setIsPlaying(!isPlaying);
        } else {
            const { sound: newSound } = await Audio.Sound.createAsync({ uri: content });
            setSound(newSound);
            await newSound.playAsync();
            setIsPlaying(true);
        }
    };

    const handleFilePress = async () => {
        if (type === 'file' && content) {
            try {
                const supported = await Linking.canOpenURL(content);
                if (supported) {
                    await Linking.openURL(content);
                } else {
                    Alert.alert("Error", `Cannot open ${fileName || 'this file'}`);
                }
            } catch (error) {
                console.error("Error opening file:", error);
                Alert.alert("Error", `Failed to open ${fileName || 'file'}`);
            }
        }
    };

    const renderContent = () => {
        switch (type) {
            case 'image':
                return (
                    <View className="flex flex-col">
                        <TouchableOpacity onPress={() => setIsImageModalVisible(true)} className="w-48 h-48">
                            <Image
                                source={{ uri: content }}
                                className="w-full h-full rounded-lg"
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                        {fileName && (
                            <Text className={`text-sm mt-1 ${isSentByCurrentUser ? 'text-gray-700' : 'text-gray-600'}`}>
                                {fileName}
                            </Text>
                        )}
                    </View>
                );
            case 'video':
                return (
                    <TouchableOpacity onPress={handleVideoPress} className="w-60 h-40">
                        <Image
                            source={{ uri: thumbnailURL }}
                            className="w-full h-full rounded-lg"
                            resizeMode="cover"
                        />
                        <View className="absolute inset-0 flex items-center justify-center">
                            <Ionicons name="play" size={40} color="white" />
                        </View>
                    </TouchableOpacity>
                );
            case 'audio':
                return (
                    <View className="w-full">
                        <View className="flex-row items-center bg-gray-200 p-2 rounded-lg w-full">
                            <TouchableOpacity onPress={handlePlayPauseAudio}>
                                <Ionicons 
                                    name={isPlaying ? "pause" : "play"} 
                                    size={24} 
                                    color="gray" 
                                />
                            </TouchableOpacity>
                            <Text className="ml-2 flex-1" numberOfLines={1}>
                                {fileName || "Audio file"}
                            </Text>
                            <Text className="text-xs text-gray-500">
                                {fileSize}
                            </Text>
                        </View>
                    </View>
                );
            case 'file':
                return (
                    <TouchableOpacity onPress={handleFilePress} className="w-full">
                        <FilePreview
                            fileName={fileName}
                            fileSize={fileSize}
                            mimeType={mimeType}
                            isSentByCurrentUser={isSentByCurrentUser}
                        />
                    </TouchableOpacity>
                );
            default:
                return (
                    <Text className={`text-black text-md`}>
                        {content}
                    </Text>
                );
        }
    };

    return (
        <TouchableOpacity
            onLongPress={handleLongPress}
            className={`flex ${isSentByCurrentUser ? 'self-end bg-gray-300' : 'self-start bg-white'}
                max-w-[80%] rounded-xl p-3 mb-2 shadow-sm`}
        >
            {renderContent()}
            <Text className={`text-xs text-gray-600 mt-1 self-end`}>
                {formatTimestamp(timestamp)}
            </Text>

            <Modal
                visible={isImageModalVisible}
                transparent={true}
                onRequestClose={() => setIsImageModalVisible(false)}
            >
                <View className="flex-1 bg-black bg-opacity-90 justify-center items-center">
                    <TouchableOpacity 
                        className="absolute top-10 right-10"
                        onPress={() => setIsImageModalVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: content }}
                        style={{ width: width * 0.9, height: width * 0.9 }}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            <Modal
                visible={isVideoModalVisible}
                transparent={true}
                onRequestClose={handleCloseVideoModal}
            >
                <View className="flex-1 bg-black justify-center items-center">
                    <TouchableOpacity 
                        className="absolute top-10 right-10 z-10"
                        onPress={handleCloseVideoModal}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <Video
                        ref={videoRef}
                        source={{ uri: content }}
                        style={{ width, height: height * 1 }}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        isLooping
                        onPlaybackStatusUpdate={status => setVideoStatus(() => status)}
                    />
                    <TouchableOpacity 
                        className="absolute inset-0 flex items-center justify-center"
                        onPress={handlePlayPauseVideo}
                    >
                        <Ionicons 
                            name={videoStatus.isPlaying ? "pause" : "play"} 
                            size={50} 
                            color="white" 
                        />
                    </TouchableOpacity>
                </View>
            </Modal>
        </TouchableOpacity>
    );
};

const FilePreview = ({ fileName, fileSize, mimeType, isSentByCurrentUser }) => {
    const getFileIcon = () => {
        if (mimeType === 'application/pdf') return 'document-text';
        if (mimeType?.startsWith('image/')) return 'image';
        if (mimeType?.startsWith('video/')) return 'videocam';
        if (mimeType?.startsWith('audio/')) return 'musical-notes';
        if (mimeType?.includes('word')) return 'document';
        if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'grid';
        return 'document-outline';
    };

    return (
        <View className={`flex-row items-center p-2 rounded-lg w-full ${isSentByCurrentUser ? 'bg-gray-400' : 'bg-gray-200'}`}>
            <View className="p-2 rounded-full bg-opacity-20 bg-gray-500">
                <Ionicons 
                    name={getFileIcon()} 
                    size={24} 
                    color={isSentByCurrentUser ? 'white' : 'black'} 
                />
            </View>
            <View className="ml-3 flex-1">
                <Text 
                    numberOfLines={1} 
                    className={`font-medium truncate ${isSentByCurrentUser ? 'text-white' : 'text-black'}`}
                >
                    {fileName}
                </Text>
                <Text className={`text-sm ${isSentByCurrentUser ? 'text-gray-100' : 'text-gray-600'}`}>
                    {fileSize}
                </Text>
            </View>
            <TouchableOpacity className="ml-2">
                <Ionicons 
                    name="download-outline" 
                    size={20} 
                    color={isSentByCurrentUser ? 'white' : 'gray'} 
                />
            </TouchableOpacity>
        </View>
    );
};

export default ChatBubble;