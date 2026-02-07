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

/** Retorna se o endereço tem formato válido (ID numérico ou extenso A.01.02.03.04) */
function isEnderecoFormatoValido(valor: string): boolean {
  const t = valor.trim();
  if (!t) return false;
  if (/^\d{1,5}$/.test(t)) return true;
  if (/^[A-Z]\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(t.toUpperCase())) return true;
  return false;
}

interface ModalEnderecoProps {
  visible: boolean;
  produtoAtual: Produto | null;
  valorEnderecoInput: string;
  podeConfirmar: boolean;
  /** Quantidade bipada nesta sessão do modal (memória local) */
  quantidadeContada?: number;
  /** Quantidade já bipada no backend */
  quantidadeBipada?: number;
  carregandoConfirmacao?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
  onEnderecoInputChange: (texto: string) => void;
  onEnderecoSubmit: (event?: any) => void;
}

export const ModalEndereco = React.memo<ModalEnderecoProps>(
  ({
    visible,
    produtoAtual,
    valorEnderecoInput,
    podeConfirmar,
    quantidadeContada = 0,
    quantidadeBipada = 0,
    carregandoConfirmacao = false,
    onCancelar,
    onConfirmar,
    onEnderecoInputChange,
    onEnderecoSubmit,
  }) => {
    // Total = backend + local
    const quantidadeTotal = quantidadeBipada + quantidadeContada;
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert(
            "Cancelar",
            "Tem certeza? O produto não será finalizado.",
            [
              { text: "Não", style: "cancel" },
              { text: "Sim", onPress: onCancelar },
            ],
          );
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
                <Text style={styles.modalTitle}>Confirmar Endereço</Text>
              </View>

              {produtoAtual && (
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductName}>
                    {produtoAtual.descricao}
                  </Text>
                  <Text style={styles.modalProductCode}>
                    Código: {produtoAtual.id}
                  </Text>
                  <Text style={styles.modalProductQuantity}>
                    Endereço esperado: {produtoAtual.endereco}
                  </Text>
                  <Text style={styles.modalProductQuantity}>
                    Quantidade a bipar: {quantidadeTotal}/
                    {produtoAtual.quantidade}
                  </Text>
                </View>
              )}

              <View style={styles.enderecoContainer}>
                <Text style={styles.enderecoLabel}>
                  Escaneie o endereço ou ID do produto:
                </Text>
                <View style={styles.modalInputRow}>
                  <Input
                    value={valorEnderecoInput}
                    onChangeText={onEnderecoInputChange}
                    placeholder={`Endereço: ${produtoAtual?.endereco} ou ID: ${produtoAtual?.idEndereco}`}
                    style={styles.modalInput}
                    onSubmitEditing={onEnderecoSubmit}
                    returnKeyType="done"
                    autoFocus={true}
                    blurOnSubmit={false}
                  />
                </View>
                {valorEnderecoInput.trim() &&
                  !isEnderecoFormatoValido(valorEnderecoInput) && (
                    <Text style={styles.enderecoErro}>
                      Formato inválido. Use ID numérico (ex: 123) ou extenso
                      (ex: A.01.02.03.04).
                    </Text>
                  )}
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
                      ],
                    );
                  }}
                  style={styles.modalCancelButton}
                />
                <Button
                  title={carregandoConfirmacao ? "Confirmando..." : "Confirmar"}
                  onPress={() => onConfirmar()}
                  disabled={
                    !valorEnderecoInput.trim() ||
                    !podeConfirmar ||
                    carregandoConfirmacao
                  }
                  style={styles.modalConfirmButton}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  },
);

ModalEndereco.displayName = "ModalEndereco";

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
    textAlign: "center",
  },
  modalInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  modalInput: {
    flex: 1,
  },
  enderecoErro: {
    marginTop: 8,
    fontSize: 12,
    color: "#b91c1c",
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
