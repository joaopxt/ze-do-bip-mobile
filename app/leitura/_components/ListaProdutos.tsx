/**
 * ListaProdutos - Lista scrollável de produtos
 */

import { Card } from '@/components/ui/Card';
import { Produto } from '@/types/siac';
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { temProblemas } from '../_utils/produtoValidation';
import { ItemProduto } from './ItemProduto';

interface ListaProdutosProps {
  produtos: Produto[];
  enderecoFiltro: string | null;
  totalProdutos: number;
}

export const ListaProdutos = React.memo<ListaProdutosProps>(({
  produtos,
  enderecoFiltro,
  totalProdutos
}) => {
  const titulo = enderecoFiltro 
    ? `Produtos do Endereço ${enderecoFiltro} (${produtos.length})`
    : `Itens da Ordem (${totalProdutos})`;

  return (
    <Card style={styles.itemsCard}>
      <Text style={styles.itemsTitle}>{titulo}</Text>
      <ScrollView style={styles.itemsList} showsVerticalScrollIndicator={true}>
        {produtos.map(produto => {
          const problemas = temProblemas(produto);
          return (
            <ItemProduto
              key={produto.id}
              produto={produto}
              problemas={problemas}
            />
          );
        })}
      </ScrollView>
    </Card>
  );
});

ListaProdutos.displayName = 'ListaProdutos';

const styles = StyleSheet.create({
  itemsCard: {
    flex: 1,
    marginBottom: 16,
    padding: 8
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  itemsList: {
    flex: 1,
    gap: 12,
  },
});

