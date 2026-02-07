# Correção de Bugs - Produtos Não Finalizam (ATUALIZADO)

## Problema Identificado

Após análise profunda, foram identificados 4 bugs críticos que causam produtos não finalizarem:

1. **BUG CRÍTICO - SKUs Duplicados**: Produtos com mesmo cd_produto recebem o mesmo ID, causando conflito ao finalizar
2. **Race Condition**: useEffect sobrescreve estado local enquanto modal está aberto
3. **ID Não Único**: Uso de cd_produto ao invés do ID único da API
4. **Falta de Debug**: Sem ferramenta para visualizar AsyncStorage

## Nova Estrutura da API (21/11/2024)

A API agora retorna:
- `id`: ID único do produto na nota (ex: "3019180001", "3019180002")
- `id_endereco`: ID do endereço (ex: "6015", "5941", "NA")
- `cd_produto`: Código do produto (pode duplicar - ex: "053467" aparece 2x)

**Exemplo de SKUs duplicados na mesma nota:**
```json
{
  "cd_produto": "053467",
  "id": "3019180003",
  "quantidade": 4
},
{
  "cd_produto": "053467",
  "id": "3019180004",
  "quantidade": 2
}
```

## Correções Necessárias

### 1. Atualizar Interface Produto

**Arquivo:** `types/siac.ts` linha 121

**Problema Atual:**
```typescript
export interface Produto {
  id: string;                    // cd_produto
  idApi: string;                 // id da API
  ...
}
```

**Correção:**
```typescript
export interface Produto {
  id: string;                    // ID único da API (produto.id) - "3019180001"
  cdProduto: string;             // cd_produto (pode duplicar) - "053467"
  idEndereco: string;            // id_endereco da API - "6015" ou "NA"
  codigoFabrica: string;         // cd_fabrica
  codigoBarras: string;          // cod_barras
  descricao: string;             // no_produto
  endereco: string;              // endereco
  quantidade: number;            // quantidade
  quantidadeLida: number;        // controle interno
  concluido: boolean;            // controle interno
  dataLeitura?: string;          // timestamp da leitura
}
```

**Impacto:** Remove campo `idApi` (redundante) e adiciona campos corretos da nova API.

---

### 2. Corrigir Conversão de Produtos

**Arquivo:** `services/GuardaService.ts` linha 112-132

**Problema Atual:**
```typescript
function converterProdutosApiParaInternos(produtosApi: any[]): Produto[] {
  return produtosApi.map(produto => {
    return {
      id: produto.cd_produto,      // ← PROBLEMA: Duplica!
      idApi: produto.id,
      codigoFabrica: produto.cd_fabrica,
      codigoBarras: produto.cod_barras,
      descricao: produto.no_produto,
      endereco: produto.endereco,
      quantidade: produto.quantidade,
      quantidadeLida: 0,
      concluido: false,
    };
  });
}
```

**Correção:**
```typescript
function converterProdutosApiParaInternos(produtosApi: any[]): Produto[] {
  return produtosApi.map(produto => {
    Logger.debug('CONVERSAO Produto da API:', {
      id: produto.id,                    // ID único
      cd_produto: produto.cd_produto,    // Código (pode duplicar)
      id_endereco: produto.id_endereco,  // ID do endereço
      endereco: produto.endereco
    });
    
    return {
      id: produto.id,                    // ✅ ID único da API
      cdProduto: produto.cd_produto,     // ✅ Código do produto
      idEndereco: produto.id_endereco,   // ✅ ID do endereço
      codigoFabrica: produto.cd_fabrica,
      codigoBarras: produto.cod_barras,
      descricao: produto.no_produto,
      endereco: produto.endereco,
      quantidade: produto.quantidade,
      quantidadeLida: 0,
      concluido: false,
    };
  });
}
```

**Impacto:** Cada produto agora tem ID único garantido pela API, mesmo com cd_produto duplicado.

---

### 3. Atualizar Interface da API

**Arquivo:** `types/siac.ts` linha 24-32

**Adicionar campo id_endereco:**
```typescript
export interface ProdutoAPI {
  cd_fabrica: string;       // Código de fábrica
  cd_produto: string;       // Código do produto
  cod_barras: string;       // Código de barras
  endereco: string;         // Endereço de armazenagem
  no_produto: string;       // Nome/descrição do produto
  quantidade: number;       // Quantidade do produto
  id_endereco: string;      // ID do endereço (novo campo)
  id: string;               // ID único do produto na nota (novo campo)
}
```

---

### 4. Corrigir Race Condition no useEffect

**Arquivo:** `components/LeituraInterface.tsx` linhas 119-128

**Problema:** useEffect atualiza guarda enquanto modal está aberto, causando inconsistência.

**Solução:** Adicionar flag para bloquear atualização durante operação de finalização:

```typescript
// Adicionar novo estado (linha ~58)
const [processandoFinalizacao, setProcessandoFinalizacao] = useState(false);

// Atualizar useEffect (linha ~119)
useEffect(() => {
  // Não atualizar se estiver finalizando produto
  if (processandoFinalizacao) {
    Logger.debug('LEITURA Bloqueando atualização - finalizando produto');
    return;
  }
  
  const guardaAtualizada = guardasAssumidas.find(g => g.id === ordemId) || guardaAtiva;
  if (guardaAtualizada && guardaAtualizada.produtos.length > 0) {
    Logger.debug(`LEITURA Atualizando guarda ${ordemId}:`, {
      produtos: guardaAtualizada.produtos.length,
      produtosIds: guardaAtualizada.produtos.map(p => p.id)
    });
    setGuarda(guardaAtualizada);
  }
}, [guardasAssumidas, guardaAtiva, ordemId, processandoFinalizacao]);
```

**Atualizar confirmarEnderecoModal (linha ~308):**
```typescript
const confirmarEnderecoModal = (valorCorreto?: string) => {
  if (!produtoAtual || !guarda) return;

  const valorDigitado = valorCorreto || valorEnderecoInput.trim();
  Logger.debug('LEITURA Confirmando endereço modal - Valor:', valorDigitado, 'Endereço:', produtoAtual.endereco, 'ID Endereço:', produtoAtual.idEndereco);
  
  // Converter tudo para string e fazer comparação
  const valorStr = String(valorDigitado).trim();
  const enderecoStr = String(produtoAtual.endereco).trim();
  const idEnderecoStr = String(produtoAtual.idEndereco).trim();
  
  // Validar se é o endereço correto OU o ID do endereço
  const enderecoCorreto = valorStr === enderecoStr;
  const idEnderecoCorreto = valorStr === idEnderecoStr;
  
  Logger.debug('LEITURA Validação final:', {
    valorStr, enderecoStr, idEnderecoStr,
    enderecoCorreto, idEnderecoCorreto
  });
  
  if (enderecoCorreto || idEnderecoCorreto) {
    // BLOQUEAR useEffect antes de finalizar
    setProcessandoFinalizacao(true);
    
    const tipoIdentificacao = enderecoCorreto ? 'endereço' : 'ID endereço';
    Logger.debug(`LEITURA Finalizando produto com ${tipoIdentificacao}:`, produtoAtual.id, 'Quantidade:', quantidadeContada);
    
    marcarProdutoConcluido(guarda.id, produtoAtual.id, quantidadeContada);
    
    Alert.alert('Sucesso', `Produto ${produtoAtual.descricao} registrado com ${quantidadeContada} unidade(s)`);
    setEnderecoModal(false);
    setValorEnderecoInput('');
    
    // Aguardar próximo tick para garantir persistência
    setTimeout(() => {
      setProcessandoFinalizacao(false);  // Liberar useEffect
      resetarLeitura();
    }, 100);
  } else {
    Logger.debug('LEITURA Validação falhou - limpando input');
    setValorEnderecoInput('');
    setErro(`Código incorreto! Esperado: ${produtoAtual.endereco} ou ID: ${produtoAtual.idEndereco}`);
    setTimeout(() => setErro(''), 3000);
  }
};
```

**Atualizar fecharModalContador (linha ~274):**
```typescript
const fecharModalContador = () => {
  setContadorModal(false);
  setQuantidadeManual('');
  setValorModalInput('');
  
  if (tipoInicial === 'produto') {
    // Se iniciou por produto, precisa bipar endereço agora
    setEstadoLeitura('aguardando_endereco');
    setEnderecoModal(true);
  } else {
    // Se iniciou por endereço, produto está finalizado
    if (produtoAtual && guarda) {
      // BLOQUEAR useEffect antes de finalizar
      setProcessandoFinalizacao(true);
      
      Logger.debug('LEITURA Finalizando produto:', produtoAtual.id, 'Quantidade:', quantidadeContada);
      marcarProdutoConcluido(guarda.id, produtoAtual.id, quantidadeContada);
      
      // Aguardar próximo tick para garantir persistência
      setTimeout(() => {
        setProcessandoFinalizacao(false);  // Liberar useEffect
        resetarLeitura();
      }, 100);
    }
  }
};
```

---

### 5. Adicionar Logs Detalhados para Debug

**Arquivo:** `store/appStore.ts` função marcarProdutoConcluido (linha 575)

**Substituir função completa:**
```typescript
marcarProdutoConcluido: (guardaId: string, produtoId: string, quantidadeLida: number) => {
  Logger.store(`Marcando produto ${produtoId} como concluído (${quantidadeLida} unidades)`);
  Logger.store(`Guarda ID: ${guardaId}`);
  
  const estadoAntes = get();
  const guardaAlvo = estadoAntes.guardasAssumidas.find(g => g.id === guardaId);
  
  if (guardaAlvo) {
    Logger.store(`Produtos na guarda (${guardaAlvo.produtos.length} total):`, 
      guardaAlvo.produtos.map(p => ({
        id: p.id,
        cdProduto: p.cdProduto,
        descricao: p.descricao.substring(0, 30),
        concluido: p.concluido
      }))
    );
    
    const produtoAlvo = guardaAlvo.produtos.find(p => p.id === produtoId);
    if (produtoAlvo) {
      Logger.store(`Produto encontrado:`, {
        id: produtoAlvo.id,
        cdProduto: produtoAlvo.cdProduto,
        quantidadeAtual: produtoAlvo.quantidadeLida,
        quantidadeNova: quantidadeLida,
        quantidadeEsperada: produtoAlvo.quantidade,
        concluido: produtoAlvo.concluido
      });
    } else {
      Logger.error('STORE', `PRODUTO NÃO ENCONTRADO!`);
      Logger.error('STORE', `ID buscado: ${produtoId}`);
      Logger.error('STORE', `IDs disponíveis:`, guardaAlvo.produtos.map(p => p.id));
    }
  } else {
    Logger.error('STORE', `GUARDA NÃO ENCONTRADA! ID: ${guardaId}`);
  }
  
  Logger.store(`Estado antes - Guardas assumidas: ${estadoAntes.guardasAssumidas.length}, Guarda ativa: ${estadoAntes.guardaAtiva?.id}`);
  
  set(state => {
    let produtoAtualizado = false;
    
    const novasGuardasAssumidas = state.guardasAssumidas.map(guarda => {
      if (guarda.id === guardaId) {
        Logger.store(`Encontrou guarda ${guardaId} em guardasAssumidas`);
        return {
          ...guarda,
          produtos: guarda.produtos.map(produto => {
            if (produto.id === produtoId) {
              Logger.store(`Encontrou produto ${produtoId} - atualizando de ${produto.quantidadeLida} para ${quantidadeLida}`);
              produtoAtualizado = true;
              return {
                ...produto,
                quantidadeLida,
                concluido: quantidadeLida >= produto.quantidade,
                dataLeitura: new Date().toISOString()
              };
            }
            return produto;
          }),
        };
      }
      return guarda;
    });
    
    const novaGuardaAtiva = state.guardaAtiva?.id === guardaId 
      ? {
          ...state.guardaAtiva,
          produtos: state.guardaAtiva.produtos.map(produto => {
            if (produto.id === produtoId) {
              Logger.store(`Atualizando produto ${produtoId} na guarda ativa`);
              return {
                ...produto,
                quantidadeLida,
                concluido: quantidadeLida >= produto.quantidade,
                dataLeitura: new Date().toISOString()
              };
            }
            return produto;
          }),
        }
      : state.guardaAtiva;
    
    if (!produtoAtualizado) {
      Logger.error('STORE', `FALHA CRÍTICA: Produto ${produtoId} não foi atualizado!`);
    } else {
      Logger.store(`Produto ${produtoId} marcado como concluído com sucesso!`);
    }
    
    return {
      guardasAssumidas: novasGuardasAssumidas,
      guardaAtiva: novaGuardaAtiva,
    };
  });
},
```

---

### 6. Criar Ferramenta de Debug do Storage

**Arquivo:** `app/home.tsx` (adicionar no painel de configurações, após linha ~236)

**Adicionar import no topo:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

**Adicionar botões no painel de debug (dentro do bloco environmentInfo.debugEnabled):**
```typescript
<Button
  title="Ver Storage Local"
  onPress={async () => {
    try {
      const storageData = await AsyncStorage.getItem('ze-do-bip-storage');
      if (storageData) {
        const parsed = JSON.parse(storageData);
        console.log('=== STORAGE COMPLETO ===');
        console.log(JSON.stringify(parsed, null, 2));
        
        const guardaAtiva = parsed.state?.guardaAtiva;
        const guardaAtivaInfo = guardaAtiva 
          ? `Nota: ${guardaAtiva.numero}\nProdutos: ${guardaAtiva.produtos?.length || 0}\nConcluídos: ${guardaAtiva.produtos?.filter(p => p.concluido).length || 0}`
          : 'Nenhuma';
        
        Alert.alert(
          'Storage Local',
          `Guardas Assumidas: ${parsed.state?.guardasAssumidas?.length || 0}\n` +
          `Guardas Finalizadas: ${parsed.state?.guardasFinalizadas?.length || 0}\n\n` +
          `Guarda Ativa:\n${guardaAtivaInfo}\n\n` +
          'Veja o console para detalhes completos',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Storage Vazio', 'Nenhum dado encontrado');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao ler storage: ' + error);
    }
  }}
  variant="outline"
  style={styles.configAction}
/>

<Button
  title="Limpar Storage Completo"
  onPress={() => {
    Alert.alert(
      'Limpar Storage',
      'ATENÇÃO: Isso vai apagar TODOS os dados locais incluindo guardas em andamento. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert('Sucesso', 'Storage limpo! Faça logout e login novamente.');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao limpar storage: ' + error);
            }
          }
        }
      ]
    );
  }}
  variant="outline"
  style={styles.configActionDanger}
/>
```

---

### 7. Atualizar Referências em Outros Arquivos

**Arquivo:** `components/LeituraInterface.tsx`

**Atualizar linha ~313 (log de confirmação de endereço):**
```typescript
Logger.debug('LEITURA Confirmando endereço modal - Valor:', valorDigitado, 'Endereço:', produtoAtual.endereco, 'ID Endereço:', produtoAtual.idEndereco);
```

**Atualizar linha ~352 (mensagem de erro):**
```typescript
setErro(`Código incorreto! Esperado: ${produtoAtual.endereco} ou ID: ${produtoAtual.idEndereco}`);
```

**Atualizar linha ~426 (log de processamento de endereço):**
```typescript
Logger.debug('LEITURA Processando endereço:', valor, 'Tamanho:', valor.length, 'Endereço esperado:', produtoAtual.endereco, 'ID esperado:', produtoAtual.idEndereco);
```

**Atualizar linha ~429-430 (validação de endereço):**
```typescript
const enderecoCorreto = valor === produtoAtual.endereco;
const idEnderecoCorreto = valor === produtoAtual.idEndereco;
```

**Atualizar linha ~432 (log de verificação):**
```typescript
Logger.debug('LEITURA Verificação - Endereço correto:', enderecoCorreto, 'ID Endereço correto:', idEnderecoCorreto);
```

**Atualizar linha ~434 (condição de sucesso):**
```typescript
if (enderecoCorreto || idEnderecoCorreto) {
  Logger.debug('LEITURA Endereço/ID correto - Finalizando via', enderecoCorreto ? 'endereço' : 'ID endereço');
  confirmarEnderecoModal(valor);
}
```

**Atualizar linha ~440 (mensagem de erro):**
```typescript
setErro(`Código incorreto! Esperado: ${produtoAtual.endereco} ou ID: ${produtoAtual.idEndereco}`);
```

---

## Ordem de Implementação

1. Atualizar interface `ProdutoAPI` em `types/siac.ts` (adicionar id_endereco e id)
2. Atualizar interface `Produto` em `types/siac.ts` (remover idApi, adicionar cdProduto e idEndereco)
3. Corrigir conversão em `services/GuardaService.ts` (usar produto.id como ID único)
4. Adicionar flag processandoFinalizacao em `LeituraInterface.tsx`
5. Atualizar confirmarEnderecoModal com bloqueio de useEffect
6. Atualizar fecharModalContador com bloqueio de useEffect
7. Atualizar todas as referências a idApi para idEndereco em `LeituraInterface.tsx`
8. Adicionar logs detalhados em `store/appStore.ts`
9. Criar ferramenta de debug em `app/home.tsx`
10. Testar com nota que tenha SKUs duplicados (ex: nota 301918)

## Validação

Após correções, testar com a nota 301918 que tem:
- Produto "053467" com quantidade 4 (id: "3019180003")
- Produto "053467" com quantidade 2 (id: "3019180004")

Verificar:
1. Ambos os produtos finalizam corretamente
2. Não há conflito de IDs
3. Storage local mostra dados corretos
4. Race condition não ocorre ao finalizar rapidamente

## Notas Importantes

- A mudança de `id: produto.cd_produto` para `id: produto.id` é BREAKING CHANGE
- Dados antigos no storage terão IDs inconsistentes (cd_produto ao invés de id único)
- **SOLUÇÃO**: Botão "Limpar Storage Completo" resolve problema de migração
- Usuários devem limpar storage após atualização do app

