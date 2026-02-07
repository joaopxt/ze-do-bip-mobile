/**
 * Card de lista de usuários
 * Renderiza lista com título e itens
 */

import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MudancaRole, RoleName, UsuarioPainel } from "../_types/painel";
import ItemUsuario from "./ItemUsuario";

interface CardUsuariosProps {
  titulo: string;
  icone: keyof typeof Ionicons.glyphMap;
  usuarios: UsuarioPainel[];
  usuariosCompletos: UsuarioPainel[];
  mudancasPendentes: Map<string, MudancaRole>;
  onRoleChange: (
    codoper: string,
    nome: string,
    roleAtual: RoleName,
    novaRole: RoleName,
    semRoleOriginal?: boolean
  ) => void;
  onRemoveRole?: (codoper: string, nome: string, roleAtual: RoleName) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  iconColor?: string;
  onCarregarMais?: () => void;
  temMais?: boolean;
}

export default function CardUsuarios({
  titulo,
  icone,
  usuarios,
  usuariosCompletos,
  mudancasPendentes,
  onRoleChange,
  onRemoveRole,
  isLoading = false,
  emptyMessage = "Nenhum usuário encontrado",
  iconColor = Colors.primary,
  onCarregarMais,
  temMais = false,
}: CardUsuariosProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColor + "15" },
            ]}
          >
            <Ionicons name={icone} size={20} color={iconColor} />
          </View>
          <Text style={styles.titulo}>{titulo}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={[styles.iconContainer, { backgroundColor: iconColor + "15" }]}
        >
          <Ionicons name={icone} size={20} color={iconColor} />
        </View>
        <Text style={styles.titulo}>{titulo}</Text>
        <View style={styles.contadorContainer}>
          <Text style={styles.contador}>
            {usuarios.length}/{usuariosCompletos.length}
          </Text>
        </View>
      </View>

      {usuarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="people-outline"
            size={40}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <>
          <View style={styles.listContainer}>
            {usuarios.map((usuario) => (
              <ItemUsuario
                key={usuario.codoper}
                usuario={usuario}
                mudancaPendente={mudancasPendentes.get(usuario.codoper)}
                onRoleChange={onRoleChange}
                onRemoveRole={onRemoveRole}
              />
            ))}
          </View>

          {/* Botão Carregar Mais */}
          {temMais && onCarregarMais && (
            <TouchableOpacity
              style={[
                styles.carregarMaisButton,
                { borderColor: iconColor + "40" },
              ]}
              onPress={onCarregarMais}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-down" size={20} color={iconColor} />
              <Text style={[styles.carregarMaisText, { color: iconColor }]}>
                Carregar mais
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
  },
  contadorContainer: {
    backgroundColor: Colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contador: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  listContainer: {
    gap: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  carregarMaisButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
    borderRadius: 10,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
  },
  carregarMaisText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
