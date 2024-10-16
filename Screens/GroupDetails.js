import React, { useEffect, useState } from 'react';
import { 
    View, Text, ScrollView, Image, TouchableOpacity, FlatList, 
    ActivityIndicator, Modal,
    Pressable
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { 
    query, collection, where, getDocs, getDoc, updateDoc, doc 
} from 'firebase/firestore';
import { db, auth } from "../Utilities/Firebaseconfig";
import { useSelector } from 'react-redux';
import Loader from '../components/Loader';


const AddMembersModal = ({ visible, onClose, currentParticipants, groupId, onMembersAdded }) => {
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [ leaving, setLeaving ] = useState(false)

    useEffect(() => {
        if (visible) {
            fetchAvailableUsers();
        }
    }, [visible]);

    const fetchAvailableUsers = async () => {
        setLoading(true);
        try {
            const usersQuery = query(collection(db, 'users'));
            const querySnapshot = await getDocs(usersQuery);
            
            const currentParticipantIds = currentParticipants.map(p => p.userID);
            const availableUsersList = querySnapshot.docs
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                .filter(user => !currentParticipantIds.includes(user.id));
            
            setAvailableUsers(availableUsersList);
        } catch (error) {
            console.error('Error fetching available users:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (user) => {
        setSelectedUsers(prev => {
            const isSelected = prev.find(u => u.id === user.id);
            if (isSelected) {
                return prev.filter(u => u.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };


    const addSelectedMembers = async () => {
        if (selectedUsers.length === 0) return;

        setLoading(true);
        try {
            const groupRef = doc(db, 'groups', groupId);
            
            const newParticipants = selectedUsers.map(user => ({
                userID: user.id,
                userName: user.userName || user.displayName || 'Unknown User',
                email: user.email || '',
                profileImage: user.profileImage || null
            }));

            const updatedParticipants = [...currentParticipants, ...newParticipants];

            await updateDoc(groupRef, {
                particapants: updatedParticipants
            });

            onMembersAdded(updatedParticipants);
            setSelectedUsers([]);
            onClose();
        } catch (error) {
            console.error('Error adding members:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity 
            onPress={() => toggleUserSelection(item)}
            className="flex-row items-center p-3"
        >
            <View className="w-12 h-12 rounded-full bg-gray-300 justify-center items-center">
                {item.profileImage ? (
                    <Image 
                        source={{ uri: item.profileImage }} 
                        className="h-full w-full rounded-full contain"
                    />
                ) : (
                    <Text className="text-2xl text-white">
                        {(item.userName || item.displayName || 'U').charAt(0)}
                    </Text>
                )}
            </View>
            <View className="ml-3 flex-1">
                <Text className="font-semibold text-base">
                    {item.userName || item.displayName || 'Unknown User'}
                </Text>
                <Text className="text-gray-500">{item.email || 'No email'}</Text>
            </View>
            <View className="w-6 h-6 border border-gray-400 rounded-full justify-center items-center">
                {selectedUsers.find(u => u.id === item.id) && (
                    <Icon name="checkmark" size={18} color="#075E54" />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-white">
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                    <TouchableOpacity onPress={onClose}>
                        <Icon name="close" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold">Add Members</Text>
                    <TouchableOpacity 
                        onPress={addSelectedMembers}
                        disabled={selectedUsers.length === 0}
                    >
                        <Text className={`text-blue-500 ${selectedUsers.length === 0 ? 'opacity-50' : ''}`}>
                            Add ({selectedUsers.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#075E54" />
                    </View>
                ) : availableUsers.length === 0 ? (
                    <View className="flex-1 justify-center items-center p-4">
                        <Text className="text-gray-500 text-center">
                            No available users to add to the group
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={availableUsers}
                        renderItem={renderUserItem}
                        keyExtractor={item => item.id}
                    />
                )}
            </View>
        </Modal>
    );
};

// Main GroupDetails Component
const GroupDetails = ({ route, navigation }) => {
    const [groupData, setGroupData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addMembersModalVisible, setAddMembersModalVisible] = useState(false);
    const { name, id } = route.params;
    const [ isDialog, setIsDialog ] = useState(false)
    const [ selectedMember, setSelectedMember ] = useState()
    const [ isRemoving, setIsRemoving ] = useState(false)
    const { userID } = useSelector(state => state.auth.user)
    const [ leaving, setLeaving ] = useState(false)

    useEffect(() => {
        const fetchGroupData = async () => {
            try {
                const groupQuery = query(
                    collection(db, 'groups'),
                    where('name', '==', name)
                );
                
                const querySnapshot = await getDocs(groupQuery);
                
                if (!querySnapshot.empty) {
                    const groupDoc = querySnapshot.docs[0];
                    setGroupData({ id: groupDoc.id, ...groupDoc.data() });
                } else {
                    console.log('No group found with this name');
                }
            } catch (error) {
                console.error('Error fetching group data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGroupData();
    }, [name]);

    const handleMembersAdded = (newParticipantsList) => {
        setGroupData(prev => ({
            ...prev,
            particapants: newParticipantsList
        }));
    };

    const groupSettings = [
        { icon: 'link', label: 'Invite via link' },
        { icon: 'exit', label: 'Exit group', color: 'red', onClick: () => handleExit() },
        { icon: 'alert-circle', label: 'Report group', color: 'red' },
    ];

    const handleExit = async () => {
        const groupRef = doc(db, "groups", id);    
        try {
            setLeaving(true)
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
            setLeaving(false)
            Alert.alert("Error", "Failed to leave the group. Please try again.");
        }
    };

    const renderParticipant = ({ item }) => {
        const isAdmin = groupData.admin && groupData.admin.userID === item.userID;
        const isCurrentUser = auth.currentUser.uid === item.userID;

        return (
            <Pressable onPress={() => {setIsDialog(true), setSelectedMember(item)}} className="flex-row items-center p-3">
                <View className="w-12 h-12 rounded-full bg-gray-300 justify-center items-center">
                    {item.profileImage ? (
                        <Image 
                            source={{ uri: item.profileImage }} 
                            className="h-full w-full rounded-full contain"
                        />
                    ) : (
                        <Text className="text-2xl text-white">
                            {item.userName.charAt(0)}
                        </Text>
                    )}
                </View>
                <View className="ml-3 flex-1">
                    <Text className="font-semibold text-base">
                        {isCurrentUser ? 'You' : item.userName}
                    </Text>
                    <Text className="text-gray-500">{item.email}</Text>
                </View>
                {isAdmin && (
                    <Text className="text-blue-500">Admin</Text>
                )}
            </Pressable>
        );
    };

    const renderOption = ({ icon, label, color, onClick }) => (
        <TouchableOpacity onPress={() => onClick()} className="flex-row items-center p-4">
            <Icon name={icon} size={24} color={color || '#075E54'} />
            <Text className={`ml-3 text-base ${color ? `text-${color}-600` : 'text-black'}`}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#075E54" />
            </View>
        );
    }

    if (!groupData) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>No group found with this name</Text>
            </View>
        );
    }

    const handleRemoveMember = async () => {
        try {
            setIsRemoving(true)
            const newMembers = groupData.particapants.filter(particapants =>  particapants.userID !== selectedMember.userID)
            const groupRef = doc(db, 'groups', groupData.id);
            await updateDoc(groupRef, {
                particapants: newMembers
            });
            setGroupData(prevGroupData => ({
                ...prevGroupData,
                particapants: newMembers
            }));
            setIsRemoving(false)
            setIsDialog(false)
        } catch (error){
            console.log("error", error)
        }
    }

    

    return (
        <>
            <Loader visible={leaving}/>
            <Modal
                visible={isDialog}
                transparent={true}
                animationType="none"
                onDismiss={() => setIsDialog(false)}
                presentationStyle='overFullScreen'
                onRequestClose={() => setIsDialog(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/40">
                    <View className="bg-white rounded-lg w-80 overflow-hidden p-3 flex flex-col">
                        <Pressable onPress={() => navigation.navigate("OtherScreens", {
                            screen: "Chat",
                            params: {
                                id: selectedMember.userID,
                                mail: selectedMember.email,
                                name: selectedMember.userName,
                                profile: selectedMember.profileImage
                            }
                        })} className="h-10 flex items-start justify-center mb-5">
                            <Text className="text-gray-600">Message {selectedMember?.userName} </Text>
                        </Pressable>
                        {
                            groupData?.admin?.userID === userID && selectedMember?.userID !== userID &&
                        
                                <Pressable onPress={() => handleRemoveMember()} className="h-10 flex items-start flex-row justify-between">
                                    <Text className=" text-gray-600">Remove {selectedMember?.userName} </Text>
                                    {
                                        isRemoving && <ActivityIndicator color="gray" size={"small"}/>
                                    }
                                </Pressable>
                        }
                    </View>
                </View>

            </Modal>
            <ScrollView className="flex-1 bg-white mt-5">
                <View className="items-center py-6 bg-gray-100">
                    {groupData.groupImage ? (
                        <Image 
                            source={{ uri: groupData.groupImage }}
                            className="w-24 h-24 rounded-full"
                        />
                    ) : (
                        <View className="w-24 h-24 rounded-full bg-gray-300 justify-center items-center">
                            <Text className="text-4xl text-white">{groupData.name.charAt(0)}</Text>
                        </View>
                    )}
                    <Text className="text-xl font-semibold mt-2">{groupData.name}</Text>
                    <Text className="text-gray-500 mt-1">
                        Group · {groupData.particapants.length} participants
                    </Text>
                </View>

                <View className="mt-2">
                    <Text className="px-4 py-2 text-sm text-gray-500 bg-gray-100">
                        {groupData.particapants.length} PARTICIPANTS
                    </Text>
                    <TouchableOpacity 
                        className="flex-row items-center p-3"
                        onPress={() => setAddMembersModalVisible(true)}
                    >
                        <View className="w-12 h-12 rounded-full bg-blue-500 justify-center items-center">
                            <Icon name="person-add" size={24} color="white" />
                        </View>
                        <Text className="ml-3 text-blue-500 font-semibold">Add Members</Text>
                    </TouchableOpacity>
                    <FlatList 
                        data={groupData.particapants}
                        renderItem={renderParticipant}
                        keyExtractor={(item) => item.userID}
                        scrollEnabled={false}
                    />
                </View>

                <View className="mt-2">
                    {groupSettings.map((setting, index) => (
                        <View key={index}>
                            {renderOption(setting)}
                        </View>
                    ))}
                </View>

                <AddMembersModal
                    visible={addMembersModalVisible}
                    onClose={() => setAddMembersModalVisible(false)}
                    currentParticipants={groupData.particapants}
                    groupId={groupData.id}
                    onMembersAdded={handleMembersAdded}
                />
            </ScrollView>
        </>
       
    );
};

export default GroupDetails;