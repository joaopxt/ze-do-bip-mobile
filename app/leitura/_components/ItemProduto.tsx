/**
 * ItemProduto - Card de produto individual na lista
 */

import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/Colors";
import { Produto } from "@/types/siac";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ProdutoProblemas } from "../types";

interface ItemProdutoProps {
  produto: Produto;
  problemas: ProdutoProblemas;
}

export const ItemProduto = React.memo<ItemProdutoProps>(
  ({ produto, problemas }) => {
    // Determinar o que exibir no cabeçalho: item, id ou código do produto
    const identificador = produto.item
      ? `Item ${produto.item}`
      : produto.id
        ? `ID: ${String(produto.id)}`
        : produto.cdProduto || "Sem identificação";

    // Produto em andamento: não concluído mas com alguma quantidade bipada
    const emAndamento = !produto.concluido && (produto.quantidadeLida || 0) > 0;

    return (
      <View
        style={[
          styles.itemCard,
          produto.concluido
            ? styles.itemCardCompleted
            : emAndamento
              ? styles.itemCardInProgress
              : styles.itemCardPending,
          problemas.bloqueado && styles.itemCardBlocked,
        ]}
      >
        <View style={styles.itemCardContent}>
          <View style={styles.itemCardHeader}>
            <Text style={styles.itemCode}>
              N° Fábrica: {produto.codigoFabrica}
            </Text>
            <View style={styles.statusIcons}>
              {produto.concluido && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={Colors.success}
                />
              )}
              {emAndamento && (
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={Colors.warning}
                />
              )}
              {problemas.bloqueado && (
                <Ionicons name="ban-outline" size={16} color={Colors.danger} />
              )}
            </View>
          </View>
          <Text style={styles.itemDescription}>{produto.descricao}</Text>

          {/* Tags de problemas - exceto SEM ID */}
          {(problemas.semCodigoBarras || problemas.enderecoProblematico) && (
            <View style={styles.problemTags}>
              {problemas.semCodigoBarras && (
                <Badge style={styles.problemBadgeBlocked}>🚫 SEM CÓDIGO</Badge>
              )}
              {problemas.enderecoProblematico && (
                <Badge style={styles.problemBadgeWarning}>
                  ⚠️ ENDEREÇO PENDENTE
                </Badge>
              )}
            </View>
          )}

          <View style={styles.itemDetails}>
            <Text style={styles.itemDetailText}>
              Endereço: {produto.endereco}
            </Text>
            <Text style={styles.itemDetailText}>
              Quantidade: {produto.quantidadeLida || 0}/{produto.quantidade}
            </Text>
          </View>
        </View>

        <View style={styles.itemCardFooter}>
          {/* Tag SEM ID no canto inferior direito */}
          {problemas.semId && (
            <Badge style={styles.problemBadgeWarning}>⚠️ SEM ID</Badge>
          )}
          <Badge
            variant={produto.concluido || emAndamento ? "default" : "outline"}
            style={
              produto.concluido
                ? styles.completedBadge
                : emAndamento
                  ? styles.inProgressBadge
                  : undefined
            }
          >
            {produto.concluido
              ? "Concluído"
              : emAndamento
                ? "Em Andamento"
                : problemas.bloqueado
                  ? "Bloqueado"
                  : "Pendente"}
          </Badge>
        </View>
      </View>
    );
  },
);

ItemProduto.displayName = "ItemProduto";

const styles = StyleSheet.create({
  itemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemCardCompleted: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  itemCardInProgress: {
    backgroundColor: "#fefce8",
    borderColor: "#fde047",
  },
  itemCardPending: {
    backgroundColor: "white",
    borderColor: Colors.gray[200],
  },
  itemCardBlocked: {
    opacity: 0.7,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  itemCardContent: {
    flex: 1,
    marginRight: 12,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
  },
  statusIcons: {
    flexDirection: "row",
    gap: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  problemTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  problemBadgeBlocked: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  problemBadgeWarning: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  itemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  itemDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  itemCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  completedBadge: {
    backgroundColor: Colors.success,
  },
  inProgressBadge: {
    backgroundColor: Colors.warning,
  },
});
