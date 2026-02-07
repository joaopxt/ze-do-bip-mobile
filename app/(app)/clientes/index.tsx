/**
 * Tela Lista de Clientes - Zé da Entrega
 * Exibe clientes da rota em ordem, com status e travas
 *
 * Implementação completa com dados reais do SQLite via EntregaContext.
 */

import { Colors } from "@/constants/Colors";
import { useEntrega } from "@/contexts";
import { Logger } from "@/utils/logger";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Cliente } from "@/types/entrega";

export default function ClientesScreen() {
  const { clientes, carga, fase, rota } = useEntrega();
  const router = useRouter();

  const cargaFinalizada = carga?.status === 'finalizada' || fase === 'ROTA';

  Logger.debug("[CLIENTES] Renderizando lista de clientes", {
    total: clientes.length,
    cargaFinalizada,
    fase,
  });

  const handleVoltarCarga = () => {
    router.back();
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    if (!cargaFinalizada) {
      Logger.warn("[CLIENTES] Carga não finalizada, cliente bloqueado");
      return;
    }

    if (cliente.status === 'bloqueado') {
      Logger.warn(`[CLIENTES] Cliente ${cliente.id} bloqueado`);
      return;
    }

    router.push(`/(app)/cliente/${cliente.id}`);
  };

  const getStatusColor = (status: Cliente['status']) => {
    switch (status) {
      case 'em_andamento': return Colors.info;
      case 'finalizado': return Colors.success;
      case 'bloqueado': return Colors.gray[400];
      default: return Colors.gray[400];
    }
  };

  const getStatusLabel = (status: Cliente['status']) => {
    switch (status) {
      case 'em_andamento': return 'Em Andamento';
      case 'finalizado': return 'Finalizado';
      case 'bloqueado': return 'Bloqueado';
      default: return 'Aguardando';
    }
  };

  const renderCliente = ({ item: cliente }: { item: Cliente }) => {
    const isBloqueado = !cargaFinalizada || cliente.status === 'bloqueado';

    return (
      <TouchableOpacity
        style={[styles.clienteCard, isBloqueado && styles.clienteCardBloqueado]}
        onPress={() => handleSelecionarCliente(cliente)}
        disabled={isBloqueado}
        activeOpacity={0.7}
      >
        <View style={styles.clienteCardLeft}>
          <View style={[styles.orderBadge, { backgroundColor: Colors.primary }]}>
            <Text style={styles.orderBadgeText}>{cliente.ordem_na_rota}</Text>
          </View>
        </View>

        <View style={styles.clienteCardContent}>
          <Text style={[styles.clienteNome, isBloqueado && styles.textoBloqueado]}>
            {cliente.nome_comercial || cliente.nome_formal}
          </Text>
          <Text style={[styles.clienteEndereco, isBloqueado && styles.textoBloqueado]}>
            {cliente.endereco}
          </Text>
          <View style={styles.clienteInfoRow}>
            <Text style={styles.clienteOrdens}>
              {cliente.ordens_finalizadas}/{cliente.total_ordens} ordens
            </Text>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(cliente.status) }]} />
            <Text style={[styles.clienteStatus, { color: getStatusColor(cliente.status) }]}>
              {getStatusLabel(cliente.status)}
            </Text>
          </View>
        </View>

        {isBloqueado && (
          <View style={styles.lockIcon}>
            <Text style={styles.lockText}>🔒</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const clientesOrdenados = [...clientes].sort((a, b) => a.ordem_na_rota - b.ordem_na_rota);
  const todosFinalizados = clientes.length > 0 && clientes.every(c => c.status === 'finalizado');
  const clientesAtendidos = clientes.filter(c => c.status === 'finalizado').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleVoltarCarga} style={styles.backButton}>
          <Text style={styles.backText}>← Carga</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Clientes da Rota</Text>
          <Text style={styles.headerSubtitle}>
            {rota?.placa_veiculo || ''} • {clientes.length} clientes
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Aviso se carga não finalizada */}
      {!cargaFinalizada && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Finalize a Ordem de Carga para desbloquear os clientes
          </Text>
        </View>
      )}

      {/* Banner TODOS finalizados — voltar ao galpão */}
      {todosFinalizados && (
        <TouchableOpacity style={styles.successBanner} onPress={handleVoltarCarga}>
          <Text style={styles.successBannerText}>
            Todos os {clientesAtendidos} clientes atendidos — Voltar ao Galpão para Enviar
          </Text>
        </TouchableOpacity>
      )}

      {/* Progresso */}
      {cargaFinalizada && !todosFinalizados && (
        <View style={styles.progressBanner}>
          <Text style={styles.progressBannerText}>
            {clientesAtendidos}/{clientes.length} clientes finalizados
          </Text>
        </View>
      )}

      {/* Lista de clientes */}
      {clientes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum cliente na rota</Text>
          <Text style={styles.emptySubtext}>
            Execute o SYNC DOWN para carregar a rota
          </Text>
        </View>
      ) : (
        <FlatList
          data={clientesOrdenados}
          renderItem={renderCliente}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
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
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  warningBanner: {
    backgroundColor: "#fff7ed",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  warningText: {
    fontSize: 13,
    color: Colors.gray[700],
    textAlign: "center",
  },
  successBanner: {
    backgroundColor: "#dcfce7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.success,
  },
  successBannerText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: "center",
    fontWeight: "700",
  },
  progressBanner: {
    backgroundColor: "#e0f2fe",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.info,
  },
  progressBannerText: {
    fontSize: 13,
    color: Colors.info,
    textAlign: "center",
    fontWeight: "500",
  },
  listContent: {
    padding: 12,
  },
  clienteCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  clienteCardBloqueado: {
    opacity: 0.5,
  },
  clienteCardLeft: {
    marginRight: 12,
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  orderBadgeText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: "bold",
  },
  clienteCardContent: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  clienteEndereco: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  clienteInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clienteOrdens: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  clienteStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  textoBloqueado: {
    color: Colors.gray[400],
  },
  lockIcon: {
    marginLeft: 8,
  },
  lockText: {
    fontSize: 16,
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
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.gray[400],
    textAlign: "center",
  },
});
