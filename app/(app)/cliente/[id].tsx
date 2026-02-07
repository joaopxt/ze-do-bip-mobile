/**
 * Tela Ordens do Cliente - Zé da Entrega
 * Lista ordens de DESCARGA e COLETA de um cliente específico
 *
 * Implementação completa com DESCARGA/COLETA, contagem e ações.
 */

import { Colors } from "@/constants/Colors";
import { useEntrega } from "@/contexts";
import { Ordem } from "@/types/entrega";
import { Logger } from "@/utils/logger";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ClienteOrdensScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    getClienteById,
    getOrdensCliente,
    getContagemCliente,
    getContagemOrdem,
    iniciarEntregaCliente,
    finalizarEntregaCliente,
  } = useEntrega();

  const cliente = getClienteById(id);
  const ordens = getOrdensCliente(id);
  const contagem = getContagemCliente(id);

  Logger.debug(`[CLIENTE] Renderizando ordens do cliente ${id}`, {
    nome: cliente?.nome_comercial,
    ordens: ordens.length,
  });

  const handleVoltar = () => {
    router.back();
  };

  const handleIniciarEntrega = async () => {
    if (id) {
      await iniciarEntregaCliente(id);
    }
  };

  const handleFinalizarEntrega = async () => {
    if (id) {
      const sucesso = await finalizarEntregaCliente(id);
      if (sucesso) {
        router.back();
      }
    }
  };

  const handleAbrirOrdem = (ordem: Ordem) => {
    router.push(`/(app)/volumes/${ordem.id}`);
  };

  const getOrdemStatusColor = (status: Ordem['status']) => {
    switch (status) {
      case 'em_andamento': return Colors.info;
      case 'finalizada': return Colors.success;
      default: return Colors.gray[400];
    }
  };

  const getOrdemStatusLabel = (status: Ordem['status']) => {
    switch (status) {
      case 'em_andamento': return 'Em Andamento';
      case 'finalizada': return 'Finalizada';
      default: return 'Aguardando';
    }
  };

  const todasFinalizadas = ordens.length > 0 && ordens.every(o => o.status === 'finalizada');

  const renderOrdem = ({ item: ordem }: { item: Ordem }) => {
    const contagemOrdem = getContagemOrdem(ordem.id);
    const tipoColor = ordem.tipo === 'DESCARGA' ? Colors.info : Colors.secondary;

    return (
      <TouchableOpacity
        style={styles.ordemCard}
        onPress={() => handleAbrirOrdem(ordem)}
        activeOpacity={0.7}
      >
        <View style={styles.ordemHeader}>
          <View style={[styles.tipoBadge, { backgroundColor: tipoColor }]}>
            <Text style={styles.tipoBadgeText}>{ordem.tipo}</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: getOrdemStatusColor(ordem.status) }]} />
          <Text style={[styles.ordemStatus, { color: getOrdemStatusColor(ordem.status) }]}>
            {getOrdemStatusLabel(ordem.status)}
          </Text>
        </View>

        <Text style={styles.ordemNota}>
          NF {ordem.numero_nota}{ordem.serie ? ` / ${ordem.serie}` : ''}
        </Text>

        <View style={styles.ordemStatsRow}>
          <View style={styles.ordemStat}>
            <Text style={[styles.ordemStatNum, { color: Colors.success }]}>{contagemOrdem.entregues}</Text>
            <Text style={styles.ordemStatLabel}>Entregues</Text>
          </View>
          <View style={styles.ordemStat}>
            <Text style={[styles.ordemStatNum, { color: Colors.warning }]}>{contagemOrdem.pendentes}</Text>
            <Text style={styles.ordemStatLabel}>Pendentes</Text>
          </View>
          <View style={styles.ordemStat}>
            <Text style={[styles.ordemStatNum, { color: Colors.danger }]}>{contagemOrdem.extraviados}</Text>
            <Text style={styles.ordemStatLabel}>Extraviados</Text>
          </View>
          <View style={styles.ordemStat}>
            <Text style={[styles.ordemStatNum, { color: Colors.text }]}>{contagemOrdem.total}</Text>
            <Text style={styles.ordemStatLabel}>Total</Text>
          </View>
        </View>

        {/* Barra de progresso */}
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${contagemOrdem.percentual}%` }]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (!cliente) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Cliente não encontrado</Text>
          <TouchableOpacity onPress={handleVoltar}>
            <Text style={styles.linkText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Separar ordens por tipo
  const ordensDescarga = ordens.filter(o => o.tipo === 'DESCARGA');
  const ordensColeta = ordens.filter(o => o.tipo === 'COLETA');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleVoltar} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {cliente.nome_comercial}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {cliente.endereco}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Resumo do cliente */}
      <View style={styles.resumoRow}>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoNum}>{contagem.volumesEntregues}</Text>
          <Text style={styles.resumoLabel}>Entregues</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoNum}>{contagem.volumesPendentes}</Text>
          <Text style={styles.resumoLabel}>Pendentes</Text>
        </View>
        <View style={styles.resumoItem}>
          <Text style={styles.resumoNum}>{contagem.volumesExtraviados}</Text>
          <Text style={styles.resumoLabel}>Extraviados</Text>
        </View>
      </View>

      {/* Botão Iniciar Entrega */}
      {cliente.status === 'aguardando' && (
        <TouchableOpacity style={styles.iniciarButton} onPress={handleIniciarEntrega}>
          <Text style={styles.iniciarButtonText}>Iniciar Entrega do Cliente</Text>
        </TouchableOpacity>
      )}

      {/* Lista de ordens */}
      <FlatList
        data={ordens}
        renderItem={renderOrdem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          ordens.length > 0 ? (
            <Text style={styles.sectionTitle}>
              {ordensDescarga.length} Descarga{ordensDescarga.length !== 1 ? 's' : ''} • {ordensColeta.length} Coleta{ordensColeta.length !== 1 ? 's' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma ordem para este cliente</Text>
          </View>
        }
      />

      {/* Botão Finalizar Entrega */}
      {todasFinalizadas && cliente.status === 'em_andamento' && (
        <View style={styles.footerButton}>
          <TouchableOpacity style={styles.finalizarButton} onPress={handleFinalizarEntrega}>
            <Text style={styles.finalizarButtonText}>Finalizar Entrega do Cliente</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingTop: 16,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: "600",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  resumoRow: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  resumoItem: {
    flex: 1,
    alignItems: "center",
  },
  resumoNum: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  resumoLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  iniciarButton: {
    backgroundColor: Colors.success,
    margin: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  iniciarButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginBottom: 8,
  },
  listContent: {
    padding: 12,
  },
  ordemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  ordemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tipoBadgeText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: "700",
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ordemStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  ordemNota: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500",
    marginBottom: 10,
  },
  ordemStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  ordemStat: {
    alignItems: "center",
  },
  ordemStatNum: {
    fontSize: 16,
    fontWeight: "bold",
  },
  ordemStatLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray[200],
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: 2,
  },
  footerButton: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    backgroundColor: Colors.surface,
  },
  finalizarButton: {
    backgroundColor: Colors.info,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  finalizarButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600",
  },
});
