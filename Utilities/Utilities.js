import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from './Firebaseconfig';

export const handleFindChats = async (user1, user2) => {
    try {
        if (!user1 || !user2) {
            return null;
        }

        const q = query(collection(db, "messages"));
        const messagesQuerySnap = await getDocs(q);

        for (const doc of messagesQuerySnap.docs) {
            const messageData = doc.data();
            const sender = messageData.sender;
            const recipient = messageData.recipient;

            if (
                (sender.email === user1 && recipient.email === user2) ||
                (sender.email === user2 && recipient.email === user1)
            ) {
                return messageData.chatID;
            }
        }

        return null;
    } catch (error) {
        console.log("error", error);
        return null;
    }
};

export const getUserprofile = async (userID) => {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("userID", "==", userID));

        const userQuerySnap = await getDocs(q);

        if (userQuerySnap.empty) {
            console.log("No matching documents.");
            return null;
        }

        const user = userQuerySnap.docs[0].data();

        if (!user) {
            return null;
        }

        return user;
    } catch (error) {
        console.log("Error fetching user profile:", error);
        return null;
    }
}

export const handleFindFriends = async (userID) => {
    try {
        const q = query(collection(db, "users"), where("userID", "==", userID));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.error("User document not found");
            return;
        }

        const userDoc = querySnapshot.docs[0].data();

        return userDoc.friends || [];
    } catch (error) {
        console.error("Error finding friends:", error);
        return [];
    }
};
