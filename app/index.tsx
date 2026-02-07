/**
 * Tela Inicial - Redirect Logic
 * Redireciona para login ou home baseado no estado de autenticação
 */

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { Logger } from "@/utils/logger";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// Log imediato ao carregar o módulo
Logger.debug("[INDEX] Módulo carregado!");

export default function Index() {
  // Log imediato ao renderizar (FORA de useEffect)
  Logger.debug("[INDEX] Componente renderizando...");

  const { isLoggedIn, isLoading, usuario } = useAuth();
  const router = useRouter();

  // Log dos valores recebidos do context
  Logger.debug("[INDEX] Valores do useAuth:", {
    isLoading,
    isLoggedIn,
    usuario: usuario?.cd_usuario || null,
  });

  // Redirect programático quando o estado mudar
  useEffect(() => {
    Logger.debug("[INDEX] useEffect executando:", { isLoading, isLoggedIn });

    if (isLoading) {
      Logger.debug("[INDEX] Aguardando carregamento...");
      return;
    }

    if (isLoggedIn) {
      Logger.debug("[INDEX] >>> REDIRECIONANDO PARA /home <<<");
      router.replace("/home");
    } else {
      Logger.debug("[INDEX] >>> REDIRECIONANDO PARA /login <<<");
      router.replace("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  // Mostrar estado atual na tela (debug visual)
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={{ marginTop: 10, color: "#666" }}>
        {isLoading ? "Carregando..." : isLoggedIn ? "Logado!" : "Não logado"}
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
});
