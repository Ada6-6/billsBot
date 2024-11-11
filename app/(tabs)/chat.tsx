import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, View, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { API_BASE_URL } from '@/config/constants';

interface ChatMessageProps {
  text: string;
  isUser?: boolean;
  image?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ text, isUser = false, image }) => (
  <View style={[styles.messageWrapper, isUser ? styles.userMessageWrapper : styles.botMessageWrapper]}>
    {!isUser && (
      <View style={styles.iconContainer}>
        <Ionicons name="logo-react" size={24} color="#61DAFB" />
      </View>
    )}
    <ThemedView style={[styles.messageContainer, isUser ? styles.userMessage : styles.botMessage]}>
      {image && (
        <Image 
          source={{ uri: image }} 
          style={styles.messageImage} 
          resizeMode="contain"
        />
      )}
      <ThemedText style={styles.messageText}>{text}</ThemedText>
    </ThemedView>
    {isUser && (
      <View style={styles.iconContainer}>
        <Ionicons name="person-circle" size={24} color="#1D3D47" />
      </View>
    )}
  </View>
);

export default function ChatScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessageProps[]>([
    { text: "👋 Welcome to Your AI Personal Finance Assistant!\n\nYou can start a conversation with me by sending voice or text messages, uploading photos or files for the expense, and I will record the details. Let's make managing your finances easy together! 💰\n \n🔹 I spent $15 on groceries yesterday.\n🔹 Paid $50 for dinner at Luigi's Restaurant.\n🔹 Bought movie tickets for $30 at Cinema.\n🔹 Spent $100 on new clothes at the mall.\n🔹 Paid $20 for a taxi ride to work.\n🔹 Bought concert tickets for $75 at Music Hall.", isUser: false },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = async () => {
    if (inputText.trim()) {
      const userMessage = { text: inputText, isUser: true };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');

      const loadingMessage = { text: "Processing...", isUser: false };
      setMessages(prev => [...prev, loadingMessage]);

      try {
        const response = await fetch(`${API_BASE_URL}/transaction/addWithAI`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputText }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.text();
        
        setMessages(prev => {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, { text: data, isUser: false }];
        });
      } catch (error) {
        setMessages(prev => {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, { text: "Sorry, an error occurred. Please try again later.", isUser: false }];
        });
      }

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("需要访问相册的权限才能上传图片");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const userImageMessage = { 
        text: '📸 Image Uploaded',
        isUser: true,
        image: result.assets[0].uri
      };
      setMessages(prev => [...prev, userImageMessage]);

      const loadingMessage = { text: "正在处理图片...", isUser: false };
      setMessages(prev => [...prev, loadingMessage]);

      try {
        const formData = new FormData();
        const localUri = result.assets[0].uri;
        const filename = localUri.split('/').pop();
        
        const response = await fetch(localUri);
        const blob = await response.blob();
        
        const maxSize = 15 * 1024 * 1024; // 15MB
        if (blob.size > maxSize) {
          alert("图片大小不能超过15MB");
          setMessages(prev => {
            const newMessages = prev.slice(0, -1);
            return [...newMessages, { text: "图片大小超过限制，请选择小于15MB的图片。", isUser: false }];
          });
          return;
        }

        const file = new File([blob], filename || 'image.jpg', { type: 'image/jpeg' });
        formData.append('image', file);

        const uploadResponse = await fetch(`${API_BASE_URL}/transaction/addWithAIImg`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!uploadResponse.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await uploadResponse.text();
        
        setMessages(prev => {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, { text: data, isUser: false }];
        });
      } catch (error) {
        console.error('Upload error:', error);
        setMessages(prev => {
          const newMessages = prev.slice(0, -1);
          return [...newMessages, { text: "抱歉，上传图片时出现错误。请稍后重试。", isUser: false }];
        });
      }

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContentContainer}
        showsVerticalScrollIndicator={true}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <ChatMessage 
            key={index} 
            text={message.text} 
            isUser={message.isUser} 
            image={message.image} 
          />
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="camera" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handleImagePick}>
          <Ionicons name="image" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="mic" size={24} color="#000" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  chatContainer: {
    flex: 1,
  },
  chatContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageContainer: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#A1CEDC',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#E5E5E5',
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    marginHorizontal: 8,
  },
  sendButton: {
    backgroundColor: '#1D3D47',
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
});
