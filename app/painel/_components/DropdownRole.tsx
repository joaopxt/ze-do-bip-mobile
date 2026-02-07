/**
 * Dropdown para seleção de Role
 * Permite alternar entre Admin e Armazenista
 */

import { Colors } from "@/constants/Colors";
import { Logger } from "@/utils/logger";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Role, RoleName, ROLES_DISPONIVEIS } from "../_types/painel";

interface DropdownRoleProps {
  roleAtual: RoleName | null;
  onRoleChange: (novaRole: RoleName, roleId: number) => void;
  onRemoveRole?: () => void; // Callback para remover role
  disabled?: boolean;
  compact?: boolean;
}

export default function DropdownRole({
  roleAtual,
  onRoleChange,
  onRemoveRole,
  disabled = false,
  compact = false,
}: DropdownRoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleName | null>(roleAtual);

  // Sincronizar selectedRole com roleAtual quando a prop mudar
  useEffect(() => {
    setSelectedRole(roleAtual);
  }, [roleAtual]);

  const handleSelect = (role: Role) => {
    Logger.debug(`[DROPDOWN_ROLE] handleSelect:`, {
      roleName: role.name,
      roleId: role.id,
      roleAtual: roleAtual || "nenhum",
      selectedRole: selectedRole || "nenhum",
    });
    // Sempre chamar onRoleChange quando selecionar uma role
    setSelectedRole(role.name);
    onRoleChange(role.name, role.id);
    setIsOpen(false);
  };

  const handleRemoveRole = () => {
    Logger.debug(`[DROPDOWN_ROLE] handleRemoveRole:`, {
      roleAtual: roleAtual || "nenhum",
    });
    if (onRemoveRole) {
      setSelectedRole(null);
      onRemoveRole();
    }
    setIsOpen(false);
  };

  const getRoleLabel = (roleName: RoleName | null): string => {
    if (!roleName) return "Nenhum";
    return roleName === "admin" ? "Admin" : "Armazenista";
  };

  const getRoleColor = (roleName: RoleName | null): string => {
    if (!roleName) return Colors.textSecondary;
    return roleName === "admin" ? Colors.warning : Colors.primary;
  };

  // Verificar se houve mudança
  const foiAlterado = selectedRole !== roleAtual;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.dropdown,
          compact && styles.dropdownCompact,
          disabled && styles.dropdownDisabled,
          foiAlterado && styles.dropdownAlterado,
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <View
          style={[
            styles.roleTag,
            {
              backgroundColor: selectedRole
                ? getRoleColor(selectedRole) + "20"
                : Colors.gray[200],
            },
          ]}
        >
          <Text
            style={[styles.roleText, { color: getRoleColor(selectedRole) }]}
          >
            {getRoleLabel(selectedRole)}
          </Text>
        </View>
        {!disabled && (
          <Ionicons
            name="chevron-down"
            size={16}
            color={Colors.textSecondary}
          />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecionar Role</Text>
            <FlatList
              data={ROLES_DISPONIVEIS}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.name === selectedRole && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.optionContent}>
                    <View
                      style={[
                        styles.optionTag,
                        { backgroundColor: getRoleColor(item.name) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionTagText,
                          { color: getRoleColor(item.name) },
                        ]}
                      >
                        {getRoleLabel(item.name)}
                      </Text>
                    </View>
                    {item.description && (
                      <Text style={styles.optionDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {item.name === selectedRole && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.success}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                roleAtual && onRemoveRole ? (
                  <TouchableOpacity
                    style={[styles.option, styles.optionRemove]}
                    onPress={handleRemoveRole}
                  >
                    <View style={styles.optionContent}>
                      <View
                        style={[
                          styles.optionTag,
                          { backgroundColor: Colors.danger + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTagText,
                            { color: Colors.danger },
                          ]}
                        >
                          Nenhum
                        </Text>
                      </View>
                      <Text style={styles.optionDescription}>
                        Remover role do usuário
                      </Text>
                    </View>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={Colors.danger}
                    />
                  </TouchableOpacity>
                ) : null
              }
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 130,
    gap: 8,
  },
  dropdownCompact: {
    minWidth: 110,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dropdownDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.gray[100],
  },
  dropdownAlterado: {
    borderColor: Colors.warning,
    borderWidth: 2,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 320,
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 16,
    textAlign: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.gray[50],
  },
  optionSelected: {
    backgroundColor: Colors.primary + "15",
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  optionTagText: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  optionRemove: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    marginTop: 8,
    paddingTop: 8,
    backgroundColor: Colors.danger + "05",
  },
});
