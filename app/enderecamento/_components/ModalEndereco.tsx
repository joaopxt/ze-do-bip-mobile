/**
 * ModalEndereco - Modal de confirmação de endereço
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";
import { Produto } from "@/types/siac";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";

interface ModalEnderecoProps {
  visible: boolean;
  produtoAtual: Produto | null;
  valorEnderecoInput: string;

  onCancelar: () => void;
  onConfirmar: () => void;
  onEnderecoInputChange: (texto: string) => void;
  onEnderecoSubmit: (event?: any) => void;
}

export function ModalEndereco({
  visible,
  produtoAtual,
  valorEnderecoInput,
  onCancelar,
  onConfirmar,
  onEnderecoInputChange,
  onEnderecoSubmit,
}: ModalEnderecoProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        Alert.alert("Cancelar", "Tem certeza? O endereço não será alterado.", [
          { text: "Não", style: "cancel" },
          { text: "Sim", onPress: onCancelar },
        ]);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Ionicons
                name="location-outline"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.modalTitle}>Alterar Endereço</Text>
            </View>

            {produtoAtual && (
              <View style={styles.modalProductInfo}>
                <Text style={styles.modalProductName}>
                  {produtoAtual.descricao}
                </Text>
                <Text style={styles.modalProductCode}>
                  N° fab: {produtoAtual.codigoFabrica}
                </Text>
              </View>
            )}

            <View style={styles.enderecoContainer}>
              <Text style={styles.enderecoLabel}>Digite o novo endereço:</Text>
              <View style={styles.modalInputRow}>
                <Input
                  value={valorEnderecoInput}
                  onChangeText={onEnderecoInputChange}
                  placeholder={`Endereço: X.00.00.00.00`}
                  style={styles.modalInput}
                  onSubmitEditing={onEnderecoSubmit}
                  returnKeyType="done"
                  autoFocus={true}
                  blurOnSubmit={false}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => {
                  Alert.alert(
                    "Cancelar",
                    "Tem certeza? O produto não será finalizado.",
                    [
                      { text: "Não", style: "cancel" },
                      { text: "Sim", onPress: onCancelar },
                    ]
                  );
                }}
                style={styles.modalCancelButton}
              />
              <Button
                title="Confirmar"
                onPress={onConfirmar}
                disabled={valorEnderecoInput.length < 0}
                style={styles.modalConfirmButton}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
  },
  modalScrollContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
  },
  modalProductInfo: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
    textAlign: "justify",
  },
  modalProductCode: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  modalProductQuantity: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  enderecoContainer: {
    marginBottom: 20,
  },
  enderecoLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
    fontWeight: "500",
    textAlign: "left",
  },
  modalInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  modalInput: {
    flex: 1,
  },
  modalAddButton: {
    minWidth: 50,
    height: 40,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalConfirmButton: {
    flex: 1,
  },
});
