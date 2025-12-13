import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="airplane" size={80} color="#1E3A8A" />
        <Text style={styles.title}>AeroLogix AI</Text>
        <Text style={styles.subtitle}>Aviation Maintenance Manager</Text>
        <Text style={styles.description}>
          Gérez vos avions, maintenance, et logbook avec l'intelligence artificielle
        </Text>
        
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Commencer</Text>
          </TouchableOpacity>
        </Link>
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
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
