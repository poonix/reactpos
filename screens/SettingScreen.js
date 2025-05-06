import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { getAllSettings, updateSetting } from '../services/settingsService'; // pastikan path ini sesuai
import { Ionicons } from '@expo/vector-icons';

export default function SettingScreen({ navigation }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const allSettings = await getAllSettings();
    setSettings(allSettings);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const setting of settings) {
      await updateSetting(setting.key, setting.value);
    }
    setSaving(false);
    alert('Settings updated successfully!');
  };

  const handleChange = (key, newValue) => {
    setSettings(prev => prev.map(item => item.key === key ? { ...item, value: newValue } : item));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fc6b03" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {settings.map((item) => (
          <View key={item.key} style={styles.settingItem}>
            <Text style={styles.label}>{item.key.replace(/_/g, ' ').toUpperCase()}</Text>
            <TextInput
              value={item.value}
              onChangeText={(text) => handleChange(item.key, text)}
              style={styles.input}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.conSaveButtons}>
      <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fc6b03',
    padding: 15,
    paddingTop: 60,
    elevation: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  settingItem: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  saveButton: {flex:1, backgroundColor: '#fc6b03', padding: 15, borderRadius: 8, marginTop: 20 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  conSaveButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    paddingTop: 20,
  }
});
