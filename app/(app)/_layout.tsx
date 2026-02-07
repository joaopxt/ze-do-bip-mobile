/**
 * Layout do grupo autenticado - Zé da Entrega
 * Todas as telas dentro de (app) requerem autenticação
 */

import { Colors } from "@/constants/Colors";
import { Stack } from "expo-router";
import React from "react";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors.background,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="carga/index"
        options={{
          title: "Ordem de Carga",
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="clientes/index"
        options={{
          title: "Clientes da Rota",
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="cliente/[id]"
        options={{
          title: "Ordens do Cliente",
          gestureEnabled: true,
        }}
      />

      <Stack.Screen
        name="volumes/[ordemId]"
        options={{
          title: "Volumes",
          presentation: "card",
          gestureEnabled: true,
        }}
      />

      <Stack.Screen
        name="faltantes/[ordemId]"
        options={{
          title: "Volumes Faltantes",
          presentation: "card",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
