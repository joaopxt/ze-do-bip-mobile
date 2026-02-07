/**
 * Tela Ordem de Carga - Zé da Entrega
 * Bipagem de volumes no galpão antes de sair para rota
 *
 * FLUXO:
 * 1. Sem rota → botão SYNC DOWN
 * 2. Rota carregada, carga aguardando → botão INICIAR CARGA
 * 3. Carga em andamento → scanner ativo, lista de volumes
 * 4. Todos bipados → botão FINALIZAR CARGA
 * 5. Carga finalizada → botão IR PARA CLIENTES
 */

import { Colors } from "@/constants/Colors";
import { useEntrega } from "@/contexts";
import { useAuth } from "@/contexts";
import { useScannerInput } from "@/hooks/useScannerInput";
import { CargaVolume } from "@/types/entrega";
import { Logger } from "@/utils/logger";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
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

export default function CargaScreen() {
  const { usuario, logout } = useAuth();
  const {
    fase,
    rota,
    carga,
    clientes,
    isSyncing,
    getContagemCarga,
    getVolumesCarga,
    executarSyncDown,
    executarSyncUp,
    iniciarCarga,
    biparVolumeCarga,
    finalizarCarga,
    limparEstado,
  } = useEntrega();
  const router = useRouter();

  // Estado local
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [isProcessando, setIsProcessando] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dados computados
  const contagem = getContagemCarga();
  const volumesCarga = getVolumesCarga();
  const cargaAtiva = carga?.status === "em_andamento";
  const cargaFinalizada = carga?.status === "finalizada";
  const todosbipadosBipados = contagem.total > 0 && contagem.pendentes === 0;
  const todosClientesFinalizados =
    clientes.length > 0 && clientes.every((c) => c.status === "finalizado");
  const rotaConcluida = fase === "CONCLUIDA";

  // ============================================================
  // SCANNER HOOK
  // ============================================================

  const handleCodigoScaneado = useCallback(
    async (codigo: string) => {
      if (!cargaAtiva || isProcessando) return;

      setIsProcessando(true);
      Logger.debug(`[CARGA] Código escaneado: ${codigo}`);

      try {
        const resultado = await biparVolumeCarga(codigo);

        // Vibração: curta = sucesso, longa = erro
        if (resultado.sucesso) {
          Vibration.vibrate(100);
        } else {
          Vibration.vibrate([0, 200, 100, 200]);
        }

        const novoFeedback: ScanFeedback = {
          tipo: resultado.sucesso
            ? "sucesso"
            : resultado.mensagem.includes("já bipado")
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
        Logger.error("[CARGA] Erro ao processar código:", error);
      } finally {
        setIsProcessando(false);
        // Refocus no input
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [cargaAtiva, isProcessando, biparVolumeCarga]
  );

  const {
    valorAtual,
    handleInputChange,
    handleSubmitManual,
    resetar: resetarScanner,
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

  // Auto-focus no input quando carga inicia
  useEffect(() => {
    if (cargaAtiva) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [cargaAtiva]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSyncDown = async () => {
    Logger.debug("[CARGA] Iniciando SYNC DOWN...");
    const sucesso = await executarSyncDown();
    if (!sucesso) {
      Alert.alert("Erro", "Não foi possível carregar a rota. Verifique a conexão.");
    }
  };

  const handleIniciarCarga = async () => {
    Logger.debug("[CARGA] Iniciando carga...");
    const sucesso = await iniciarCarga();
    if (sucesso) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  };

  const handleFinalizarCarga = async () => {
    if (!todosbipadosBipados) {
      Alert.alert(
        "Volumes Pendentes",
        `Ainda há ${contagem.pendentes} volume(s) pendente(s). Bipe todos antes de finalizar.`
      );
      return;
    }

    Alert.alert(
      "Finalizar Carga",
      `Todos os ${contagem.total} volumes foram bipados. Confirma finalização?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "default",
          onPress: async () => {
            const sucesso = await finalizarCarga();
            if (!sucesso) {
              Alert.alert("Erro", "Não foi possível finalizar a carga.");
            }
          },
        },
      ]
    );
  };

  const handleIrParaClientes = () => {
    router.push("/(app)/clientes");
  };

  const handleSyncUp = async () => {
    Alert.alert(
      "Enviar Resultados",
      "Conecte ao WiFi do galpão. Todos os resultados da rota serão enviados ao servidor.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          onPress: async () => {
            Logger.debug("[CARGA] Iniciando SYNC UP...");
            const sucesso = await executarSyncUp();
            if (!sucesso) {
              Alert.alert(
                "Erro",
                "Não foi possível enviar os resultados. Verifique a conexão e tente novamente."
              );
            }
          },
        },
      ]
    );
  };

  const handleNovaRota = async () => {
    await limparEstado();
  };

  // ============================================================
  // RENDER: VOLUME ITEM
  // ============================================================

  const renderVolumeItem = ({ item }: { item: CargaVolume }) => {
    const isBipado = item.status === "bipado";
    const isUltimoBipado =
      feedback?.tipo === "sucesso" && feedback.codigoBarras === item.codigo_barras;

    return (
      <View
        style={[
          styles.volumeItem,
          isBipado && styles.volumeItemBipado,
          isUltimoBipado && styles.volumeItemDestaque,
        ]}
      >
        <View style={styles.volumeItemLeft}>
          <View
            style={[
              styles.volumeStatusDot,
              { backgroundColor: isBipado ? Colors.success : Colors.volumePendente },
            ]}
          />
          <View style={styles.volumeItemInfo}>
            <Text style={styles.volumeItemCodigo}>{item.codigo_barras}</Text>
            <Text style={styles.volumeItemDescricao}>{item.descricao}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.volumeItemStatus,
            { color: isBipado ? Colors.success : Colors.textSecondary },
          ]}
        >
          {isBipado ? "BIPADO" : "PENDENTE"}
        </Text>
      </View>
    );
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
  // RENDER: PROGRESS BAR
  // ============================================================

  const renderProgressBar = () => {
    if (contagem.total === 0) return null;

    return (
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
        <Text style={styles.progressText}>{contagem.percentual}%</Text>
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Zé da Entrega</Text>
          <Text style={styles.headerSubtitle}>
            {usuario?.nome || usuario?.cd_usuario || "Motorista"}
            {rota?.placa_veiculo ? ` • ${rota.placa_veiculo}` : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* ESTADO 1: Sem rota — botão SYNC DOWN */}
      {!rota && !isSyncing && (
        <View style={styles.centeredContainer}>
          <Text style={styles.emptyTitle}>Nenhuma rota carregada</Text>
          <Text style={styles.emptySubtitle}>
            Conecte ao WiFi do galpão e carregue sua rota
          </Text>
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncDown}>
            <Text style={styles.syncButtonText}>Carregar Rota</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ESTADO: Syncing */}
      {isSyncing && (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.syncingText}>
            {fase === "SYNC_DOWN"
              ? "Carregando rota do servidor..."
              : "Enviando resultados..."}
          </Text>
        </View>
      )}

      {/* ESTADO 2-5: Rota carregada */}
      {rota && !isSyncing && (
        <ScrollView style={styles.mainContent} contentContainerStyle={styles.mainContentInner}>
          {/* Card Ordem de Carga */}
          <View style={styles.cargaCard}>
            <View style={styles.cargaCardHeader}>
              <Text style={styles.cargaCardTitle}>Ordem de Carga</Text>
              <View
                style={[
                  styles.cargaStatusBadge,
                  {
                    backgroundColor: cargaFinalizada
                      ? Colors.success
                      : cargaAtiva
                        ? Colors.secondary
                        : Colors.gray[400],
                  },
                ]}
              >
                <Text style={styles.cargaStatusText}>
                  {cargaFinalizada
                    ? "Finalizada"
                    : cargaAtiva
                      ? "Em Andamento"
                      : "Aguardando"}
                </Text>
              </View>
            </View>

            {/* Contadores */}
            <View style={styles.statsRow}>
              <View style={[styles.statBadge, styles.statBipados]}>
                <Text style={styles.statNumber}>{contagem.bipados}</Text>
                <Text style={styles.statLabel}>Bipados</Text>
              </View>
              <View style={[styles.statBadge, styles.statPendentes]}>
                <Text style={styles.statNumber}>{contagem.pendentes}</Text>
                <Text style={styles.statLabel}>Pendentes</Text>
              </View>
              <View style={[styles.statBadge, styles.statTotal]}>
                <Text style={styles.statNumber}>{contagem.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            {/* Progress Bar */}
            {renderProgressBar()}

            {/* SCANNER — só aparece com carga em andamento */}
            {cargaAtiva && (
              <View style={styles.scannerSection}>
                <Text style={styles.scannerLabel}>Scanner de Volumes</Text>
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

            {/* Feedback do último scan */}
            {renderFeedback()}

            {/* BOTÃO: Iniciar Carga (quando aguardando) */}
            {carga?.status === "aguardando" && (
              <TouchableOpacity
                style={styles.iniciarCargaButton}
                onPress={handleIniciarCarga}
              >
                <Text style={styles.iniciarCargaText}>Iniciar Bipagem da Carga</Text>
              </TouchableOpacity>
            )}

            {/* BOTÃO: Finalizar Carga (quando todos bipados) */}
            {cargaAtiva && todosbipadosBipados && (
              <TouchableOpacity
                style={styles.finalizarCargaButton}
                onPress={handleFinalizarCarga}
              >
                <Text style={styles.finalizarCargaText}>
                  Finalizar Carga ({contagem.total} volumes)
                </Text>
              </TouchableOpacity>
            )}

            {/* Aviso se carga em andamento mas não finalizada */}
            {cargaAtiva && !todosbipadosBipados && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Bipe todos os volumes para finalizar a carga e liberar as entregas
                </Text>
              </View>
            )}
          </View>

          {/* BOTÃO: Ir para Clientes (carga finalizada) */}
          {(cargaFinalizada || fase === "ROTA") && (
            <TouchableOpacity
              style={styles.clientesButton}
              onPress={handleIrParaClientes}
            >
              <Text style={styles.clientesButtonText}>
                Ver Lista de Clientes ({contagem.total} volumes carregados)
              </Text>
            </TouchableOpacity>
          )}

          {/* Lista de Volumes */}
          {(cargaAtiva || cargaFinalizada) && volumesCarga.length > 0 && (
            <View style={styles.volumesSection}>
              <Text style={styles.volumesSectionTitle}>
                Volumes ({contagem.bipados}/{contagem.total})
              </Text>
              <FlatList
                data={volumesCarga}
                renderItem={renderVolumeItem}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* SYNC UP — quando todos clientes finalizados */}
          {fase === "ROTA" && todosClientesFinalizados && (
            <View style={styles.syncUpCard}>
              <Text style={styles.syncUpTitle}>Rota Finalizada!</Text>
              <Text style={styles.syncUpSubtitle}>
                {clientes.length} clientes atendidos. Conecte ao WiFi do galpão
                para enviar os resultados.
              </Text>
              <TouchableOpacity
                style={styles.syncUpButton}
                onPress={handleSyncUp}
              >
                <Text style={styles.syncUpButtonText}>
                  Enviar Resultados ao Servidor
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dev nav */}
          {__DEV__ && !cargaFinalizada && fase !== "ROTA" && (
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleIrParaClientes}
            >
              <Text style={styles.devButtonText}>[DEV] Ir para Clientes</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ESTADO FINAL: Rota Concluída */}
      {rotaConcluida && !isSyncing && (
        <View style={styles.centeredContainer}>
          <Text style={styles.concluidaIcon}>OK</Text>
          <Text style={styles.concluidaTitle}>Rota Concluída!</Text>
          <Text style={styles.concluidaSubtitle}>
            Todos os resultados foram enviados com sucesso ao servidor.
          </Text>
          <View style={styles.concluidaStats}>
            <Text style={styles.concluidaStatText}>
              {clientes.length} clientes atendidos
            </Text>
            <Text style={styles.concluidaStatText}>
              {contagem.total} volumes processados
            </Text>
          </View>
          <TouchableOpacity
            style={styles.novaRotaButton}
            onPress={handleNovaRota}
          >
            <Text style={styles.novaRotaButtonText}>Iniciar Nova Rota</Text>
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.textInverse,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textInverse,
    opacity: 0.85,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  logoutText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty / Sync Down
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  syncButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "bold",
  },
  syncingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 16,
  },

  // Main content
  mainContent: {
    flex: 1,
  },
  mainContentInner: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  // Carga Card
  cargaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.secondary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cargaCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cargaCardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.secondary,
  },
  cargaStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cargaStatusText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "600",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBadge: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 8,
  },
  statBipados: {
    backgroundColor: "#dcfce7",
  },
  statPendentes: {
    backgroundColor: "#fef3c7",
  },
  statTotal: {
    backgroundColor: "#e0f2fe",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Progress bar
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.text,
    minWidth: 36,
    textAlign: "right",
  },

  // Scanner
  scannerSection: {
    marginBottom: 12,
  },
  scannerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  scannerInput: {
    backgroundColor: Colors.gray[50],
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500",
  },
  scannerInputProcessando: {
    borderColor: Colors.warning,
    backgroundColor: "#fffbeb",
  },

  // Feedback bar
  feedbackBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
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

  // Botões de ação
  iniciarCargaButton: {
    backgroundColor: Colors.success,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  iniciarCargaText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },
  finalizarCargaButton: {
    backgroundColor: Colors.info,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  finalizarCargaText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },

  // Warning box
  warningBox: {
    backgroundColor: "#fff7ed",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: Colors.gray[700],
  },

  // Botão Clientes
  clientesButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  clientesButtonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: "bold",
  },

  // Volumes list
  volumesSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  volumesSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  volumeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.gray[50],
    borderRadius: 6,
  },
  volumeItemBipado: {
    backgroundColor: "#f0fdf4",
  },
  volumeItemDestaque: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: Colors.success,
  },
  volumeItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  volumeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  volumeItemInfo: {
    flex: 1,
  },
  volumeItemCodigo: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  volumeItemDescricao: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  volumeItemStatus: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },

  // Dev
  devButton: {
    backgroundColor: Colors.gray[200],
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  devButtonText: {
    color: Colors.gray[600],
    fontSize: 13,
  },

  // SYNC UP Card
  syncUpCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: "center",
  },
  syncUpTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.success,
    marginBottom: 8,
  },
  syncUpSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  syncUpButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  syncUpButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "bold",
  },

  // Rota Concluída
  concluidaIcon: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.success,
    backgroundColor: "#dcfce7",
    width: 64,
    height: 64,
    borderRadius: 32,
    textAlign: "center",
    lineHeight: 64,
    marginBottom: 16,
    overflow: "hidden",
  },
  concluidaTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.success,
    marginBottom: 8,
  },
  concluidaSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  concluidaStats: {
    backgroundColor: Colors.gray[50],
    borderRadius: 10,
    padding: 16,
    width: "100%",
    gap: 6,
    marginBottom: 24,
  },
  concluidaStatText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
    fontWeight: "500",
  },
  novaRotaButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  novaRotaButtonText: {
    color: Colors.textInverse,
    fontSize: 17,
    fontWeight: "bold",
  },
});
