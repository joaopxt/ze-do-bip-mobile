/**
 * Header do Painel de Controle
 * Com barra de busca por código de usuário
 */

import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface HeaderPainelProps {
  onBuscar?: (codoper: string) => void;
  isBuscando?: boolean;
}

export default function HeaderPainel({
  onBuscar,
  isBuscando = false,
}: HeaderPainelProps) {
  const router = useRouter();
  const [codigoBusca, setCodigoBusca] = useState("");

  const handleBuscar = () => {
    if (onBuscar && codigoBusca.trim()) {
      onBuscar(codigoBusca.trim());
    }
  };

  return (
    <View style={styles.container}>
      {/* Linha única: Botão voltar + Barra de busca */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {onBuscar && (
          <View style={styles.searchRow}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color={Colors.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por codoper..."
                placeholderTextColor={Colors.textSecondary}
                value={codigoBusca}
                onChangeText={setCodigoBusca}
                onSubmitEditing={handleBuscar}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {codigoBusca.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCodigoBusca("")}
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.searchButton,
                (!codigoBusca.trim() || isBuscando) &&
                  styles.searchButtonDisabled,
              ]}
              onPress={handleBuscar}
              disabled={!codigoBusca.trim() || isBuscando}
            >
              {isBuscando ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Ionicons name="search" size={20} color={Colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: 6,
    paddingTop: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  backButton: {
    padding: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
    minWidth: 0, // Permite que o flex funcione corretamente
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    minWidth: 0, // Permite que o flex funcione corretamente
  },
  searchButton: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48, // Garante que o botão tenha largura mínima
  },
  searchIcon: {
    marginLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: Colors.text,
  },
  clearButton: {
    padding: 8,
    marginRight: 4,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
});
