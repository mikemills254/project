import React, { Component } from "react";
import {
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { firebase } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MessageCard from "./MessageCard";
import Loader from "./Loader";

export default class ConversationsComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      userId: this.props.userId,
      conversations: [],
      loading: false,
      refreshKey: 0, // Key to force FlatList refresh
    };
  }

  componentDidMount = async () => {
    this.setState({ conversations: [] });
    this.fetchConversations();
    this.props.navigation.addListener("focus", this.fetchConversations);
  };

  componentWillUnmount() {
    this.setState({ conversations: [] });
    this.props.navigation.removeListener("focus", this.fetchConversations);
  }

  fetchConversations = async () => {
    try {
      this.setState({ loading: true });
      const currentUserID = this.state.userId;
      const conversationsSnapshot = await firebase
        .firestore()
        .collection("conversations")
        .where("sender.userId", "==", currentUserID)
        .get();

      const conversationsData = [];
      await Promise.all(
        conversationsSnapshot.docs.map(async (doc) => {
          const conversation = doc.data();
          const messageSnapshot = await firebase
            .firestore()
            .collection("conversations")
            .doc(doc.id)
            .collection("messages")
            .orderBy("time", "desc")
            .limit(1)
            .get();

          if (!messageSnapshot.empty) {
            messageSnapshot.forEach((messageDoc) => {
              conversation.latestMessage = messageDoc.data();
            });
          }
          conversation.id = doc.id; // Add conversation ID to the data
          conversationsData.push(conversation);
        })
      );

      // Sort conversations by the latest message timestamp
      conversationsData.sort((a, b) => {
        const aTime = a.latestMessage ? a.latestMessage.time : 0;
        const bTime = b.latestMessage ? b.latestMessage.time : 0;
        return bTime - aTime;
      });

      this.setState({
        loading: false,
        conversations: conversationsData,
        refreshKey: this.state.refreshKey + 1, // Update the refreshKey
      });
    } catch (error) {
      this.setState({ loading: false });
      console.error("Error fetching conversations:", error);
    }
  };

  deleteConversation = async (conversationId) => {
    this.setState({ loading: true });
    try {
      await firebase
        .firestore()
        .collection("conversations")
        .doc(conversationId)
        .delete();
      this.fetchConversations(); // Refresh conversations list
      this.setState({ loading: false });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      this.setState({ loading: false });
    }
  };

  confirmDeleteConversation = (conversationId) => {
    Alert.alert(
      "Delete Conversation",
      "Are you sure you want to delete this conversation?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => this.deleteConversation(conversationId),
        },
      ]
    );
  };

  render() {
    const { conversations, refreshKey } = this.state;

    return (
      <View style={styles.container}>
        <FlatList
          data={conversations}
          extraData={refreshKey}
          ListEmptyComponent={
            <View
              style={{
                justifyContent: "center",
                alignItems: "center",
                margin: 30,
                padding: 30,
                height: Dimensions.get("screen").height - 300,
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                Please add people to chat
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const latestMessage = item.latestMessage;
            return (
              <TouchableOpacity
                onPress={() =>
                  this.props.navigation.navigate("Chat", {
                    senderId: item.sender.userId,
                    receiverId: item.receiver.userId,
                    email: item.sender.email,
                  })
                }
                onLongPress={() => this.confirmDeleteConversation(item.id)}
              >
                <MessageCard
                  receiverId={item.receiver.userId}
                  message={latestMessage ? latestMessage.text : ""}
                  time={latestMessage ? latestMessage.time : ""}
                />
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item, index) => item.id}
          ListFooterComponent={
            <View style={{ height: 100 }}>
              <Text>{""}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
        <Loader visible={this.state.loading} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    width: "100%",
  },
  backgroundImage: {
    paddingVertical: 20,
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 37,
    borderBottomRightRadius: 37,
    paddingTop: 50,
    position: "absolute",
    top: 0,
    height: 100,
  },
  item: {
    paddingTop: 10,
    paddingHorizontal: 10,
    width: "100%",
  },
});
