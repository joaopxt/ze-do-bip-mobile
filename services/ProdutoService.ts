/**
 * ProdutoService - Serviço para gerenciamento de produtos e bipagem
 * Comunica com o ze-sandbox para persistir dados de bipagem
 * Refatorado para usar HttpClient com Axios
 */

import { Logger } from "@/utils/logger";
import { get, post, put } from "./HttpClient";

/** Payload para bipar (backend valida endereço a cada chamada) */
export interface BiparPayload {
  incremento: number;
  endereco: string;
  sq_guarda: number;
}

/** Resposta do backend ao bipar (entidade ProdutosGuarda ou wrapper) */
export interface BiparProdutoResponse {
  id?: number;
  cd_produto?: string;
  no_produto?: string;
  quantidade?: number;
  qtde_bipada?: number;
  bipado?: boolean;
  endereco_confirmado?: string;
  [key: string]: unknown;
}

interface ProdutoResponse {
  cd_produto: string;
  no_produto: string;
  cd_fabrica: string;
  endereco: string;
  qt_estoque: number;
  situacao: string;
  cod_barras: string[];
}

class ProdutoService {
  constructor() {
    Logger.debug("ProdutoService", "Serviço inicializado com HttpClient");
  }

  /**
   * Bipar produto: incrementa quantidade bipada com endereço e sq_guarda.
   * Endpoint: POST /produtos/:cd_produto/bipar
   * O backend valida o endereço a cada chamada e pode marcar como bipado se atingir a quantidade.
   */
  async bipar(
    cd_produto: string,
    body: BiparPayload,
  ): Promise<BiparProdutoResponse> {
    Logger.debug("ProdutoService", "Bipando produto", {
      cd_produto,
      incremento: body.incremento,
      endereco: body.endereco,
      sq_guarda: body.sq_guarda,
    });

    try {
      const response = await post<BiparProdutoResponse>(
        `/produtos/${cd_produto}/bipar`,
        {
          incremento: body.incremento,
          endereco: body.endereco,
          sq_guarda: body.sq_guarda,
        },
      );

      const data =
        (response as { data?: BiparProdutoResponse })?.data ??
        (response as BiparProdutoResponse);
      Logger.debug("ProdutoService", "Bipagem registrada com sucesso", {
        cd_produto,
        qtde_bipada: data?.qtde_bipada,
        quantidade: data?.quantidade,
      });

      return data;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao bipar produto", {
        cd_produto,
        incremento: body.incremento,
        error,
      });
      throw error;
    }
  }

  /**
   * Busca produtos de uma guarda específica
   */
  async buscarPorGuarda(guardaId: number): Promise<any[]> {
    Logger.debug("ProdutoService", "Buscando produtos da guarda", { guardaId });

    try {
      const produtos = await get<any[]>(`/guardas/${guardaId}/produtos`);

      Logger.debug("ProdutoService", "Produtos da guarda carregados", {
        guardaId,
        quantidade: produtos.length,
      });

      return produtos;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao buscar produtos", {
        guardaId,
        error,
      });
      throw error;
    }
  }

  /**
   * Reseta o status de bipagem de um produto
   */
  async resetarBipagem(produtoId: number): Promise<any> {
    Logger.debug("ProdutoService", "Resetando bipagem do produto", {
      produtoId,
    });

    try {
      const produto = await post<any>(`/guardas/produtos/${produtoId}/resetar`);

      Logger.debug("ProdutoService", "Bipagem resetada com sucesso", {
        produtoId,
        bipado: produto.bipado,
      });

      return produto;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao resetar bipagem", {
        produtoId,
        error,
      });
      throw error;
    }
  }

  /**
   * Obtém a contagem de produtos bipados para uma guarda
   */
  async obterContagemBipados(
    guardaId: number,
  ): Promise<{ total: number; bipados: number; progresso: number }> {
    Logger.debug("ProdutoService", "Obtendo contagem de bipados", { guardaId });

    try {
      const contagem = await get<{
        total: number;
        bipados: number;
        progresso: number;
      }>(`/guardas/${guardaId}/contagem-bipados`);

      return contagem;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao obter contagem", {
        guardaId,
        error,
      });
      throw error;
    }
  }

  /**
   * Desbipa todos os produtos de uma guarda
   */
  async desbiparTodos(guardaId: number): Promise<void> {
    Logger.debug("ProdutoService", "Desbipando todos os produtos", {
      guardaId,
    });

    try {
      await post(`/guardas/${guardaId}/desbipar-todos`);
      Logger.debug("ProdutoService", "Todos os produtos desbipados", {
        guardaId,
      });
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao desbipar produtos", {
        guardaId,
        error,
      });
      throw error;
    }
  }

  /**
   * Verifica se um produto existe
   */
  async verificarProduto(produtoId: number): Promise<ProdutoResponse> {
    Logger.debug("ProdutoService", "Verificando produto", { produtoId });

    try {
      const produto = await get<ProdutoResponse>(
        `/produtos/get-by-barra/${produtoId}`,
      );

      return produto;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao verificar produto", {
        produtoId,
        error,
      });
      throw error;
    }
  }

  /**
   * Verifica se um endereço existe
   */
  async verificarEndereco(
    enderecoId: number,
    codpro: string,
  ): Promise<{ status: boolean; endereco: string }> {
    Logger.debug("ProdutoService", "Verificando endereço", { enderecoId });

    try {
      const resultado = await get<{ status: boolean; endereco: string }>(
        `/produtos/get-endereco/${enderecoId}/${codpro}`,
      );

      return resultado;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao verificar endereço", {
        enderecoId,
        error,
      });
      throw error;
    }
  }

  /**
   * Alterar o endereço do produto
   */
  async alterarEndereco(codpro: string, enderecoNovo: string) {
    Logger.debug("ProdutoService", "Alterando endereço", {
      codpro,
      enderecoNovo,
    });

    try {
      const resultado = await put(`/produtos/alterar-endereco/${codpro}`, {
        enderecoNovo,
      });

      Logger.debug("ProdutoService", "Endereço alterado com sucesso", {
        codpro,
        enderecoNovo,
      });

      return resultado;
    } catch (error) {
      Logger.error("ProdutoService", "Erro ao alterar endereço", {
        codpro,
        error,
      });
      throw error;
    }
  }
}

export default new ProdutoService();
