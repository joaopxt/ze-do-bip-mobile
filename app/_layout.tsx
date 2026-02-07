/**
 * Layout Principal do App - Zé do Bip
 * Configuração do Stack Navigator (Expo Router) + Providers
 */

import { Colors } from "@/constants/Colors";
import { AuthProvider, GuardaProvider } from "@/contexts";
import { ToastProvider } from "@/contexts/ToastContext";
import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <AuthProvider>
      <GuardaProvider>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: Colors.background,
              },
              animation: "slide_from_right",
            }}
          >
            {/* Rota inicial - Redirect baseado em autenticação */}
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />

            {/* Tela de Login */}
            <Stack.Screen
              name="login"
              options={{
                title: "Login",
              }}
            />

            {/* Tela Home (Seleção de Módulo) */}
            <Stack.Screen
              name="home"
              options={{
                title: "Módulos",
                gestureEnabled: false,
              }}
            />

            {/* Módulo Guardas (Dashboard) */}
            <Stack.Screen
              name="guardas/index"
              options={{
                title: "Guardas Disponíveis",
                gestureEnabled: true,
              }}
            />

            {/* Módulo Endereçamento */}
            <Stack.Screen
              name="enderecamento/index"
              options={{
                title: "Endereçamento",
                gestureEnabled: true,
              }}
            />

            {/* Módulo Painel de Controle */}
            <Stack.Screen
              name="painel/index"
              options={{
                title: "Painel de Controle",
                gestureEnabled: true,
              }}
            />

            {/* Tela de Leitura */}
            <Stack.Screen
              name="leitura/[guardaId]"
              options={{
                title: "Leitura de Produtos",
                presentation: "card",
                gestureEnabled: true,
              }}
            />
          </Stack>
        </ToastProvider>
      </GuardaProvider>
    </AuthProvider>
  );
}
