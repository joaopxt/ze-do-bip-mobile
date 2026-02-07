/**
 * ScannerInput - Input principal para scanner de códigos
 */

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FiltroEndereco } from './FiltroEndereco';

interface ScannerInputProps {
  valorLido: string;
  enderecoFiltro: string | null;
  erro: string;
  finalizandoGuarda: boolean;
  disabled: boolean;
  quantidadeProdutosFiltrados: number;
  
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onLimparFiltro: () => void;
}

export const ScannerInput = React.memo<ScannerInputProps>(({
  valorLido,
  enderecoFiltro,
  erro,
  finalizandoGuarda,
  disabled,
  quantidadeProdutosFiltrados,
  onChangeText,
  onSubmit,
  onLimparFiltro
}) => {
  const inputLabel = enderecoFiltro 
    ? `Produto (Endereço: ${enderecoFiltro})` 
    : 'Produto ou QR Code do Endereço';

  const placeholder = enderecoFiltro 
    ? `Escaneie produto do endereço ${enderecoFiltro}` 
    : 'Escaneie produto ou QR Code do endereço';

  return (
    <Card style={styles.scanCard}>
      <View style={styles.scanHeader}>
        <Ionicons name="scan-outline" size={20} color={Colors.primary} />
        <Text style={styles.scanTitle}>Leitura de Itens</Text>
      </View>
      
      <View style={styles.scanContent}>
        <Text style={styles.inputLabel}>{inputLabel}</Text>
        
        <View style={styles.inputContainer}>
          <Input
            value={valorLido}
            onChangeText={onChangeText}
            placeholder={placeholder}
            containerStyle={styles.inputContainerStyle}
            style={styles.input}
            autoFocus
            editable={!disabled}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <Button 
            title="Confirmar"
            onPress={onSubmit}
            disabled={!valorLido.trim() || disabled}
          />
        </View>

        {/* Filtro por endereço */}
        {enderecoFiltro && (
          <FiltroEndereco
            endereco={enderecoFiltro}
            quantidadeProdutos={quantidadeProdutosFiltrados}
            onLimpar={onLimparFiltro}
          />
        )}

        {/* Mensagem de erro */}
        {erro && (
          <View style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{erro}</Text>
            </View>
          </View>
        )}

        {/* Status de finalização */}
        {finalizandoGuarda && (
          <View style={styles.finalizandoCard}>
            <View style={styles.finalizandoContent}>
              <Ionicons name="hourglass-outline" size={16} color={Colors.primary} />
              <Text style={styles.finalizandoText}>Finalizando guarda... Aguarde.</Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
});

ScannerInput.displayName = 'ScannerInput';

const styles = StyleSheet.create({
  scanCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginLeft: 8,
    marginTop: 6
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scanContent: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginLeft: 8,
    marginRight: 8,
    marginBottom: 8
  },
  inputContainerStyle: {
    flex: 1,
    minWidth: 0, // Permite que o flex funcione corretamente
  },
  input: {
    // Estilos do TextInput interno
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  finalizandoCard: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  finalizandoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  finalizandoText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

