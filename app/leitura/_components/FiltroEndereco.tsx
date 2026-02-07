/**
 * FiltroEndereco - Card mostrando filtro ativo por endereço
 */

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FiltroEnderecoProps {
  endereco: string;
  quantidadeProdutos: number;
  onLimpar: () => void;
}

export const FiltroEndereco = React.memo<FiltroEnderecoProps>(({
  endereco,
  quantidadeProdutos,
  onLimpar
}) => {
  return (
    <View style={styles.filtroCard}>
      <View style={styles.filtroHeader}>
        <Ionicons name="location-outline" size={16} color={Colors.primary} />
        <Text style={styles.filtroTitle}>Filtrando por Endereço</Text>
      </View>
      <Text style={styles.filtroEndereco}>{endereco}</Text>
      <Text style={styles.filtroProdutos}>
        {quantidadeProdutos} produto(s) disponível(is)
      </Text>
      <Button
        title="Limpar Filtro"
        variant="outline"
        onPress={onLimpar}
        style={styles.limparFiltroButton}
      />
    </View>
  );
});

FiltroEndereco.displayName = 'FiltroEndereco';

const styles = StyleSheet.create({
  filtroCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  filtroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filtroTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e40af',
  },
  filtroEndereco: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  filtroProdutos: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  limparFiltroButton: {
    alignSelf: 'flex-start',
  },
});

