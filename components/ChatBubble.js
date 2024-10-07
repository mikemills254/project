import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import ImageViewer from 'react-native-image-zoom-viewer';

const ImageModal = ({ visible, onClose, imageUri, onDelete }) => {
    return (
        <Modal transparent={true} visible={visible} animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' }}>
                <ImageViewer
                    imageUrls={[{ url: imageUri }]}
                    renderIndicator={() => null}
                    enableSwipeDown={true}
                    onSwipeDown={onClose}
                />
                <View style={{ 
                    position: 'absolute',
                    top: 40,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    padding: 16
                }}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onDelete}>
                        <Ionicons name="trash" size={30} color="red" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};



const ChatBubble = ({ message, onLongPress }) => {
    const { recipient, sender, timestamp, content, type, fileName, fileSize, mimeType } = message;
    console.log("the file name on the chatbubble", fileName)
    const { userID } = useSelector(state => state.auth.user);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const isSentByCurrentUser = sender.id === userID;

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
                        <TouchableOpacity onPress={() => setIsModalVisible(true)} className="w-48 h-48">
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
            case 'file':
                return (
                    <TouchableOpacity onPress={handleFilePress} className="w-full">
                        <FilePreview
                            fileName={message.fileName}
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

            {type === 'image' && (
                <ImageModal
                    visible={isModalVisible}
                    onClose={() => setIsModalVisible(false)}
                    imageUri={content}
                    onDelete={() => {
                        setIsModalVisible(false);
                    }}
                />
            )}
        </TouchableOpacity>
    );
};

const FilePreview = ({ fileName, fileSize, mimeType, isSentByCurrentUser }) => {
    
    const getFileIcon = () => {
        if (mimeType === 'application/pdf') return 'document-text';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'videocam';
        if (mimeType.startsWith('audio/')) return 'musical-notes';
        if (mimeType.includes('word')) return 'document';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'grid';
        return 'document-outline';
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
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
                    {formatFileSize(fileSize)}
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