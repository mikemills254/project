import React, { useEffect, useState, useCallback } from 'react';
import { db } from './your-firebase-config'; // Import your Firestore configuration
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getUserprofile } from './yourUserProfileService'; // Import your function to get user profiles
import { useFocusEffect } from '@react-navigation/native'; // Import if using React Navigation
import { orderBy, limit } from 'firebase/firestore'; // Make sure to import necessary Firestore functions

const YourComponent = ({ userID }) => {
    const [friends, setFriends] = useState([]);
    const [conversations, setConversations] = useState([]);

    // Fetch friends based on userID changes and screen focus
    const fetchFriends = useCallback(() => {
        // Query to get the user document
        const userDocQuery = query(collection(db, "users"), where("userID", "==", userID));

        // Set up listener to get changes in the user's friends
        const unsubscribeFriends = onSnapshot(userDocQuery, (snapshot) => {
            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0].data();
                setFriends(userDoc.friends || []);
                console.log("The friends:", userDoc.friends || []);
            } else {
                console.error("User document not found");
                setFriends([]);
            }
        }, (error) => {
            console.error("Error fetching friends:", error);
        });

        return () => unsubscribeFriends(); // Cleanup listener on unmount
    }, [userID]);

    // Trigger fetchFriends on userID change and when screen is focused
    useFocusEffect(
        useCallback(() => {
            fetchFriends(); // Fetch friends on focus
        }, [fetchFriends]) // Dependencies array
    );

    // Fetch conversations based on friends
    useEffect(() => {
        const unsubscribeListeners = [];

        const fetchConversations = () => {
            if (!friends || friends.length === 0) return; // Exit if there are no friends

            friends.forEach(friend => {
                if (friend.chatID) {
                    const chatsQuery = query(
                        collection(db, "chats", friend.chatID, "messages"),
                        orderBy("timestamp", "desc"),
                        limit(1)
                    );

                    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
                        if (!snapshot.empty) {
                            const latestMessage = snapshot.docs[0].data();
                            const partnerID = latestMessage.sender === userID ? latestMessage.recipient : latestMessage.sender;
                            const thisUser = await getUserprofile(partnerID);

                            setConversations(prevConversations => {
                                const updatedConversations = prevConversations.filter(conv => conv.chatID !== friend.chatID);
                                const newConversation = {
                                    chatID: friend.chatID,
                                    partner: { id: partnerID, profile: thisUser?.profileImage, name: thisUser?.userName, mail: thisUser?.email },
                                    lastMessage: latestMessage.type === "text" ? latestMessage.content : 
                                                 latestMessage.type === "image" ? "Image" : "File",
                                    timestamp: parseTimestamp(latestMessage.timestamp),
                                };
                                return [newConversation, ...updatedConversations].sort((a, b) => b.timestamp - a.timestamp);
                            });
                        }
                    });

                    unsubscribeListeners.push(unsubscribe);
                }
            });
        };

        fetchConversations();

        return () => {
            // Cleanup all listeners when the component unmounts or loses focus
            unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        };
    }, [userID, friends]); // Dependencies on userID and friends

    return (
        <div>
            <h2>Conversations</h2>
            <ul>
                {conversations.map(conv => (
                    <li key={conv.chatID}>
                        <strong>{conv.partner.name}</strong>: {conv.lastMessage} <em>{conv.timestamp}</em>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default YourComponent;
