import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HeaderProps {
  onReset: () => void;
}

export default function HeaderEnderecamento({ onReset }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Endereçamento</Text>
      <TouchableOpacity onPress={onReset} style={styles.resetButton}>
        <Ionicons name="refresh" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: Colors.cardBackground,
    paddingTop: Platform.OS === "android" ? 40 : 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  backButton: {
    padding: 8,
  },

  resetButton: {
    padding: 8,
  },
});
