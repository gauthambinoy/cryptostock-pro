import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, Card, Text, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { chatService, Message, Conversation } from '../services/ChatService';

export default function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0) {
        setCurrentConversation(data[0]);
      } else {
        createNewConversation();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const conversation = await chatService.getConversation(conversationId);
      setMessages(conversation.messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const conversation = await chatService.createConversation('New Chat');
      setConversations([conversation, ...conversations]);
      setCurrentConversation(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;

    const userMessage = newMessage;
    setNewMessage('');
    setLoading(true);

    try {
      const updatedMessages = await chatService.sendMessage(
        currentConversation.id,
        userMessage
      );
      setMessages(updatedMessages);

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!currentConversation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageContainer,
              item.sender === 'user' ? styles.userMessage : styles.assistantMessage,
            ]}
          >
            <Card
              style={[
                styles.messageBubble,
                item.sender === 'user'
                  ? styles.userBubble
                  : styles.assistantBubble,
              ]}
            >
              <Card.Content>
                <Text
                  style={[
                    styles.messageText,
                    item.sender === 'user'
                      ? styles.userText
                      : styles.assistantText,
                  ]}
                >
                  {item.content}
                </Text>
                <Text
                  style={[
                    styles.timestamp,
                    item.sender === 'user'
                      ? styles.userTimestamp
                      : styles.assistantTimestamp,
                  ]}
                >
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </Card.Content>
            </Card>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyText}>Start a conversation</Text>
          </View>
        }
        contentContainerStyle={styles.messagesList}
        scrollEnabled={true}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Type your message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
          multiline
          editable={!loading}
          disabled={loading}
        />
        <Button
          mode="contained"
          onPress={sendMessage}
          disabled={!newMessage.trim() || loading}
          loading={loading}
          style={styles.sendButton}
          icon="send"
        >
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  userBubble: {
    backgroundColor: '#6200ee',
  },
  assistantBubble: {
    backgroundColor: '#e8e8e8',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: '#ddd',
  },
  assistantTimestamp: {
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    marginTop: 12,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    marginBottom: 0,
  },
});
