/**
 * Service para processamento e identificação de códigos de barras e QR codes
 */

import { Guarda, Produto } from '@/types/siac';
import { Logger } from '@/utils/logger';

interface ResultadoIdentificacao {
  tipo: 'produto' | 'endereco';
  produto?: Produto;
  endereco?: string;
  produtos?: Produto[];
}

export class CodigoProcessorService {
  /**
   * Identifica se um código é produto ou endereço e retorna os dados correspondentes
   */
  static identificarCodigo(
    codigo: string, 
    guarda: Guarda, 
    enderecoFiltro?: string | null
  ): ResultadoIdentificacao | null {
    if (!codigo.trim() || !guarda) {
      Logger.debug('[CODIGO_PROCESSOR] Código ou guarda inválidos');
      return null;
    }

    const codigoLimpo = codigo.trim();
    Logger.debug('[CODIGO_PROCESSOR] Identificando código:', codigoLimpo, 'Filtro:', enderecoFiltro);

    // 1. Buscar produto primeiro (prioridade)
    const produtoEncontrado = this.buscarProduto(codigoLimpo, guarda, enderecoFiltro);
    if (produtoEncontrado) {
      Logger.debug('[CODIGO_PROCESSOR] ✅ Produto encontrado:', produtoEncontrado.id);
      return {
        tipo: 'produto',
        produto: produtoEncontrado
      };
    }

    // 2. Se não achou produto, buscar endereço
    const enderecoEncontrado = this.buscarEndereco(codigoLimpo, guarda);
    if (enderecoEncontrado) {
      Logger.debug('[CODIGO_PROCESSOR] ✅ Endereço encontrado:', enderecoEncontrado.endereco);
      return {
        tipo: 'endereco',
        endereco: enderecoEncontrado.endereco,
        produtos: enderecoEncontrado.produtos
      };
    }

    Logger.debug('[CODIGO_PROCESSOR] ❌ Código não identificado');
    return null;
  }

  /**
   * Busca produto pelos códigos de barras, fábrica ou ID
   */
  private static buscarProduto(
    codigo: string, 
    guarda: Guarda, 
    enderecoFiltro?: string | null
  ): Produto | null {
    if (!guarda.produtos) return null;

    // Filtrar produtos por endereço se houver filtro
    const produtosParaBuscar = enderecoFiltro 
      ? guarda.produtos.filter(p => p.endereco === enderecoFiltro)
      : guarda.produtos;

    Logger.debug('[CODIGO_PROCESSOR] Buscando em', produtosParaBuscar.length, 'produtos');

    // Buscar produto pelos diferentes códigos possíveis
    for (const produto of produtosParaBuscar) {
      // Só buscar em produtos não concluídos
      if (produto.concluido) {
        continue;
      }

      // Buscar em todos os códigos de barras do array
      const codigosBarras = Array.isArray(produto.codigoBarras) 
        ? produto.codigoBarras 
        : produto.codigoBarras 
          ? [produto.codigoBarras] 
          : [];

      const codigosParaComparar = [
        ...codigosBarras,              // Todos os códigos de barras do array
        produto.codigoFabrica,
        produto.cdProduto,
        produto.idEndereco
      ].filter(Boolean); // Remove valores vazios/null

      for (const codigoComparacao of codigosParaComparar) {
        if (codigoComparacao === codigo) {
          Logger.debug('[CODIGO_PROCESSOR] Match encontrado:', {
            produtoId: produto.id,
            codigoUsado: codigoComparacao,
            tipoCodigo: this.getTipoCodigo(codigoComparacao, produto)
          });
          return produto;
        }
      }
    }

    return null;
  }

  /**
   * Busca produtos por endereço (QR Code)
   */
  private static buscarEndereco(codigo: string, guarda: Guarda) {
    if (!guarda.produtos) return null;

    // Buscar produtos que têm esse endereço
    const produtosPorEndereco = guarda.produtos.filter(p => 
      p.endereco === codigo && !p.concluido
    );

    if (produtosPorEndereco.length > 0) {
      return {
        endereco: codigo,
        produtos: produtosPorEndereco
      };
    }

    return null;
  }

  /**
   * Identifica qual tipo de código foi usado para match
   */
  private static getTipoCodigo(codigo: string, produto: Produto): string {
    const codigosBarras = Array.isArray(produto.codigoBarras) 
      ? produto.codigoBarras 
      : produto.codigoBarras 
        ? [produto.codigoBarras] 
        : [];
    
    if (codigosBarras.includes(codigo)) return 'codigoBarras';
    if (codigo === produto.codigoFabrica) return 'codigoFabrica';
    if (codigo === produto.cdProduto) return 'cdProduto';
    if (codigo === produto.idEndereco) return 'idEndereco';
    return 'desconhecido';
  }

  /**
   * Valida se um código está no formato esperado
   */
  static validarFormatoCodigo(codigo: string): {
    valido: boolean;
    tipo: 'ean13' | 'ean8' | 'code128' | 'endereco' | 'id_endereco' | 'alfanumerico' | 'desconhecido';
    comprimento: number;
  } {
    const codigoLimpo = codigo.trim();
    const comprimento = codigoLimpo.length;

    // Determinar tipo baseado no comprimento e padrão
    let tipo: 'ean13' | 'ean8' | 'code128' | 'endereco' | 'id_endereco' | 'alfanumerico' | 'desconhecido' = 'desconhecido';
    let valido = false;

    if (comprimento === 13 && /^\d+$/.test(codigoLimpo)) {
      tipo = 'ean13';
      valido = true;
    } else if (comprimento === 8 && /^\d+$/.test(codigoLimpo)) {
      tipo = 'ean8';
      valido = true;
    } else if (comprimento >= 3 && codigoLimpo.includes('.')) {
      tipo = 'endereco'; // Endereços com pontos (ex: P.29.01.01.01)
      valido = true;
    } else if (comprimento >= 3 && comprimento <= 10 && /^\d+$/.test(codigoLimpo)) {
      tipo = 'id_endereco'; // IDs numéricos de endereço
      valido = true;
    } else if (comprimento >= 3 && /^[A-Za-z0-9]+$/.test(codigoLimpo)) {
      tipo = 'alfanumerico'; // Códigos alfanuméricos
      valido = true;
    } else if (comprimento >= 6 && comprimento <= 20) {
      tipo = 'code128'; // Outros códigos de barras
      valido = true;
    }

    // Aceitar qualquer código com tamanho mínimo
    if (comprimento >= 3) {
      valido = true;
    }

    Logger.debug('[CODIGO_PROCESSOR] Validação:', {
      codigo: codigoLimpo,
      tipo,
      comprimento,
      valido
    });

    return { valido, tipo, comprimento };
  }
}