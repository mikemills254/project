import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { firebase } from "../components/config";
import GroupCard from "../components/GroupCard";
import GroupFooter from "../components/GroupFooter";

const GroupComponent = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("USERID");
        if (storedUserId) {
          setUserId(storedUserId);
          fetchGroups();
          fetchConversations(storedUserId);
        }
      } catch (error) {
        console.error("Error fetching data from AsyncStorage:", error);
      }
    };

    fetchUserId();
  }, []);

  const fetchGroups = async () => {
    try {
      const snapshot = await firebase.firestore().collection("groups").get();
      const groupsList = snapshot.docs.map((doc) => doc.data());
      setGroups(groupsList);
    } catch (error) {
      console.error("Error fetching groups: ", error);
    }
  };

  const fetchConversations = async (userId) => {
    try {
      const snapshot = await firebase
        .firestore()
        .collection("conversations")
        .where("participants", "array-contains", userId)
        .get();
      const conversationsList = snapshot.docs.map((doc) => doc.data());
      setConversations(conversationsList);
    } catch (error) {
      console.error("Error fetching conversations: ", error);
    }
  };

  const handleCreateGroup = async () => {
    // Logic to create a new group
  };

  const handleAddPeopleToGroup = (group) => {
    // Logic to add people to group from existing conversations
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={handleAddPeopleToGroup} />
        )}
        ListFooterComponent={<GroupFooter onCreateGroup={handleCreateGroup} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
});

export default GroupComponent;
