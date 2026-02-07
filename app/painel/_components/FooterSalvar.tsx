/**
 * Footer com botão Salvar Alterações
 * Fixo no bottom da tela
 */

import { Colors } from "@/constants/Colors";
import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FooterSalvarProps {
  quantidadeMudancas: number;
  onSalvar: () => void;
  isSaving: boolean;
  disabled?: boolean;
}

export default function FooterSalvar({
  quantidadeMudancas,
  onSalvar,
  isSaving,
  disabled = false,
}: FooterSalvarProps) {
  const temMudancas = quantidadeMudancas > 0;
  const isDisabled = disabled || !temMudancas || isSaving;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Contador de mudanças */}
        <View style={styles.infoContainer}>
          {temMudancas ? (
            <>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{quantidadeMudancas}</Text>
              </View>
              <Text style={styles.infoText}>
                {quantidadeMudancas === 1
                  ? "mudança pendente"
                  : "mudanças pendentes"}
              </Text>
            </>
          ) : (
            <Text style={styles.infoTextEmpty}>
              Nenhuma mudança para salvar
            </Text>
          )}
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.button, isDisabled && styles.buttonDisabled]}
          onPress={onSalvar}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.textInverse} />
              <Text style={styles.buttonText}>Salvar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingBottom: 24, // Safe area
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  badge: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
  },
  infoTextEmpty: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "600",
  },
});
