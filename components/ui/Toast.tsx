import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity } from "react-native";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
}

export const Toast = ({
  message,
  type = "info",
  visible,
  onHide,
}: ToastProps) => {
  const opacity = useRef(new Animated.Value(0)).current;

  // Cores baseadas no tipo
  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#10b981"; // Green
      case "error":
        return "#ef4444"; // Red
      case "warning":
        return "#f59e0b"; // Orange
      default:
        return Colors.primary; // Blue/Default
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "warning";
      default:
        return "information-circle";
    }
  };

  useEffect(() => {
    if (visible) {
      // Animação de entrada
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide após 3 segundos
      const timer = setTimeout(() => {
        hide();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (visible) onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, backgroundColor: getBackgroundColor() },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hide}
        activeOpacity={0.9}
      >
        <Ionicons name={getIcon()} size={24} color="#FFF" />
        <Text style={styles.message}>{message}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 60, // Ajuste conforme SafeArea
    left: 20,
    right: 20,
    borderRadius: 8,
    padding: 16,
    zIndex: 9999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  message: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
