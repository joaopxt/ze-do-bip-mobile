/**
 * GuardaHeader - Header com informações da guarda e progresso
 */

import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/Colors';
import { Guarda } from '@/types/siac';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface GuardaHeaderProps {
  guarda: Guarda;
  produtosConcluidos: number;
  totalProdutos: number;
  progresso: number;
}

export const GuardaHeader = React.memo<GuardaHeaderProps>(({
  guarda,
  produtosConcluidos,
  totalProdutos,
  progresso
}) => {
  return (
    <Card>
      <View style={styles.headerContent}>
        <View style={styles.guardaInfo}>
          <Text style={styles.guardaNumero}>Nota {guarda.numero}</Text>
          <Text style={styles.guardaFornecedor}>{guarda.fornecedor}</Text>
        </View>
        
        <View style={styles.progressInfo}>
          <Text style={styles.progressLabel}>Progresso</Text>
          <Text style={styles.progressText}>{produtosConcluidos}/{totalProdutos}</Text>
        </View>
      </View>
      
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progresso}%`, backgroundColor: Colors.success }
            ]} 
          />
        </View>
      </View>
    </Card>
  );
});

GuardaHeader.displayName = 'GuardaHeader';

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 20,
    paddingHorizontal: 8,
  },
  guardaInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  guardaNumero: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  guardaFornecedor: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  progressInfo: {
    alignItems: 'center',
    minWidth: 60,
  },
  progressLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});

