import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AIAssistantScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="sparkles" size={80} color="#CBD5E1" />
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          OCR scanning, predictive maintenance, and AI-powered insights will be available here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 24,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});
