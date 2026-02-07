/**
 * Tela Inicial - Redirect Logic
 * Redireciona para login ou carga baseado no estado de autenticação
 */

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { Logger } from "@/utils/logger";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

Logger.debug("[INDEX] Módulo carregado!");

export default function Index() {
  Logger.debug("[INDEX] Componente renderizando...");

  const { isLoggedIn, isLoading, usuario } = useAuth();
  const router = useRouter();

  Logger.debug("[INDEX] Valores do useAuth:", {
    isLoading,
    isLoggedIn,
    usuario: usuario?.cd_usuario || null,
  });

  useEffect(() => {
    Logger.debug("[INDEX] useEffect executando:", { isLoading, isLoggedIn });

    if (isLoading) {
      Logger.debug("[INDEX] Aguardando carregamento...");
      return;
    }

    if (isLoggedIn) {
      Logger.debug("[INDEX] >>> REDIRECIONANDO PARA /carga <<<");
      router.replace("/(app)/carga");
    } else {
      Logger.debug("[INDEX] >>> REDIRECIONANDO PARA /login <<<");
      router.replace("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>
        {isLoading ? "Carregando..." : isLoggedIn ? "Entrando..." : "Redirecionando..."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
