import React, { useState, useRef } from 'react';
import { View, Text, Image, Dimensions, Pressable, TouchableOpacity, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import moment from 'moment';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, Audio } from 'expo-av';


const { width, height } = Dimensions.get('window');
const maxWidth = width * 0.75;

export default function MessageBubble({ message }) {
    const { userID } = useSelector(state => state.auth.user);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const videoRef = useRef(null);
    const [videoStatus, setVideoStatus] = useState({});
    const [sound, setSound] = useState();


    console.log("the message", message)

    const getFormattedTimestamp = () => {
        if (message.timestamp && message.timestamp.seconds) {
            return moment(message.timestamp.toDate()).format('h:mm A');
        }
        return 'Sending...';
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
            const { sound: newSound } = await Audio.Sound.createAsync({ uri: message.content });
            setSound(newSound);
            await newSound.playAsync();
            setIsPlaying(true);
        }
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

    const isOwnMessage = message.sender === userID;

    const renderMessage = () => {
        const bubbleStyle = `
            ${isOwnMessage ? "bg-blue-500 self-end" : "bg-gray-200 self-start"}
            p-3 rounded-2xl mb-2 max-w-[${maxWidth}px]
        `;

        const textStyle = `
            ${isOwnMessage ? "text-white" : "text-gray-800"}
            text-base
        `;

        const iconStyle = `
            ${isOwnMessage ? "text-white" : "text-gray-800"}
            text-white
        `;

        switch(message.type) {
            case 'text':
                return (
                    <View className={bubbleStyle}>
                        <Text className={textStyle}>{message.content}</Text>
                    </View>
                );
            case 'image':
                return (
                    <TouchableOpacity className={`${bubbleStyle} p-1`} onPress={() => setIsImageModalVisible(true)}>
                        <Image 
                            source={{ uri: message.content }}
                            style={{
                                width: maxWidth - 80,
                                height: maxWidth - 60,
                                borderRadius: 15,
                            }}
                        />
                    </TouchableOpacity>
                );
            case 'video':
                return (
                    <TouchableOpacity onPress={handleVideoPress} className={`${bubbleStyle} flex flex-row h-40 w-60`}>
                        <Image
                            source={{ uri: message.thumbnail }}
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
                    <View className={`${bubbleStyle} flex flex-row`}>
                        <TouchableOpacity onPress={handlePlayPauseAudio}>
                            <Ionicons 
                                name={isPlaying ? "pause" : "play"} 
                                size={24} 
                                color={iconStyle}
                            />
                        </TouchableOpacity>
                        <Text className={textStyle} numberOfLines={1}>
                            {message.name || "Audio file"}
                        </Text>
                        
                    </View>
                );
            case 'file':
                return (
                    <View className={`${bubbleStyle} flex flex-row items-center `}>
                        <Text className={textStyle}>{message.name}</Text>
                        <Pressable className={`${iconStyle} ml-3`}>
                            <Ionicons name='download-outline' size={18} />
                        </Pressable>
                    </View>
                );
            default:
                return (
                    <View className={bubbleStyle}>
                        <Text className={textStyle}>Unsupported message type</Text>
                    </View>
                );
        }
    };

    return (
        <>
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
                        source={{ uri: message.content }}
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
                        source={{ uri: message.content }}
                        style={{ width: width * 1, height: width * 1 }}
                        resizeMode="contain"
                    />
                </View>
            </Modal>
            <View className="mb-4">
                {renderMessage()}
                <Text className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? "self-end" : "self-start"}`}>
                    {getFormattedTimestamp()}
                </Text>
            </View>
        </>
        
    );
}