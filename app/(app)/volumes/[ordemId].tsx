/**
 * Tela Volumes da Ordem - Zé da Entrega
 * Scanner USB real + lista com status (pendente/entregue/extraviado)
 * Feedback visual/haptico por scan. Extravio com observação obrigatória.
 */

import { Colors } from "@/constants/Colors";
import { useEntrega } from "@/contexts";
import { useScannerInput } from "@/hooks/useScannerInput";
import { Volume } from "@/types/entrega";
import { Logger } from "@/utils/logger";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";

// ============================================================
// FEEDBACK TYPES
// ============================================================

interface ScanFeedback {
  tipo: "sucesso" | "erro" | "duplicado";
  mensagem: string;
  codigoBarras: string;
  timestamp: number;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function VolumesScreen() {
  const { ordemId } = useLocalSearchParams<{ ordemId: string }>();
  const router = useRouter();
  const {
    getVolumesOrdem,
    getVolumesFaltantes,
    getContagemOrdem,
    biparVolumeEntrega,
    marcarExtraviado,
    finalizarOrdem,
  } = useEntrega();

  // Estado local
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [isProcessando, setIsProcessando] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dados computados
  const volumesOrdem = getVolumesOrdem(ordemId);
  const faltantes = getVolumesFaltantes(ordemId);
  const contagem = getContagemOrdem(ordemId);
  const todosResolvidos = contagem.pendentes === 0 && contagem.total > 0;

  Logger.debug(`[VOLUMES] Renderizando volumes da ordem ${ordemId}`, {
    total: contagem.total,
    entregues: contagem.entregues,
    pendentes: contagem.pendentes,
  });

  // ============================================================
  // SCANNER HOOK
  // ============================================================

  const handleCodigoScaneado = useCallback(
    async (codigo: string) => {
      if (isProcessando) return;

      setIsProcessando(true);
      Logger.debug(`[VOLUMES] Código escaneado: ${codigo}`);

      try {
        const resultado = await biparVolumeEntrega(ordemId, codigo);

        // Vibração: curta = sucesso, longa = erro
        if (resultado.sucesso) {
          Vibration.vibrate(100);
        } else {
          Vibration.vibrate([0, 200, 100, 200]);
        }

        const novoFeedback: ScanFeedback = {
          tipo: resultado.sucesso
            ? "sucesso"
            : resultado.mensagem.includes("já")
              ? "duplicado"
              : "erro",
          mensagem: resultado.mensagem,
          codigoBarras: codigo,
          timestamp: Date.now(),
        };

        setFeedback(novoFeedback);

        // Limpar feedback após 3s
        if (feedbackTimeoutRef.current) {
          clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
          setFeedback(null);
        }, 3000);
      } catch (error) {
        Logger.error("[VOLUMES] Erro ao processar código:", error);
      } finally {
        setIsProcessando(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [isProcessando, biparVolumeEntrega, ordemId]
  );

  const {
    valorAtual,
    handleInputChange,
    handleSubmitManual,
  } = useScannerInput({
    onCodigoCompleto: handleCodigoScaneado,
    tamanhoMinimo: 3,
    timeoutMs: 500,
  });

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Auto-focus
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================

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
          onPress: async (observacao) => {
            if (observacao && observacao.trim()) {
              const sucesso = await marcarExtraviado(volume.id, observacao.trim());
              if (sucesso) {
                Vibration.vibrate([0, 100, 50, 100]);
              }
            } else {
              Alert.alert("Atenção", "A observação é obrigatória para marcar como extraviado.");
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleVerFaltantes = () => {
    router.push(`/(app)/faltantes/${ordemId}`);
  };

  const handleFinalizarOrdem = async () => {
    Alert.alert(
      "Finalizar Ordem",
      `${contagem.entregues} entregues, ${contagem.extraviados} extraviados. Confirma?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          onPress: async () => {
            const sucesso = await finalizarOrdem(ordemId);
            if (sucesso) {
              router.back();
            } else {
              Alert.alert("Erro", "Não foi possível finalizar a ordem. Verifique se todos os volumes foram resolvidos.");
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // HELPERS
  // ============================================================

  const getStatusStyle = (status: Volume["status"]) => {
    switch (status) {
      case "entregue":
        return { bg: "#dcfce7", text: Colors.success, label: "Entregue" };
      case "extraviado":
        return { bg: "#fef2f2", text: Colors.danger, label: "Extraviado" };
      default:
        return { bg: "#fef3c7", text: Colors.warning, label: "Pendente" };
    }
  };

  // ============================================================
  // RENDER: FEEDBACK BAR
  // ============================================================

  const renderFeedback = () => {
    if (!feedback) return null;

    const bgColor =
      feedback.tipo === "sucesso"
        ? Colors.success
        : feedback.tipo === "duplicado"
          ? Colors.warning
          : Colors.danger;

    const icon =
      feedback.tipo === "sucesso" ? "OK" : feedback.tipo === "duplicado" ? "!!" : "X";

    return (
      <View style={[styles.feedbackBar, { backgroundColor: bgColor }]}>
        <Text style={styles.feedbackIcon}>{icon}</Text>
        <View style={styles.feedbackTextArea}>
          <Text style={styles.feedbackMensagem}>{feedback.mensagem}</Text>
          <Text style={styles.feedbackCodigo}>{feedback.codigoBarras}</Text>
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER: VOLUME ITEM
  // ============================================================

  const renderVolume = ({ item: volume }: { item: Volume }) => {
    const statusInfo = getStatusStyle(volume.status);
    const isUltimoBipado =
      feedback?.tipo === "sucesso" && feedback.codigoBarras === volume.codigo_barras;

    return (
      <View
        style={[
          styles.volumeCard,
          { borderLeftColor: statusInfo.text },
          isUltimoBipado && styles.volumeCardDestaque,
        ]}
      >
        <View style={styles.volumeContent}>
          <Text style={styles.volumeBarras}>{volume.codigo_barras}</Text>
          <Text style={styles.volumeDescricao} numberOfLines={1}>
            {volume.descricao}
          </Text>
          {volume.observacao && (
            <Text style={styles.volumeObs}>Obs: {volume.observacao}</Text>
          )}
        </View>

        <View style={styles.volumeRight}>
          <View
            style={[styles.volumeStatusBadge, { backgroundColor: statusInfo.bg }]}
          >
            <Text style={[styles.volumeStatusText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>

          {volume.status === "pendente" && (
            <TouchableOpacity
              style={styles.extraviadoButton}
              onPress={() => handleExtraviado(volume)}
            >
              <Text style={styles.extraviadoButtonText}>Extraviado</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleVoltar} style={styles.backButton}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Volumes da Ordem</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Contadores */}
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, { backgroundColor: "#dcfce7" }]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>
            {contagem.entregues}
          </Text>
          <Text style={styles.statLabel}>Entregues</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: "#fef3c7" }]}>
          <Text style={[styles.statNum, { color: Colors.warning }]}>
            {contagem.pendentes}
          </Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: "#fef2f2" }]}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>
            {contagem.extraviados}
          </Text>
          <Text style={styles.statLabel}>Extraviados</Text>
        </View>
        <View style={[styles.statBadge, { backgroundColor: "#e0f2fe" }]}>
          <Text style={[styles.statNum, { color: Colors.text }]}>
            {contagem.percentual}%
          </Text>
          <Text style={styles.statLabel}>Progresso</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${contagem.percentual}%`,
                backgroundColor:
                  contagem.percentual === 100 ? Colors.success : Colors.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Scanner */}
      {!todosResolvidos && (
        <View style={styles.scannerContainer}>
          <TextInput
            ref={inputRef}
            style={[
              styles.scannerInput,
              isProcessando && styles.scannerInputProcessando,
            ]}
            value={valorAtual}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmitManual}
            placeholder="Bipe ou digite o código de barras..."
            placeholderTextColor={Colors.gray[400]}
            autoFocus
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isProcessando}
            selectTextOnFocus
          />
        </View>
      )}

      {/* Feedback */}
      {feedback && (
        <View style={styles.feedbackContainer}>{renderFeedback()}</View>
      )}

      {/* Link faltantes */}
      {faltantes.length > 0 && (
        <TouchableOpacity style={styles.faltantesLink} onPress={handleVerFaltantes}>
          <Text style={styles.faltantesLinkText}>
            Ver {faltantes.length} volume
            {faltantes.length !== 1 ? "s" : ""} faltante
            {faltantes.length !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      )}

      {/* Lista de volumes */}
      <FlatList
        data={volumesOrdem}
        renderItem={renderVolume}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      />

      {/* Botão Finalizar */}
      {todosResolvidos && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.finalizarButton}
            onPress={handleFinalizarOrdem}
          >
            <Text style={styles.finalizarButtonText}>
              Finalizar Ordem ({contagem.entregues} entregues
              {contagem.extraviados > 0
                ? `, ${contagem.extraviados} extraviados`
                : ""}
              )
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

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

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  statBadge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  statNum: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Scanner
  scannerContainer: {
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  scannerInput: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  scannerInputProcessando: {
    borderColor: Colors.warning,
    backgroundColor: "#fffbeb",
  },

  // Feedback
  feedbackContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.surface,
  },
  feedbackBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  feedbackIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.textInverse,
    width: 28,
    textAlign: "center",
  },
  feedbackTextArea: {
    flex: 1,
  },
  feedbackMensagem: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textInverse,
  },
  feedbackCodigo: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
  },

  // Faltantes link
  faltantesLink: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff7ed",
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  faltantesLinkText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: "600",
    textAlign: "center",
  },

  // Volume list
  listContent: {
    padding: 12,
  },
  volumeCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    alignItems: "center",
  },
  volumeCardDestaque: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: Colors.success,
  },
  volumeContent: {
    flex: 1,
  },
  volumeBarras: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    fontFamily: "monospace",
  },
  volumeDescricao: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  volumeObs: {
    fontSize: 11,
    color: Colors.danger,
    fontStyle: "italic",
    marginTop: 2,
  },
  volumeRight: {
    alignItems: "flex-end",
    gap: 6,
    marginLeft: 8,
  },
  volumeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  volumeStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  extraviadoButton: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  extraviadoButtonText: {
    color: Colors.textInverse,
    fontSize: 10,
    fontWeight: "600",
  },

  // Footer
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    backgroundColor: Colors.surface,
  },
  finalizarButton: {
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  finalizarButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },
});
