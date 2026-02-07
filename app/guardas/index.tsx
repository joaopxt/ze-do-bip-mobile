/**
 * Tela de Guardas Dashboard - Zé do Bip
 * Lista de guardas disponíveis e assumidas
 * Anteriormente em home.tsx
 * 
 * Requer permissão: guarda
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Colors } from "@/constants/Colors";
import { useAuth, useGuardas } from "@/contexts";
import { useToast } from "@/contexts/ToastContext";
import { Guarda } from "@/types/siac";
import { Logger } from "@/utils/logger";
import { podeAcessarGuardas } from "@/utils/permissoes";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GuardasScreen() {
  const router = useRouter();

  // Estado local para controle de assumir guarda
  const [assumindoGuarda, setAssumindoGuarda] = useState(false);

  // Autenticação via Context
  const { usuario, isLoggedIn, logout } = useAuth();
  const { showToast } = useToast();
  
  // Verificar permissão de acesso
  const temPermissao = podeAcessarGuardas(usuario);

  // Guardas via Context (migrado do Zustand)
  const {
    guardas: { disponiveis, emAndamento, finalizadas },
    isLoading,
    isRefreshing,
    refreshGuardas,
    iniciarGuarda,
  } = useGuardas();

  // Observar logout e redirecionar para login
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  // Função para atualizar guardas (pull-to-refresh)
  const handleRefresh = async () => {
    try {
      await refreshGuardas();
    } catch (error) {
      Logger.error("GUARDAS", "Erro ao atualizar guardas:", error);
    }
  };

  // Atualização automática a cada 30 minutos
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isLoading && !isRefreshing) {
        await refreshGuardas();
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoading, isRefreshing, refreshGuardas]);

  // Função para assumir guarda
  const handleAssumirGuarda = async (guarda: Guarda) => {
    Alert.alert(
      "Confirmar Ação",
      `Deseja assumir a guarda ${guarda.numero || guarda.id}?\n\nFornecedor: ${
        guarda.fornecedor || "Fornecedor não informado"
      }\nSKUs: ${guarda.quantidadeItens}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Assumir",
          onPress: async () => {
            setAssumindoGuarda(true);
            try {
              const sucesso = await iniciarGuarda(guarda.id);
              if (!sucesso) {
                showToast("Não foi possível assumir a guarda", "error");
              }
            } finally {
              setAssumindoGuarda(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Confirmar Logout", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: logout },
    ]);
  };

  // Filtrar guardas finalizadas hoje
  const getGuardasConcluidasHoje = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return finalizadas
      .filter((guarda) => {
        if (!guarda.concluidaEm) return false;
        const dataFinalizacao = new Date(guarda.concluidaEm);
        dataFinalizacao.setHours(0, 0, 0, 0);
        return dataFinalizacao.getTime() === hoje.getTime();
      })
      .sort((a, b) => {
        if (!a.concluidaEm || !b.concluidaEm) return 0;
        return (
          new Date(b.concluidaEm).getTime() - new Date(a.concluidaEm).getTime()
        );
      });
  };

  const guardasConcluidasHoje = getGuardasConcluidasHoje();

  // Tela de acesso negado
  if (!temPermissao) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
          <Text style={styles.unauthorizedTitle}>Acesso Negado</Text>
          <Text style={styles.unauthorizedText}>
            Você não tem permissão para acessar o módulo de Guardas.
          </Text>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Guardas - Dashboard</Text>
              <Text style={styles.profileText}>Olá, {usuario?.nome}</Text>
            </View>
            <View style={styles.headerButtons}>
              <Button
                title="Voltar"
                onPress={() => router.back()}
                variant="outline"
                size="sm"
                style={styles.logoutButton}
              />
            </View>
          </View>

          {/* Indicador de carregamento */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Carregando guardas...</Text>
            </View>
          )}

          {/* Guardas Ativas (em andamento) */}
          {emAndamento.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Guardas Ativas</Text>
              {emAndamento.map((guarda) => (
                <GuardaAtivaCard key={guarda.id} guarda={guarda} />
              ))}
            </View>
          )}

          {/* Guardas Disponíveis */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardas Disponíveis</Text>
            {disponiveis.length === 0 ? (
              <Text style={styles.emptyText}>
                {isLoading ? "Carregando..." : "Nenhuma guarda disponível"}
              </Text>
            ) : (
              disponiveis.map((guarda) => (
                <Card key={guarda.id} style={styles.guardaCard}>
                  <CardHeader>
                    <View style={styles.guardaHeader}>
                      <View
                        style={[
                          styles.tipoIndicator,
                          { backgroundColor: Colors.primary },
                        ]}
                      />
                      <View style={styles.guardaInfo}>
                        <CardTitle style={styles.guardaNumero}>
                          {guarda.numero || `Guarda ${guarda.id}`}
                        </CardTitle>
                        <Text style={styles.guardaFornecedor}>
                          {guarda.fornecedor || "Fornecedor não informado"}
                        </Text>
                      </View>
                      <Badge variant="outline">GI</Badge>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.guardaDetalhes}>
                      {guarda.quantidadeItens} SKUs • {guarda.dataEntrada}
                    </Text>
                    <Button
                      title={
                        assumindoGuarda ? "Assumindo..." : "Assumir Guarda"
                      }
                      onPress={() => handleAssumirGuarda(guarda)}
                      disabled={assumindoGuarda}
                      style={styles.assumirButton}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </View>

          {/* Guardas Concluídas Hoje */}
          {guardasConcluidasHoje.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Concluídas Hoje</Text>
              {guardasConcluidasHoje.map((guarda) => (
                <Card
                  key={guarda.id}
                  style={{ ...styles.guardaCard, ...styles.guardaConcluida }}
                >
                  <CardHeader>
                    <View style={styles.guardaHeader}>
                      <View
                        style={{
                          ...styles.tipoIndicator,
                          backgroundColor: Colors.success,
                        }}
                      />
                      <View style={styles.guardaInfo}>
                        <CardTitle style={styles.guardaNumero}>
                          {guarda.numero || `Guarda ${guarda.id}`}
                        </CardTitle>
                        <Text style={styles.guardaFornecedor}>
                          {guarda.fornecedor || "Fornecedor não informado"}
                        </Text>
                      </View>
                      <Badge variant="default" style={styles.badgeConcluida}>
                        CONCLUÍDA
                      </Badge>
                    </View>
                  </CardHeader>
                  <CardContent>
                    <Text style={styles.guardaDetalhes}>
                      {guarda.quantidadeItens} SKUs • Finalizada às{" "}
                      {guarda.concluidaEm
                        ? new Date(guarda.concluidaEm).toLocaleTimeString(
                            "pt-BR",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : ""}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente para Guarda Ativa
function GuardaAtivaCard({ guarda }: { guarda: Guarda }) {
  const router = useRouter();
  const { obterContagemBipados, isRefreshing } = useGuardas();
  const [contagem, setContagem] = useState<{
    bipados: number;
    naoBipados: number;
    total: number;
    percentualBipado: number;
  } | null>(null);
  const [carregandoContagem, setCarregandoContagem] = useState(false);

  // Função para carregar contagem
  const carregarContagem = useCallback(async () => {
    setCarregandoContagem(true);
    try {
      const resultado = await obterContagemBipados(guarda.id);
      if (resultado) {
        setContagem(resultado);
        Logger.debug(
          `[HOME] Contagem carregada para guarda ${guarda.id}:`,
          resultado
        );
      }
    } catch (error) {
      Logger.error(
        `[HOME] Erro ao carregar contagem da guarda ${guarda.id}:`,
        error
      );
    } finally {
      setCarregandoContagem(false);
    }
  }, [guarda.id, obterContagemBipados]);

  // Carregar contagem quando componente montar ou guarda mudar
  useEffect(() => {
    carregarContagem();
  }, [carregarContagem]);

  // Recarregar contagem sempre que a tela for focada
  useFocusEffect(
    useCallback(() => {
      carregarContagem();
    }, [carregarContagem])
  );

  // Recarregar contagem quando houver refresh
  useEffect(() => {
    if (!isRefreshing) {
      // Recarregar após o refresh terminar
      carregarContagem();
    }
  }, [isRefreshing, carregarContagem]);

  // Usar contagem do backend se disponível, senão usar fallback local
  const totalProdutosReais = contagem
    ? contagem.total
    : guarda.produtos.length > 0
    ? guarda.produtos.length
    : guarda.quantidadeItens;
  const produtosConcluidos = contagem
    ? contagem.bipados
    : guarda.produtos.filter((p) => p.concluido || p.bipado).length;
  const progresso = contagem
    ? contagem.percentualBipado
    : totalProdutosReais > 0
    ? (produtosConcluidos / totalProdutosReais) * 100
    : 0;

  return (
    <Card style={{ ...styles.guardaCard, ...styles.guardaAtiva }}>
      <CardHeader>
        <View style={styles.guardaHeader}>
          <View
            style={{ ...styles.tipoIndicator, backgroundColor: Colors.primary }}
          />
          <View style={styles.guardaInfo}>
            <CardTitle style={styles.guardaNumero}>
              {guarda.numero || `Guarda ${guarda.id}`}
            </CardTitle>
            <Text style={styles.guardaFornecedor}>
              {guarda.fornecedor || "Fornecedor não informado"}
            </Text>
          </View>
          <Badge variant="default" style={styles.badgeAtiva}>
            ATIVA
          </Badge>
        </View>
      </CardHeader>
      <CardContent>
        <Text style={styles.guardaDetalhes}>
          {guarda.quantidadeItens} SKUs • {guarda.dataEntrada}
        </Text>

        {/* Data/Hora de início e progresso */}
        <View style={styles.tempoContainer}>
          <Text style={styles.tempoLabel}>
            Iniciada em:{" "}
            <Text style={styles.tempoValor}>
              {guarda.iniciadaEm
                ? new Date(guarda.iniciadaEm).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "N/A"}
            </Text>
          </Text>
          {carregandoContagem ? (
            <View style={styles.progressoCarregando}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.progressoLabel}>
                Atualizando progresso...
              </Text>
            </View>
          ) : (
            <Text style={styles.progressoLabel}>
              Progresso: {produtosConcluidos}/{totalProdutosReais} (
              {Math.round(progresso)}%)
            </Text>
          )}
        </View>

        <View style={styles.botoesGuarda}>
          <Button
            title="Escanear"
            onPress={() => router.push(`/leitura/${guarda.id}` as any)}
            style={{ ...styles.botaoGuarda, ...styles.botaoEscanear }}
          />
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  profileText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: "capitalize",
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  logoutButton: {
    minWidth: 60,
  },

  // Loading
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.textSecondary,
  },

  // Seções
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textSecondary,
    fontStyle: "italic",
    padding: 20,
  },

  // Cards de Guarda
  guardaCard: {
    marginBottom: 12,
    backgroundColor: Colors.cardBackground,
  },
  guardaAtiva: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  guardaConcluida: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
    opacity: 0.8,
  },
  guardaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipoIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  guardaInfo: {
    flex: 1,
  },
  guardaNumero: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  guardaFornecedor: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  guardaDetalhes: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },

  // Tempo e progresso
  tempoContainer: {
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  tempoLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  tempoValor: {
    fontWeight: "bold",
    color: Colors.primary,
  },
  progressoLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  progressoCarregando: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Botões da guarda
  botoesGuarda: {
    flexDirection: "row",
    gap: 8,
  },
  botaoGuarda: {
    flex: 1,
  },
  botaoEscanear: {
    backgroundColor: Colors.primary,
    flex: 1,
  },
  botaoFinalizar: {
    backgroundColor: Colors.success,
  },

  assumirButton: {
    marginTop: 8,
  },

  // Badges
  badgeAtiva: {
    backgroundColor: Colors.primary,
  },
  badgeConcluida: {
    backgroundColor: Colors.success,
  },
  
  // Acesso negado
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  unauthorizedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});
