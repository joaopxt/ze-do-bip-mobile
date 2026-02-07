/**
 * Guarda Service - Zé do Bip
 * Serviço simplificado para comunicação com ze-sandbox
 * Toda lógica de negócio fica no backend
 */

import { Guarda, Produto } from "../types/siac";
import { Logger } from "../utils/logger";
import ApiService from "./ApiService";
import AuthService from "./AuthService";

// Interface para retorno de listarGuardas (já separadas por status)
export interface GuardasPorStatus {
  disponiveis: Guarda[];
  emAndamento: Guarda[];
  finalizadas: Guarda[];
}

// Interface para contagem de bipados
export interface ContagemBipados {
  bipados: number;
  naoBipados: number;
  total: number;
  percentualBipado: number;
}

/**
 * Converter dados da API para formato interno
 */
function converterGuardaApiParaInterna(guardaApi: any): Guarda {
  Logger.debug("[CONVERTER] Dados recebidos da API:", {
    sq_guarda: guardaApi.sq_guarda,
    nu_nota: guardaApi.nu_nota,
    cd_fornece: guardaApi.cd_fornece,
    fornecedor: guardaApi.fornecedor,
    SKUs: guardaApi.SKUs,
    status: guardaApi.status,
  });

  // Mapear status da API para status interno
  let statusInterno: "DISPONIVEL" | "EM_ANDAMENTO" | "FINALIZADA";
  switch (guardaApi.status) {
    case "Pendente":
      statusInterno = "DISPONIVEL";
      break;
    case "Iniciado":
      statusInterno = "EM_ANDAMENTO";
      break;
    case "Finalizado":
      statusInterno = "FINALIZADA";
      break;
    default:
      statusInterno = "DISPONIVEL";
  }

  // Permissões baseadas no status
  const podeIniciar = guardaApi.status === "Pendente";
  const podeTrabalhar = guardaApi.status === "Iniciado";
  const podeFinalizar = guardaApi.status === "Iniciado";

  // Nome do fornecedor (sandbox retorna no_fornecedor)
  const nomeFornecedor = guardaApi.fornecedor || "Fornecedor não informado";

  // Criar campo iniciadaEm combinando data e hora
  let iniciadaEm: string | undefined;
  if (guardaApi.dt_iniguar && guardaApi.hr_iniguar) {
    try {
      let dataHoraStr: string;
      if (guardaApi.dt_iniguar.includes("/")) {
        const [dia, mes, ano] = guardaApi.dt_iniguar.split("/");
        dataHoraStr = `${ano}-${mes}-${dia}T${guardaApi.hr_iniguar}`;
      } else if (guardaApi.dt_iniguar.length === 8) {
        const ano = guardaApi.dt_iniguar.substring(0, 4);
        const mes = guardaApi.dt_iniguar.substring(4, 6);
        const dia = guardaApi.dt_iniguar.substring(6, 8);
        dataHoraStr = `${ano}-${mes}-${dia}T${guardaApi.hr_iniguar}`;
      } else {
        dataHoraStr = `${guardaApi.dt_iniguar}T${guardaApi.hr_iniguar}`;
      }
      const data = new Date(dataHoraStr);
      if (!isNaN(data.getTime())) {
        iniciadaEm = data.toISOString();
      }
    } catch (error) {
      Logger.warn("[CONVERTER] Erro ao converter data de início:", error);
    }
  }

  // Criar campo concluidaEm combinando data e hora
  let concluidaEm: string | undefined;
  if (guardaApi.dt_fimguar && guardaApi.hr_fimguar) {
    try {
      let dataHoraStr: string;
      if (guardaApi.dt_fimguar.includes("/")) {
        const [dia, mes, ano] = guardaApi.dt_fimguar.split("/");
        dataHoraStr = `${ano}-${mes}-${dia}T${guardaApi.hr_fimguar}`;
      } else if (guardaApi.dt_fimguar.length === 8) {
        const ano = guardaApi.dt_fimguar.substring(0, 4);
        const mes = guardaApi.dt_fimguar.substring(4, 6);
        const dia = guardaApi.dt_fimguar.substring(6, 8);
        dataHoraStr = `${ano}-${mes}-${dia}T${guardaApi.hr_fimguar}`;
      } else {
        dataHoraStr = `${guardaApi.dt_fimguar}T${guardaApi.hr_fimguar}`;
      }
      const data = new Date(dataHoraStr);
      if (!isNaN(data.getTime())) {
        concluidaEm = data.toISOString();
      }
    } catch (error) {
      Logger.warn("[CONVERTER] Erro ao converter data de fim:", error);
    }
  }

  // Garantir quantidadeItens como número
  const quantidadeItens =
    typeof guardaApi.SKUs === "number"
      ? guardaApi.SKUs
      : parseInt(String(guardaApi.SKUs)) || 0;

  const guardaConvertida: Guarda = {
    id: String(guardaApi.sq_guarda),
    numero: guardaApi.nu_nota || "",
    fornecedor: nomeFornecedor,
    codigoFornecedor: guardaApi.cd_fornece || "",
    serie: guardaApi.sg_serie || "",
    dataEntrada: guardaApi.dt_entrada || guardaApi.dt_emissao || "",
    horaEntrada: guardaApi.hr_entrada || guardaApi.hr_emissao || "",
    dataInicio: guardaApi.dt_iniguar,
    horaInicio: guardaApi.hr_iniguar,
    dataFim: guardaApi.dt_fimguar,
    horaFim: guardaApi.hr_fimguar,
    iniciadaEm,
    concluidaEm,
    quantidadeItens,
    status: statusInterno,
    produtos: [],
    criadaEm: new Date().toISOString(),
    podeIniciar,
    podeTrabalhar,
    podeFinalizar,
  };

  Logger.debug("[CONVERTER] Guarda convertida:", {
    id: guardaConvertida.id,
    numero: guardaConvertida.numero,
    fornecedor: guardaConvertida.fornecedor,
    status: guardaConvertida.status,
    quantidadeItens: guardaConvertida.quantidadeItens,
  });

  return guardaConvertida;
}

/**
 * Converter produtos da API para formato interno
 */
function converterProdutosApiParaInternos(produtosApi: any[]): Produto[] {
  return produtosApi.map((produto, index) => {
    const codigosBarras = Array.isArray(produto.cod_barras)
      ? produto.cod_barras
      : produto.cod_barras
      ? [produto.cod_barras]
      : [];

    // Garantir que ID seja sempre string
    // Usar combinação de campos como fallback se não existir
    const id =
      produto.id != null
        ? String(produto.id)
        : `${produto.cd_produto || "PROD"}_${
            produto.id_endereco || index
          }_${index}`;

    // Status bipado vem do backend
    const bipado = produto.bipado === true;

    return {
      id: id,
      cdProduto: produto.cd_produto || "",
      idEndereco: produto.id_endereco || "",
      codigoFabrica: produto.cd_fabrica || "",
      codigoBarras: codigosBarras,
      descricao: produto.no_produto || "",
      endereco: produto.endereco || "",
      quantidade: produto.quantidade || 0,
      quantidadeLida: produto.qtde_bipada || 0,
      concluido: bipado, // Sincronizar com status do backend
      bipado: bipado,
      item: produto.item || "",
    };
  });
}

/**
 * GuardaService - Comunicação simplificada com ze-sandbox
 */
class GuardaService {
  private isOnline: boolean = true;

  constructor() {
    Logger.debug("[GUARDA_SERVICE] Inicializado");
  }

  /**
   * Verificar conectividade com o ze-sandbox
   */
  async verificarConectividade(): Promise<boolean> {
    try {
      const resultado = await ApiService.testarConectividade();
      this.isOnline = resultado.online;
      Logger.debug(
        `[GUARDA_SERVICE] Conectividade: ${
          this.isOnline ? "ONLINE" : "OFFLINE"
        }`
      );
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      Logger.error("[GUARDA_SERVICE] Erro ao verificar conectividade:", error);
      return false;
    }
  }

  /**
   * Listar guardas do usuário (já separadas por status)
   */
  async listarGuardas(cd_usuario?: string): Promise<GuardasPorStatus> {
    try {
      // Se não passou cd_usuario, obter da sessão
      let usuario = cd_usuario;
      if (!usuario) {
        const sessao = await AuthService.recuperarSessao();
        if (!sessao) {
          throw new Error("Usuário não autenticado");
        }
        usuario = sessao.cd_usuario;
      }

      Logger.debug(
        `[GUARDA_SERVICE] Listando guardas para usuário ${usuario}...`
      );

      const response = await ApiService.listarGuardas(usuario);

      if (!response.success || !response.data?.data) {
        throw new Error("Resposta da API inválida");
      }

      const todasGuardas = response.data.data.map(
        converterGuardaApiParaInterna
      );

      // Separar por status
      const resultado: GuardasPorStatus = {
        disponiveis: todasGuardas.filter((g) => g.status === "DISPONIVEL"),
        emAndamento: todasGuardas.filter((g) => g.status === "EM_ANDAMENTO"),
        finalizadas: todasGuardas.filter((g) => g.status === "FINALIZADA"),
      };

      Logger.debug(`[GUARDA_SERVICE] Guardas carregadas:`, {
        disponiveis: resultado.disponiveis.length,
        emAndamento: resultado.emAndamento.length,
        finalizadas: resultado.finalizadas.length,
      });

      return resultado;
    } catch (error) {
      Logger.error("[GUARDA_SERVICE] Erro ao listar guardas:", error);
      // Retornar arrays vazios em caso de erro
      return {
        disponiveis: [],
        emAndamento: [],
        finalizadas: [],
      };
    }
  }

  /**
   * Obter detalhes de uma guarda específica (com produtos)
   */
  async obterDetalhesGuarda(sq_guarda: string): Promise<Guarda | null> {
    try {
      Logger.debug(
        `[GUARDA_SERVICE] Obtendo detalhes da guarda ${sq_guarda}...`
      );

      const response = await ApiService.obterDetalhesGuarda(sq_guarda);

      if (!response.success || !response.data?.data) {
        throw new Error("Resposta da API inválida");
      }

      const guardaApi = response.data.data;
      const guarda = converterGuardaApiParaInterna(guardaApi);

      // Adicionar produtos
      guarda.produtos = converterProdutosApiParaInternos(
        guardaApi.produtos || []
      );

      Logger.debug(
        `[GUARDA_SERVICE] Detalhes obtidos: ${guarda.produtos.length} produtos`
      );

      return guarda;
    } catch (error) {
      Logger.error(
        `[GUARDA_SERVICE] Erro ao obter detalhes da guarda ${sq_guarda}:`,
        error
      );
      return null;
    }
  }

  /**
   * Iniciar uma guarda
   */
  async iniciarGuarda(sq_guarda: string): Promise<boolean> {
    try {
      Logger.debug(`[GUARDA_SERVICE] Iniciando guarda ${sq_guarda}...`);

      const isAuth = await AuthService.isAutenticado();
      if (!isAuth) {
        throw new Error("Usuário não autenticado");
      }

      const response = await ApiService.iniciarGuarda(sq_guarda);

      if (response.success) {
        Logger.debug(
          `[GUARDA_SERVICE] Guarda ${sq_guarda} iniciada com sucesso`
        );
        return true;
      }

      Logger.warn(`[GUARDA_SERVICE] Falha ao iniciar guarda ${sq_guarda}`);
      return false;
    } catch (error) {
      Logger.error(
        `[GUARDA_SERVICE] Erro ao iniciar guarda ${sq_guarda}:`,
        error
      );
      return false;
    }
  }

  /**
   * Finalizar uma guarda
   */
  async finalizarGuarda(sq_guarda: string): Promise<boolean> {
    try {
      Logger.debug(`[GUARDA_SERVICE] Finalizando guarda ${sq_guarda}...`);

      const isAuth = await AuthService.isAutenticado();
      if (!isAuth) {
        throw new Error("Usuário não autenticado");
      }

      const response = await ApiService.finalizarGuarda(sq_guarda);

      if (response.success) {
        Logger.debug(
          `[GUARDA_SERVICE] Guarda ${sq_guarda} finalizada com sucesso`
        );
        return true;
      }

      Logger.warn(`[GUARDA_SERVICE] Falha ao finalizar guarda ${sq_guarda}`);
      return false;
    } catch (error) {
      Logger.error(
        `[GUARDA_SERVICE] Erro ao finalizar guarda ${sq_guarda}:`,
        error
      );
      return false;
    }
  }

  /**
   * Verificar se está online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Obter contagem de produtos bipados de uma guarda
   */
  async obterContagemBipados(
    sq_guarda: string
  ): Promise<ContagemBipados | null> {
    try {
      Logger.debug(
        `[GUARDA_SERVICE] Obtendo contagem de bipados da guarda ${sq_guarda}...`
      );

      const response = await ApiService.obterContagemBipados(sq_guarda);

      if (response.success && response.data) {
        Logger.debug(`[GUARDA_SERVICE] Contagem obtida:`, {
          bipados: response.data.bipados,
          naoBipados: response.data.naoBipados,
          total: response.data.total,
          percentual: response.data.percentualBipado,
        });
        return response.data;
      }

      return null;
    } catch (error) {
      Logger.error(
        `[GUARDA_SERVICE] Erro ao obter contagem de bipados:`,
        error
      );
      return null;
    }
  }
}

export default new GuardaService();
