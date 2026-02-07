/**
 * Card de resultado da busca de usuário
 * Exibe informações completas do usuário buscado
 */

import { Colors } from "@/constants/Colors";
import { useToast } from "@/contexts/ToastContext";
import { Logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ResultadoBuscaUsuario, RoleName } from "../_types/painel";
import DropdownRole from "./DropdownRole";

interface CardBuscaUsuarioProps {
  resultado: ResultadoBuscaUsuario;
  nomeUsuario: string;
  mudancaPendente?: import("../_types/painel").MudancaRole;
  onRoleChange: (
    codoper: string,
    nome: string,
    roleAtual: RoleName,
    novaRole: RoleName,
    semRoleOriginal?: boolean
  ) => void;
  onRemoveRole?: (codoper: string, nome: string, roleAtual: RoleName) => void;
  onFechar: () => void;
}

export default function CardBuscaUsuario({
  resultado,
  mudancaPendente,
  onRoleChange,
  onRemoveRole,
  onFechar,
}: CardBuscaUsuarioProps) {
  const { showToast } = useToast();

  // Role original do backend (pode ser null)
  const roleOriginal: RoleName | null = resultado.role
    ? (resultado.role.name.toLowerCase() as RoleName)
    : null;

  // Role que está sendo exibida (pode ser uma mudança pendente ou a original)
  const roleAtualDisplay: RoleName | null =
    mudancaPendente?.novaRole || roleOriginal;

  // Verificar se há mudança pendente
  const foiAlterado = !!mudancaPendente;

  const handleRoleChange = (novaRole: RoleName, roleId: number) => {
    Logger.debug(`[CARD_BUSCA] handleRoleChange:`, {
      codoper: resultado.codoper,
      roleOriginal: roleOriginal || "nenhuma",
      roleAtualDisplay: roleAtualDisplay || "nenhuma",
      novaRole,
      roleId,
      temMudancaPendente: !!mudancaPendente,
    });

    // Se não há role original, usar "armazenista" como placeholder para comparação
    // Mas passar semRoleOriginal=true para indicar que o usuário não tinha role
    const roleBaseParaComparacao: RoleName = roleOriginal || "armazenista";
    const semRoleOriginal = !roleOriginal;

    // Usar a função alterarRole com o parâmetro semRoleOriginal
    // Mas como onRoleChange não aceita esse parâmetro, preciso verificar a interface
    // Por enquanto, vou passar através de uma função wrapper
    onRoleChange(
      resultado.codoper,
      resultado.nomeUsuario || resultado.codoper,
      roleBaseParaComparacao,
      novaRole,
      semRoleOriginal
    );
  };

  const handleRemoveRole = () => {
    if (onRemoveRole && roleOriginal) {
      Logger.debug(`[CARD_BUSCA] handleRemoveRole:`, {
        codoper: resultado.codoper,
        roleOriginal: roleOriginal || "nenhuma",
      });
      onRemoveRole(
        resultado.codoper,
        resultado.nomeUsuario || resultado.codoper,
        roleOriginal
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="search" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.titulo}>Resultado da Busca</Text>
        </View>
        <TouchableOpacity onPress={onFechar} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Info do Usuário */}
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={Colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.codoper}>
              Código: {resultado.codoper} - {resultado.nomeUsuario}
            </Text>
            <View style={styles.roleRow}>
              <Text style={styles.roleLabel}>Role atual:</Text>
              {foiAlterado && (
                <View style={styles.mudancaIndicator}>
                  <Ionicons
                    name="swap-horizontal"
                    size={14}
                    color={Colors.warning}
                  />
                </View>
              )}
              <DropdownRole
                roleAtual={roleAtualDisplay}
                onRoleChange={(novaRole, roleId) =>
                  handleRoleChange(novaRole, roleId)
                }
              />
            </View>
          </View>
        </View>

        {/* Módulos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="grid-outline" size={14} color={Colors.text} />
            {"  "}Módulos de Acesso
          </Text>
          <View style={styles.modulosContainer}>
            {resultado.modules.length > 0 ? (
              resultado.modules.map((modulo) => (
                <View key={modulo} style={styles.moduloTag}>
                  <Text style={styles.moduloText}>{modulo}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nenhum módulo atribuído</Text>
            )}
          </View>
        </View>

        {/* Permissões */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="key-outline" size={14} color={Colors.text} />
            {"  "}Permissões ({resultado.permissions.length})
          </Text>
          <ScrollView
            style={styles.permissoesScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {resultado.permissions.length > 0 ? (
              resultado.permissions.map((perm) => (
                <View key={perm.id} style={styles.permissaoItem}>
                  <View style={styles.permissaoLeft}>
                    <Ionicons
                      name={
                        perm.source === "custom" ? "star" : "checkmark-circle"
                      }
                      size={14}
                      color={
                        perm.source === "custom"
                          ? Colors.warning
                          : Colors.success
                      }
                    />
                    <Text style={styles.permissaoNome}>{perm.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.sourceTag,
                      perm.source === "custom" && styles.sourceTagCustom,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceText,
                        perm.source === "custom" && styles.sourceTextCustom,
                      ]}
                    >
                      {perm.source === "custom" ? "Custom" : "Role"}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nenhuma permissão atribuída</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary + "08",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  userCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
    gap: 8,
  },
  codoper: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mudancaIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.warning + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 10,
  },
  modulosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moduloTag: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moduloText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.primary,
  },
  permissoesScroll: {
    maxHeight: 180,
  },
  permissaoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    marginBottom: 6,
  },
  permissaoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  permissaoNome: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  sourceTag: {
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sourceTagCustom: {
    backgroundColor: Colors.warning + "15",
  },
  sourceText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.success,
  },
  sourceTextCustom: {
    color: Colors.warning,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});
