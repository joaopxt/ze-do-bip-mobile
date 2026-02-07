/**
 * ModalContador - Modal de contagem de produtos
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";
import { useToast } from "@/contexts/ToastContext";
import { Produto } from "@/types/siac";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";

interface ModalContadorProps {
  visible: boolean;
  produtoAtual: Produto | null;
  /** Quantidade bipada nesta sessão do modal (memória local, ainda não enviada ao backend) */
  quantidadeContada: number;
  /** Quantidade já bipada no backend (qtde_bipada retornada pela API) */
  quantidadeBipada: number;
  quantidadeManual: string;
  valorModalInput: string;

  onCancelar: () => void;
  /** Chamado ao pressionar Próximo: fecha este modal e abre o modal de endereço */
  onConfirmar: () => void;
  onModalInputChange: (texto: string) => void;
  onModalSubmit: (event?: any) => void;
  onQuantidadeManualChange: (valor: string) => void;
  onAdicionarQuantidade: (quantidade: number) => void;
  setErro: (erro: string) => void;
}

export const ModalContador = React.memo<ModalContadorProps>(
  ({
    visible,
    produtoAtual,
    quantidadeContada,
    quantidadeBipada,
    quantidadeManual,
    valorModalInput,
    onCancelar,
    onConfirmar,
    onModalInputChange,
    onModalSubmit,
    onQuantidadeManualChange,
    onAdicionarQuantidade,
    setErro,
  }) => {
    // Total = backend + local
    const quantidadeTotal = quantidadeBipada + quantidadeContada;
    const { showToast } = useToast();

    const handleAdicionarQuantidade = () => {
      if (!produtoAtual) return;

      const quantidade = parseInt(quantidadeManual.trim());

      if (isNaN(quantidade) || quantidade <= 0) {
        showToast("Digite um número entre 1 e 20", "warning");
        return;
      }

      if (quantidade > 20) {
        showToast(
          `Você pode digitar no máximo 20 unidades por vez! Quantidade digitada: ${quantidade}`,
          "warning",
        );
        return;
      }

      onAdicionarQuantidade(quantidade);
    };

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onCancelar}
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
                  name="cube-outline"
                  size={24}
                  color={Colors.primary}
                />
                <Text style={styles.modalTitle}>Contagem do Produto</Text>
              </View>

              {produtoAtual && (
                <View style={styles.modalProductInfo}>
                  <Text style={styles.modalProductName}>
                    {produtoAtual.descricao}
                  </Text>
                  <Text style={styles.modalProductCode}>
                    Num. Fábrica: {produtoAtual.codigoFabrica}
                  </Text>
                  <Text style={styles.modalProductQuantity}>
                    Quantidade bipada: {quantidadeTotal}/
                    {produtoAtual.quantidade}
                  </Text>
                  <Text style={styles.modalProductQuantity}>
                    Endereço esperado: {produtoAtual.endereco}
                    {produtoAtual.idEndereco
                      ? ` ou ID: ${produtoAtual.idEndereco}`
                      : ""}
                  </Text>
                </View>
              )}

              <View style={styles.contadorContainer}>
                <Text style={styles.contadorLabel}>Quantidade Contada:</Text>
                <Text
                  style={[
                    styles.contadorValue,
                    produtoAtual &&
                      quantidadeTotal === produtoAtual.quantidade &&
                      styles.contadorCompleto,
                  ]}
                >
                  {quantidadeContada}
                </Text>
              </View>

              {/* Campo para bipagem no modal */}
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputLabel}>
                  Escaneie o código do produto:
                </Text>
                <View style={styles.modalInputRow}>
                  <Input
                    value={valorModalInput}
                    onChangeText={onModalInputChange}
                    placeholder={`Código: ${
                      Array.isArray(produtoAtual?.codigoBarras) &&
                      produtoAtual.codigoBarras.length > 0
                        ? produtoAtual.codigoBarras[0]
                        : produtoAtual?.codigoBarras || produtoAtual?.id
                    }`}
                    style={styles.modalInput}
                    onSubmitEditing={onModalSubmit}
                    returnKeyType="done"
                    autoFocus={true}
                    blurOnSubmit={false}
                  />
                  <Button
                    title="+"
                    onPress={onModalSubmit}
                    disabled={!valorModalInput.trim()}
                    style={styles.modalAddButton}
                  />
                </View>
              </View>

              {/* Opção de quantidade manual para produtos >20 */}
              {produtoAtual &&
                produtoAtual.quantidade > 20 &&
                quantidadeContada > 0 && (
                  <View style={styles.quantidadeManualContainer}>
                    <Text style={styles.quantidadeManualLabel}>
                      Ou adicione quantidade parcial (máx. 20):
                    </Text>
                    <View style={styles.quantidadeManualRow}>
                      <Input
                        value={quantidadeManual}
                        onChangeText={onQuantidadeManualChange}
                        placeholder="Adicionar quantidade (1-20)"
                        keyboardType="numeric"
                        style={styles.quantidadeManualInput}
                      />
                      <Button
                        title="Adicionar"
                        onPress={handleAdicionarQuantidade}
                        disabled={!quantidadeManual.trim()}
                        style={styles.quantidadeManualButton}
                      />
                    </View>
                    <Text style={styles.quantidadeManualHint}>
                      Faltam: {produtoAtual.quantidade - quantidadeTotal}{" "}
                      unidades
                    </Text>
                  </View>
                )}

              {/* Aviso se usuário tentar digitar sem bipar primeiro */}
              {produtoAtual &&
                produtoAtual.quantidade > 20 &&
                quantidadeContada === 0 && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      ⚠️ Para produtos com mais de 20 itens, você deve bipar
                      pelo menos 1 item antes de poder digitar quantidades
                      parciais.
                    </Text>
                  </View>
                )}

              <View style={styles.modalButtons}>
                <Button
                  title="Fechar"
                  variant="outline"
                  onPress={onCancelar}
                  style={styles.modalCancelButton}
                />
                <Button
                  title="Próximo"
                  onPress={onConfirmar}
                  disabled={quantidadeContada < 1}
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

ModalContador.displayName = "ModalContador";

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
  contadorContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  contadorLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  contadorValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 8,
  },
  contadorCompleto: {
    color: Colors.success,
  },
  contadorInstrucao: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  modalInputContainer: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: "500",
  },
  modalInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    width: "82%",
  },
  modalInput: {
    flex: 1,
  },
  modalAddButton: {
    minWidth: 50,
    height: 40,
    flex: 1,
  },
  quantidadeManualContainer: {
    marginBottom: 20,
  },
  quantidadeManualLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: "500",
  },
  quantidadeManualRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  quantidadeManualInput: {
    flex: 1,
    textAlign: "center",
  },
  quantidadeManualButton: {
    minWidth: 80,
    height: 40,
  },
  quantidadeManualHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
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
  warningContainer: {
    backgroundColor: "#fef3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    fontSize: 14,
    color: "#92400e",
    textAlign: "center",
    fontStyle: "italic",
  },
});
