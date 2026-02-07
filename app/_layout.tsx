/**
 * Layout Principal do App - Zé da Entrega
 * Configuração do Stack Navigator (Expo Router) + Providers
 */

import { Colors } from "@/constants/Colors";
import { AuthProvider, EntregaProvider } from "@/contexts";
import { ToastProvider } from "@/contexts/ToastContext";
import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return (
    <AuthProvider>
      <EntregaProvider>
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

            {/* Grupo autenticado */}
            <Stack.Screen
              name="(app)"
              options={{
                gestureEnabled: false,
              }}
            />
          </Stack>
        </ToastProvider>
      </EntregaProvider>
    </AuthProvider>
  );
}
