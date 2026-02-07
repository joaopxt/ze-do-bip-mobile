/**
 * Tela Volumes Faltantes - Zé da Entrega
 * Filtra e exibe apenas volumes pendentes de uma ordem
 *
 * Implementação completa com extravio obrigatório e empty state.
 */

import { Colors } from "@/constants/Colors";
import { useEntrega } from "@/contexts";
import { Volume } from "@/types/entrega";
import { Logger } from "@/utils/logger";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function FaltantesScreen() {
  const { ordemId } = useLocalSearchParams<{ ordemId: string }>();
  const router = useRouter();
  const { getVolumesFaltantes, marcarExtraviado } = useEntrega();

  const faltantes = getVolumesFaltantes(ordemId);

  Logger.debug(`[FALTANTES] Renderizando faltantes da ordem ${ordemId}`, {
    total: faltantes.length,
  });

  const handleVoltar = () => {
    router.back();
  };

  const handleExtraviado = (volume: Volume) => {
    Alert.prompt(
      "Volume Extraviado",
      `Informe o motivo do extravio do volume ${volume.codigo_barras}:`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar Extravio",
          style: "destructive",
          onPress: (observacao) => {
            if (observacao && observacao.trim()) {
              marcarExtraviado(volume.id, observacao.trim());
            } else {
              Alert.alert("Atenção", "A observação é obrigatória para marcar como extraviado.");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const renderFaltante = ({ item: volume }: { item: Volume }) => {
    return (
      <View style={styles.volumeCard}>
        <View style={styles.volumeContent}>
          <Text style={styles.volumeBarras}>{volume.codigo_barras}</Text>
          <Text style={styles.volumeDescricao} numberOfLines={2}>{volume.descricao}</Text>
          <Text style={styles.volumeQtd}>Qtd: {volume.quantidade}</Text>
        </View>

        <TouchableOpacity
          style={styles.extraviadoButton}
          onPress={() => handleExtraviado(volume)}
        >
          <Text style={styles.extraviadoButtonText}>Extraviado</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleVoltar} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Volumes Faltantes</Text>
          <Text style={styles.headerSubtitle}>
            {faltantes.length} volume{faltantes.length !== 1 ? 's' : ''} pendente{faltantes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Lista */}
      {faltantes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyText}>Nenhum volume faltante!</Text>
          <Text style={styles.emptySubtext}>Todos os volumes foram resolvidos</Text>
        </View>
      ) : (
        <FlatList
          data={faltantes}
          renderItem={renderFaltante}
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
  listContent: {
    padding: 12,
  },
  volumeCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  volumeContent: {
    flex: 1,
  },
  volumeBarras: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "monospace",
  },
  volumeDescricao: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  volumeQtd: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  extraviadoButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  extraviadoButtonText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.success,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
