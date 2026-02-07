/**
 * Tela de Leitura de Produtos - Zé do Bip
 * Rota dinâmica: /leitura/[guardaId]
 */

import { LeituraInterface } from '@/components/LeituraInterface';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

export default function LeituraScreen() {
  const { guardaId } = useLocalSearchParams<{ guardaId: string }>();
  const router = useRouter();

  const handleVoltar = () => {
    router.back(); // Usa navegação do Expo Router
  };

  if (!guardaId) {
    return null; // ou uma tela de erro
  }

  return (
    <LeituraInterface 
      ordemId={guardaId} 
      onVoltar={handleVoltar}
    />
  );
}
