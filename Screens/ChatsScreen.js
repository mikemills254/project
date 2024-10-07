import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import RBSheet from "react-native-raw-bottom-sheet";
import TextInputWithoutIcon from "../components/TextInputWithoutIcon";
import { firebase } from "../components/config";
import ConversationsComponent from "../components/ConversationComponent";
import Loader from "../components/Loader";
import { Ionicons } from "@expo/vector-icons";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheetContent: {
    backgroundColor: "white",
    padding: 20,
    height: 450,
  },
  searchButton: {
    backgroundColor: "#00e5e5",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  searchButtonText: {
    color: "white",
    fontWeight: "700",
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginTop: 10,
  },
  profilePic: {
    width: 50,
    height: 50,
    backgroundColor: "#ccf9f9",
    borderRadius: 50,
  },
  userInfo: {
    paddingLeft: 10,
    justifyContent: "center",
  },
  userName: {
    fontWeight: "600",
  },
  addButtonContainer: {
    backgroundColor: "#00e5e5",
    borderRadius: 10,
    position: "absolute",
    bottom: 70,
    right: 20,
    padding: 10,
    shadowColor: "#351c75",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 1.84,
    elevation: 5,
  },
});

function ChatsScreen({ route, navigation }) {
  const { userId } = route.params; // Extract userId and email from route params
  const refRBSheet = useRef();
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
    useEffect(() => {
    setLoading(true);
    const { userId, email } = route.params; // Extract userId and email from route params
    const fetchUser = async (userId) => {
      try {
        const userSnapshot = await firebase
          .firestore()
          .collection("users")
          .doc(userId)
          .get();

        if (userSnapshot.exists) {
          const userData = userSnapshot.data();
          if (userData && userData.fullName) {
            setUser(userData);
            // console.log("User Found: " + userData);
          } else {
            // console.log("User name not found in data:", userData);
          }
        } else {
          // console.log("User document does not exist");
        }
      } catch (error) {
        console.error("Error fetching User name:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser(userId);
  }, [userId]);

  const searchUsersByEmail = async () => {
    try {
      const snapshot = await firebase
        .firestore()
        .collection("users")
        .where("email", "==", email)
        .get();
      const usersList = snapshot.docs.map((doc) => doc.data());
      setUsers(usersList);
    } catch (error) {
      console.error("Error searching users: ", error);
    }
  };

  const openBottomSheet = async () => {
    refRBSheet.current.open();
  };

  const closeBottomSheet = async () => {
    refRBSheet.current.close();
  };

  const createConversation = async (receiver) => {
    try {
      setLoading(true);

      const receiverId = receiver.userId;
      const conversationId1 = `${userId}_${receiverId}`;
      const conversationId2 = `${receiverId}_${userId}`;

      const conversationRef1 = firebase
        .firestore()
        .collection("conversations")
        .doc(conversationId1);
      const conversationRef2 = firebase
        .firestore()
        .collection("conversations")
        .doc(conversationId2);
      const conversationDoc1 = await conversationRef1.get();
      const conversationDoc2 = await conversationRef2.get();

      if (!conversationDoc1.exists) {
        await conversationRef1.set({
          sender: user,
          receiver: receiver,
          messages: [],
        });
      }
      if (!conversationDoc2.exists) {
        await conversationRef2.set({
          sender: receiver,
          receiver: user,
          messages: [],
        });
      }
      closeBottomSheet();
      setLoading(false);

      navigation.navigate("Chat", {
        conversationId: conversationDoc1.exists
          ? conversationId1
          : conversationId2,
        senderId: user.userId,
        receiverId: receiver.userId,
        email: user.email,
      });
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  return (
    <View style={styles.screen}>
      <ConversationsComponent navigation={navigation} userId={userId} />
      <View style={styles.addButtonContainer}>
        <TouchableOpacity onPress={openBottomSheet}>
          <MaterialCommunityIcons name={"chat-plus"} color={"#fff"} size={30} />
        </TouchableOpacity>
      </View>
      <RBSheet
        ref={refRBSheet}
        closeOnDragDown={true}
        closeOnPressMask={false}
        height={450}
        customStyles={{
          wrapper: {
            backgroundColor: "transparent",
          },
          draggableIcon: {
            backgroundColor: "#00e5e5",
          },
          border: {
            borderWidth: 1,
          },
          container: {
            borderWidth: 1,
            borderBottomWidth: 0,
            borderTopRightRadius: 35,
            borderTopLeftRadius: 35,
            borderColor: "#00e5e5",
          },
        }}
      >
        <View style={styles.bottomSheetContent}>
          <TextInputWithoutIcon
            placeholder="Enter email"
            value={email}
            onChangeText={(text) => setEmail(text)}
          />
          <TouchableOpacity
            onPress={searchUsersByEmail}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
          <FlatList
            data={users}
            keyExtractor={(item) => item.userId.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => createConversation(item)}>
                <View style={[styles.userItem, { flexDirection: "row" }]}>
                  <Image
                    source={{
                      uri: item.profilePicUrl,
                    }}
                    style={styles.profilePic}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.fullName}</Text>
                    <Text>{item.email}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </RBSheet>
      <Loader visible={loading} />
    </View>
  );
}

export default ChatsScreen;
