import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ABOUT_SEEN_KEY = 'aerologix_about_seen';

interface AboutModalProps {
  onClose?: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const seen = await AsyncStorage.getItem(ABOUT_SEEN_KEY);
      if (!seen) {
        setVisible(true);
      }
    } catch (error) {
      console.log('AboutModal: Error checking first launch', error);
    }
  };

  const handleClose = async () => {
    try {
      await AsyncStorage.setItem(ABOUT_SEEN_KEY, 'true');
    } catch (error) {
      console.log('AboutModal: Error saving flag', error);
    }
    setVisible(false);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="airplane" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>AeroLogix AI</Text>
            <Text style={styles.version}>Outil d'organisation aéronautique</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.paragraph}>
              AeroLogix AI vous aide à organiser et suivre les informations de vos aéronefs :
              heures de vol, maintenance, composants et documents.
            </Text>

            <View style={styles.featureSection}>
              <View style={styles.featureItem}>
                <Ionicons name="scan-outline" size={20} color="#3B82F6" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>OCR / Scan de documents</Text>
                  <Text style={styles.featureDesc}>
                    Les données extraites sont des suggestions à vérifier et valider avant enregistrement.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="sparkles-outline" size={20} color="#8B5CF6" />
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>Assistant EKO</Text>
                  <Text style={styles.featureDesc}>
                    Réponses informatives uniquement — consultez toujours un professionnel pour toute décision.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={18} color="#64748B" />
              <Text style={styles.infoText}>
                Cette application est un outil d'organisation personnelle. 
                Les données affichées sont celles que vous saisissez ou importez.
              </Text>
            </View>
          </ScrollView>

          {/* Button */}
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>J'ai compris</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  version: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 20,
  },
  featureSection: {
    gap: 16,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#64748B',
  },
  button: {
    backgroundColor: '#1E3A8A',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
