/**
 * Item de Usuário na lista
 * Exibe nome e dropdown de role
 */

import { Colors } from "@/constants/Colors";
import { Logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MudancaRole, RoleName, UsuarioPainel } from "../_types/painel";
import DropdownRole from "./DropdownRole";

interface ItemUsuarioProps {
  usuario: UsuarioPainel;
  mudancaPendente?: MudancaRole;
  onRoleChange: (
    codoper: string,
    nome: string,
    roleAtual: RoleName,
    novaRole: RoleName
  ) => void;
  onRemoveRole?: (codoper: string, nome: string, roleAtual: RoleName) => void;
  disabled?: boolean;
}

export default function ItemUsuario({
  usuario,
  mudancaPendente,
  onRoleChange,
  onRemoveRole,
  disabled = false,
}: ItemUsuarioProps) {
  // Role que está sendo exibida no dropdown (pode ser a original ou uma mudança pendente)
  const roleAtualDisplay = mudancaPendente?.novaRole || usuario.role;
  // Role original do usuário (antes de qualquer mudança)
  const roleOriginal = usuario.role;
  const foiAlterado = !!mudancaPendente;

  const handleRoleChange = (novaRole: RoleName, roleId: number) => {
    // Sempre passar a role original como roleAtual, pois é a referência base
    // Se o usuário selecionar a role original, a mudança será revertida
    Logger.debug(`[ITEM_USUARIO] handleRoleChange:`, {
      codoper: usuario.codoper,
      nome: usuario.nome,
      roleOriginal,
      novaRole,
      roleId,
    });
    onRoleChange(usuario.codoper, usuario.nome, roleOriginal, novaRole);
  };

  const handleRemoveRole = () => {
    if (onRemoveRole) {
      Logger.debug(`[ITEM_USUARIO] handleRemoveRole:`, {
        codoper: usuario.codoper,
        nome: usuario.nome,
        roleOriginal,
      });
      onRemoveRole(usuario.codoper, usuario.nome, roleOriginal);
    }
  };

  return (
    <View style={[styles.container, foiAlterado && styles.containerAlterado]}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={Colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.nome} numberOfLines={1}>
            {usuario.nome}
          </Text>
          <Text style={styles.codoper}>Código: {usuario.codoper}</Text>
        </View>
      </View>

      <View style={styles.roleContainer}>
        {foiAlterado && (
          <View style={styles.mudancaIndicator}>
            <Ionicons name="swap-horizontal" size={14} color={Colors.warning} />
          </View>
        )}
        <DropdownRole
          roleAtual={roleAtualDisplay}
          onRoleChange={(novaRole, roleId) =>
            handleRoleChange(novaRole, roleId)
          }
          onRemoveRole={onRemoveRole ? handleRemoveRole : undefined}
          disabled={disabled}
          compact
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  containerAlterado: {
    backgroundColor: Colors.warning + "08",
    borderColor: Colors.warning + "40",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  nome: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  codoper: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mudancaIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.warning + "20",
    justifyContent: "center",
    alignItems: "center",
  },
});
