import { GuardaHeader } from "@/app/leitura/_components/GuardaHeader";
import { ListaProdutos } from "@/app/leitura/_components/ListaProdutos";
import { ModalContador } from "@/app/leitura/_components/ModalContador";
import { ModalEndereco } from "@/app/leitura/_components/ModalEndereco";
import { ScannerInput } from "@/app/leitura/_components/ScannerInput";
import { temProblemas } from "@/app/leitura/_utils/produtoValidation";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/Colors";
import { useGuardas } from "@/contexts/GuardaContext";
import { useToast } from "@/contexts/ToastContext";
import { useScannerInput } from "@/hooks/useScannerInput";
import { CodigoProcessorService } from "@/services/CodigoProcessorService";
import ProdutoService from "@/services/ProdutoService";
import { Guarda, Produto } from "@/types/siac";
import { Logger } from "@/utils/logger";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface LeituraInterfaceProps {
  ordemId: string;
  onVoltar: () => void;
}

type EstadoLeitura =
  | "aguardando_codigo"
  | "contando_produto"
  | "aguardando_endereco";
type TipoInicial = "produto" | "endereco";

export const LeituraInterface: React.FC<LeituraInterfaceProps> = ({
  ordemId,
  onVoltar,
}) => {
  // Usar GuardaContext para carregar guarda e detalhes
  const {
    selecionarGuarda,
    finalizarGuarda: finalizarGuardaContext,
    obterContagemBipados,
  } = useGuardas();
  const { showToast } = useToast();
  // Estados da interface
  const [guarda, setGuarda] = useState<Guarda | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [estadoLeitura, setEstadoLeitura] =
    useState<EstadoLeitura>("aguardando_codigo");

  // Estados do progresso (do backend)
  const [contagemBipados, setContagemBipados] = useState<{
    bipados: number;
    naoBipados: number;
    total: number;
    percentualBipado: number;
  } | null>(null);

  // Estados do fluxo de bipagem
  const [produtoAtual, setProdutoAtual] = useState<Produto | null>(null);
  const [enderecoFiltro, setEnderecoFiltro] = useState<string | null>(null);
  const [tipoInicial, setTipoInicial] = useState<TipoInicial | null>(null);
  const [contadorModal, setContadorModal] = useState(false);
  const [modalEnderecoVisible, setModalEnderecoVisible] = useState(false);
  const [quantidadeContada, setQuantidadeContada] = useState(0);
  const [quantidadeManual, setQuantidadeManual] = useState("");
  const [valorModalInput, setValorModalInput] = useState("");
  const [valorEnderecoInput, setValorEnderecoInput] = useState("");
  const [erro, setErro] = useState<string>("");
  const [finalizandoGuarda, setFinalizandoGuarda] = useState(false);
  const [processandoFinalizacao, setProcessandoFinalizacao] = useState(false);
  const [bipandoProduto, setBipandoProduto] = useState(false);
  const incrementoPendenteRef = React.useRef(0);
  const produtoAtualIdRef = React.useRef<string | null>(null);
  /** Quantidade já bipada no backend ao abrir o modal contador; usada para calcular incremento no Confirmar do ModalEndereco */
  const quantidadeLidaAoAbrirRef = React.useRef(0);

  const normalizarEnderecoInformado = (valor: any): string => {
    // Se for string, usar diretamente; caso contrário, converter para string
    if (typeof valor === "string") {
      return valor.trim().toUpperCase();
    }
    // Se for número, converter para string
    if (typeof valor === "number") {
      return String(valor).trim();
    }
    // Para qualquer outro tipo (objeto, undefined, null), retornar string vazia
    return "";
  };
  const isEnderecoId = (valor: string) => /^\d{1,5}$/.test(valor);
  const isEnderecoExtenso = (valor: string) =>
    /^[A-Z]\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(valor);
  const isEnderecoFormatoValido = (valor: string) =>
    isEnderecoId(valor) || isEnderecoExtenso(valor);

  // Função principal para processar códigos completos (declarar antes do hook)
  const processarCodigoCompleto = (codigo: string) => {
    if (!guarda) {
      Logger.debug("LEITURA Guarda não carregada ainda");
      setErro("❌ Aguarde carregar os dados da guarda");
      return;
    }

    Logger.debug(
      "LEITURA Processando código completo:",
      codigo,
      "Tamanho:",
      codigo.length,
    );

    if (estadoLeitura === "aguardando_codigo") {
      const resultado = CodigoProcessorService.identificarCodigo(
        codigo,
        guarda,
        enderecoFiltro,
      );

      if (!resultado) {
        Logger.debug("LEITURA Código não encontrado");
        setErro("❌ Código não encontrado ou produto já concluído");

        // Limpar erro após 3 segundos
        setTimeout(() => {
          setErro("");
        }, 3000);
        return;
      }

      setErro("");

      if (resultado.tipo === "produto") {
        setTipoInicial("produto");
        abrirModalContador(resultado.produto!);
      } else {
        // É endereço identificado diretamente
        setTipoInicial("endereco");
        setEnderecoFiltro(resultado.endereco!);
        Alert.alert(
          "Endereço Selecionado",
          `Endereço identificado: ${
            resultado.endereco
          }\n\nAgora escaneie os produtos deste endereço.\n\nProdutos disponíveis: ${
            resultado.produtos!.length
          }`,
        );
      }
    }
  };

  // Hook customizado para gerenciar scanner (após declarar a função)
  const {
    valorAtual: valorLido,
    handleInputChange,
    handleSubmitManual,
    resetar: resetarScanner,
    cleanup: cleanupScanner,
  } = useScannerInput({
    onCodigoCompleto: processarCodigoCompleto,
    tamanhoMinimo: 1, // Aceitar qualquer entrada válida
    timeoutMs: 0, // Não usar timeout - confiar apenas no Enter
  });

  // Carregar detalhes da guarda na inicialização
  useEffect(() => {
    carregarDetalhesGuarda();
  }, [ordemId]);

  useEffect(() => {
    produtoAtualIdRef.current = produtoAtual?.id ?? null;
  }, [produtoAtual?.id]);

  // REMOVIDO: useEffect que observava store constantemente
  // A tela de leitura é 100% local - não há sincronização com store durante leitura
  // A atualização do progresso acontece apenas quando produto é finalizado (manual)

  // Interceptar botão de voltar do Android
  useEffect(() => {
    const backAction = () => {
      if (modalEnderecoVisible) {
        Alert.alert("Cancelar", "Tem certeza? O produto não será finalizado.", [
          { text: "Não", style: "cancel" },
          { text: "Sim", onPress: cancelarModalEndereco },
        ]);
        return true;
      }
      if (contadorModal) {
        Alert.alert("Cancelar", "Tem certeza? A operação será cancelada.", [
          { text: "Não", style: "cancel" },
          { text: "Sim", onPress: resetarLeitura },
        ]);
        return true;
      }

      onVoltar();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [contadorModal, modalEnderecoVisible, onVoltar]);

  // Cleanup quando componente for desmontado
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  /**
   * Atualiza a contagem de bipados do backend
   */
  const atualizarContagemBipados = async () => {
    try {
      Logger.debug("LEITURA Atualizando contagem de bipados...");
      const contagem = await obterContagemBipados(ordemId);
      if (contagem) {
        setContagemBipados(contagem);
        Logger.debug("LEITURA Contagem atualizada:", contagem);
      }
    } catch (error) {
      Logger.error("LEITURA Erro ao atualizar contagem:", error);
    }
  };

  const carregarDetalhesGuarda = async () => {
    try {
      setCarregando(true);
      Logger.debug("LEITURA Carregando detalhes da guarda:", ordemId);

      // Carregar guarda e contagem em paralelo
      const [guardaCarregada, contagem] = await Promise.all([
        selecionarGuarda(ordemId),
        obterContagemBipados(ordemId),
      ]);

      // Atualizar contagem
      if (contagem) {
        setContagemBipados(contagem);
        Logger.debug("LEITURA Contagem inicial:", contagem);
      }

      if (guardaCarregada) {
        // Garantir que guarda iniciada tenha status correto
        let guardaLocal = guardaCarregada;
        const guardaFoiIniciada =
          guardaLocal.dataInicio || guardaLocal.iniciadaEm;
        if (guardaFoiIniciada && guardaLocal.status !== "EM_ANDAMENTO") {
          Logger.debug("LEITURA Corrigindo status da guarda para EM_ANDAMENTO");
          guardaLocal = {
            ...guardaLocal,
            status: "EM_ANDAMENTO",
            podeIniciar: false,
            podeTrabalhar: true,
            podeFinalizar: true,
            quantidadeItens: guardaLocal.produtos.length,
          };
        }

        setGuarda(guardaLocal);
        Logger.debug(
          `LEITURA Guarda carregada: ${guardaLocal.produtos.length} produtos, status: ${guardaLocal.status}`,
        );
        if (guardaLocal.produtos.length > 0) {
          Logger.debug("LEITURA Primeiro produto:", guardaLocal.produtos[0]);
          Logger.debug(
            "LEITURA ID do primeiro produto:",
            guardaLocal.produtos[0]?.id,
          );
        }
      } else {
        Logger.error("[LEITURA] Guarda não encontrada");
        Alert.alert("Erro", "Não foi possível carregar os detalhes da guarda", [
          { text: "Voltar", onPress: onVoltar },
        ]);
      }
    } catch (error) {
      Logger.error("[LEITURA] Erro ao carregar guarda:", error);
      Alert.alert("Erro", "Falha ao carregar detalhes da guarda", [
        { text: "Voltar", onPress: onVoltar },
      ]);
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Calcula o progresso usando dados do backend
   */
  const calcularProgresso = () => {
    // Usar contagem do backend se disponível
    if (contagemBipados) {
      return contagemBipados.percentualBipado;
    }
    // Fallback para contagem local
    if (!guarda || guarda.produtos.length === 0) return 0;
    const produtosConcluidos = guarda.produtos.filter(
      (p) => p.concluido || p.bipado,
    ).length;
    return (produtosConcluidos / guarda.produtos.length) * 100;
  };

  const resetarLeitura = () => {
    Logger.debug("LEITURA Resetando interface de leitura");

    // Reset do scanner
    resetarScanner();

    // Reset dos estados da interface
    setEstadoLeitura("aguardando_codigo");
    setProdutoAtual(null);
    setEnderecoFiltro(null);
    setTipoInicial(null);
    setContadorModal(false);
    setModalEnderecoVisible(false);
    setQuantidadeContada(0);
    setQuantidadeManual("");
    setValorModalInput("");
    setValorEnderecoInput("");
    setErro("");
  };

  const cancelarModal = () => {
    // Reseta tudo SEM chamar fecharModalContador (que poderia finalizar produto)
    Logger.debug("LEITURA Cancelando operação - não finalizar produto");
    setContadorModal(false);
    resetarLeitura();
  };

  /**
   * Filtra produtos pendentes (não concluídos e não bipados)
   */
  const obterProdutosFiltrados = () => {
    if (!guarda) return [];

    // Filtrar produtos não concluídos E não bipados (do backend)
    let produtos = guarda.produtos.filter((p) => !p.concluido && !p.bipado);

    if (enderecoFiltro) {
      produtos = produtos.filter((p) => p.endereco === enderecoFiltro);
    }

    return produtos;
  };

  /**
   * Ordena produtos: 1° Pendente, 2° Em andamento, 3° Concluído
   */
  const ordenarProdutos = (produtos: Produto[]): Produto[] => {
    const prioridade = (p: Produto) => {
      if (p.concluido || p.bipado) return 2; // Concluído por último
      if ((p.quantidadeLida ?? 0) > 0) return 1; // Em andamento no meio
      return 0; // Pendente primeiro
    };
    return [...produtos].sort((a, b) => prioridade(a) - prioridade(b));
  };

  const abrirModalContador = (produto: Produto) => {
    const problemas = temProblemas(produto);

    // Bloquear se n�o tem c�digo de barras
    if (problemas.bloqueado) {
      Alert.alert(
        "?? Produto Bloqueado",
        `Este produto não pode ser bipado pois não possui código de barras!\n\nProduto: ${produto.descricao}\nEndere�o: ${produto.endereco}`,
        [{ text: "Entendi", style: "default" }],
      );
      return;
    }

    Logger.debug("LEITURA Abrindo modal contador para produto:", {
      id: produto.id,
      cdProduto: produto.cdProduto,
      idEndereco: produto.idEndereco,
      endereco: produto.endereco,
      descricao: produto.descricao,
      codigoBarras: produto.codigoBarras,
      codigoFabrica: produto.codigoFabrica,
      produtoCompleto: produto,
      problemas,
    });

    setProdutoAtual(produto);
    // quantidadeBipada (backend) é guardada na ref; quantidadeContada (local) inicia em 0
    const qtdBipadaBackend = produto.quantidadeLida || 0;
    quantidadeLidaAoAbrirRef.current = qtdBipadaBackend;
    setQuantidadeContada(0); // Contagem local começa em 0
    setQuantidadeManual("");
    setValorModalInput("");
    setValorEnderecoInput("");
    setContadorModal(true);
    setEstadoLeitura("contando_produto");
  };

  /**
   * Bipar produto no backend (incremento + endereço + sq_guarda).
   * O backend valida o endereço e pode marcar como bipado se atingir a quantidade.
   */
  const biparProdutoIncremento = async (
    produto: Produto,
    incremento: number,
    endereco: string,
  ): Promise<number | null> => {
    if (!guarda) return null;
    const enderecoTrim = endereco?.trim() || "";
    if (!enderecoTrim) {
      setErro("Informe o endereço antes de bipar");
      return null;
    }
    if (bipandoProduto) {
      incrementoPendenteRef.current += incremento;
      return null;
    }

    try {
      setBipandoProduto(true);
      Logger.debug("LEITURA Bipando no backend:", {
        cdProduto: produto.cdProduto,
        incremento,
        endereco: enderecoTrim,
        sq_guarda: guarda.id,
      });

      let qtdeBipada: number | null = null;
      let proximoIncremento = incremento;

      while (true) {
        const response = await ProdutoService.bipar(produto.cdProduto, {
          incremento: proximoIncremento,
          endereco: enderecoTrim,
          sq_guarda: Number(guarda.id),
        });
        qtdeBipada =
          response?.qtde_bipada ?? (response as any)?.qtde_bipada ?? 0;
        const bipado = response?.bipado ?? (response as any)?.bipado;

        setProdutoAtual((prev) =>
          prev && prev.id === produto.id
            ? {
                ...prev,
                quantidadeLida: qtdeBipada || 0,
                bipado: !!bipado,
                concluido: !!bipado,
              }
            : prev,
        );

        setGuarda((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            produtos: prev.produtos.map((p) =>
              p.id === produto.id
                ? {
                    ...p,
                    quantidadeLida: qtdeBipada || 0,
                    bipado: !!bipado,
                    concluido: !!bipado,
                  }
                : p,
            ),
          };
        });

        const pendente = incrementoPendenteRef.current;
        if (pendente > 0) {
          incrementoPendenteRef.current = 0;
          proximoIncremento = pendente;
          continue;
        }

        return qtdeBipada ?? null;
      }
    } catch (error: any) {
      Logger.error("LEITURA Erro ao bipar no backend:", error);
      Alert.alert(
        "Erro ao bipar",
        error?.message || "Falha ao bipar o produto",
      );
      return null;
    } finally {
      setBipandoProduto(false);
    }
  };

  const fecharModalContador = async () => {
    setContadorModal(false);
    setQuantidadeManual("");
    setValorModalInput("");
    setQuantidadeContada(0);
    setValorEnderecoInput("");
    setErro("");
    setEstadoLeitura("aguardando_codigo");
    await atualizarContagemBipados();
    resetarLeitura();
  };

  /** Próximo no ModalContador: fecha contador e abre modal de endereço */
  const confirmarQuantidadeModal = () => {
    if (!produtoAtual || !guarda) return;
    if (quantidadeContada < 1) {
      setErro("Bipe pelo menos 1 item antes de continuar.");
      return;
    }
    Logger.debug(
      "LEITURA Próximo: abrindo modal endereço para produto:",
      produtoAtual.id,
      "Quantidade contada:",
      quantidadeContada,
    );
    setContadorModal(false);
    setModalEnderecoVisible(true);
  };

  /** Confirmar no ModalEndereco: chama bipar com o incremento e fecha fluxo */
  const confirmarEnderecoModal = async () => {
    if (!produtoAtual || !guarda) return;
    const enderecoNorm = normalizarEnderecoInformado(valorEnderecoInput);
    if (!enderecoNorm) {
      setErro("Informe o endereço para confirmar.");
      return;
    }
    if (!isEnderecoFormatoValido(enderecoNorm)) {
      setErro(
        "Endereço inválido. Use ID numérico ou formato extenso (ex: A.01.02.03.04).",
      );
      return;
    }
    // quantidadeContada é a contagem local (não inclui o que já estava no backend)
    if (quantidadeContada < 1) {
      setErro("Nenhuma quantidade a bipar.");
      return;
    }
    const resultado = await biparProdutoIncremento(
      produtoAtual,
      quantidadeContada,
      enderecoNorm,
    );
    if (resultado != null) {
      setModalEnderecoVisible(false);
      setValorEnderecoInput("");
      setQuantidadeContada(0);
      setEstadoLeitura("aguardando_codigo");
      await atualizarContagemBipados();
      resetarLeitura();
    }
  };

  /** Cancelar no ModalEndereco: fecha todas as modais e reseta quantidadeContada (o Alert é exibido pelo próprio modal) */
  const cancelarModalEndereco = () => {
    setModalEnderecoVisible(false);
    setContadorModal(false);
    setQuantidadeContada(0);
    setValorEnderecoInput("");
    setErro("");
    setEstadoLeitura("aguardando_codigo");
    setProdutoAtual(null);
    setQuantidadeManual("");
    setValorModalInput("");
  };

  // Nova função para processar código do modal quando completo
  const processarCodigoModal = (codigo: string) => {
    if (!codigo.trim() || !produtoAtual) return;

    Logger.debug(
      "LEITURA Processando código modal:",
      codigo,
      "Tamanho:",
      codigo.length,
      "Produto:",
      produtoAtual.id,
    );

    // Verificar se o código está nos códigos de barras do produto (array)
    const codigosBarras = Array.isArray(produtoAtual.codigoBarras)
      ? produtoAtual.codigoBarras
      : produtoAtual.codigoBarras
        ? [produtoAtual.codigoBarras]
        : [];
    const codigoValido =
      codigosBarras.includes(codigo) ||
      produtoAtual.id === codigo ||
      produtoAtual.codigoFabrica === codigo;

    // Incrementar contador localmente; bipar é chamado no Confirmar do ModalEndereco
    // Total = backend (ao abrir) + local
    const quantidadeTotal =
      quantidadeLidaAoAbrirRef.current + quantidadeContada;
    if (codigoValido) {
      if (quantidadeTotal < produtoAtual.quantidade) {
        setErro("");
        setValorModalInput("");
        setQuantidadeContada((prev) => prev + 1);
      } else {
        Logger.debug("LEITURA Tentativa de bipar além do limite");
        Alert.alert(
          "Limite Atingido",
          `Você já chegou no limite de bips para este produto!\n\nQuantidade esperada: ${produtoAtual.quantidade}\nQuantidade já bipada: ${quantidadeTotal}`,
          [{ text: "Entendi", style: "default" }],
        );
        setErro("Já chegou no limite de bips deste produto!");
        setTimeout(() => setErro(""), 3000);
        setValorModalInput("");
      }
    } else {
      Logger.debug("LEITURA ❌ Código incorreto - limpando input");
      setValorModalInput(""); // Limpar para nova tentativa
      const codigosEsperados = [...codigosBarras, produtoAtual.codigoFabrica]
        .filter(Boolean)
        .join(", ");
      setErro(`❌ Código incorreto! Esperado: ${codigosEsperados}`);
      setTimeout(() => setErro(""), 3000);
    }
  };

  // Refs removidos - não usamos mais debounce, apenas eventos nativos

  // Input do modal - apenas atualizar estado, SEM processamento automático
  const handleModalInputChange = (texto: string) => {
    setValorModalInput(texto);
    // NÃO processar automaticamente - aguardar Enter
  };

  // Submit do modal - usar valor do evento, NÃO do estado
  const handleModalSubmit = (event?: any) => {
    // SOLUÇÃO: Capturar valor diretamente do evento, igual ao input principal
    const codigoDoEvento = event?.nativeEvent?.text || valorModalInput;
    const codigo = codigoDoEvento.trim();

    Logger.debug("LEITURA Enter no modal - processamento imediato");
    Logger.debug("LEITURA - Valor do evento:", event?.nativeEvent?.text);
    Logger.debug("LEITURA - Valor do estado:", valorModalInput);
    Logger.debug(
      "LEITURA - Valor escolhido:",
      codigo,
      "Tamanho:",
      codigo.length,
    );

    if (codigo && produtoAtual) {
      processarCodigoModal(codigo);
    } else {
      Logger.debug("LEITURA ⚠︝ Código vazio ou sem produto - ignorando");
    }
  };

  // Input do endereço no modal contador
  const handleEnderecoInputChange = (texto: string) => {
    setValorEnderecoInput(texto);
  };

  const handleFinalizarGuarda = async () => {
    if (!guarda || finalizandoGuarda) return;

    try {
      // VALIDAR GUARDA ANTES DE FINALIZAR: Verificar se ainda está disponível e iniciada
      Logger.debug("LEITURA Validando guarda antes de finalizar:", guarda.id);

      // Se a guarda local foi iniciada (tem dt_iniguar ou iniciadaEm), considerar como EM_ANDAMENTO
      const guardaFoiIniciada =
        guarda.dataInicio ||
        guarda.iniciadaEm ||
        guarda.status === "EM_ANDAMENTO";

      if (!guardaFoiIniciada) {
        Alert.alert(
          "Guarda Indisponível",
          "Esta guarda não foi iniciada ainda. Inicie a guarda antes de finalizar.",
          [{ text: "OK" }],
        );
        return;
      }

      const guardaAtualizada = await selecionarGuarda(guarda.id);

      // Se não conseguiu obter da API, usar guarda local se foi iniciada
      const guardaParaValidar =
        guardaAtualizada ||
        (guardaFoiIniciada
          ? { ...guarda, status: "EM_ANDAMENTO" as const }
          : null);

      if (!guardaParaValidar) {
        Alert.alert(
          "Erro",
          "Não foi possível validar a guarda. Ela pode ter sido cancelada ou não existe mais.",
          [{ text: "OK" }],
        );
        return;
      }

      // Verificar se a guarda ainda está em andamento (ou foi iniciada localmente)
      const statusValido =
        guardaParaValidar.status === "EM_ANDAMENTO" || guardaFoiIniciada;

      if (!statusValido) {
        Alert.alert(
          "Guarda Indisponível",
          `Esta guarda não pode ser finalizada. Status atual: ${
            guardaParaValidar.status === "FINALIZADA"
              ? "Já foi finalizada"
              : "Não está em andamento"
          }.`,
          [{ text: "OK", onPress: onVoltar }],
        );
        return;
      }

      // Confirmar finalização
      Alert.alert(
        "Finalizar Guarda",
        "Tem certeza que deseja finalizar esta guarda?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Finalizar",
            style: "destructive",
            onPress: async () => {
              try {
                setFinalizandoGuarda(true);
                Logger.debug("LEITURA Finalizando guarda validada:", guarda.id);

                const sucesso = await finalizarGuardaContext(guarda.id);

                if (sucesso) {
                  Alert.alert("Sucesso", "Guarda finalizada com sucesso!", [
                    { text: "OK", onPress: onVoltar },
                  ]);
                } else {
                  Alert.alert(
                    "Erro",
                    "Falha ao finalizar a guarda. Tente novamente.",
                  );
                  setFinalizandoGuarda(false);
                }
              } catch (error) {
                Logger.error("[LEITURA] Erro ao finalizar guarda:", error);
                Alert.alert("Erro", "Erro inesperado ao finalizar a guarda.");
                setFinalizandoGuarda(false);
              }
            },
          },
        ],
      );
    } catch (error) {
      Logger.error("[LEITURA] Erro ao validar guarda:", error);
      Alert.alert("Erro", "Erro ao validar a guarda. Tente novamente.");
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Carregando detalhes da guarda...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!guarda) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorContainerText}>Guarda não encontrada</Text>
          <Button title="Voltar" onPress={onVoltar} />
        </View>
      </SafeAreaView>
    );
  }

  const progresso = calcularProgresso();
  // Usar dados do backend se disponíveis
  const produtosConcluidos = contagemBipados
    ? contagemBipados.bipados
    : guarda.produtos.filter((p) => p.concluido || p.bipado).length;
  const totalProdutos = contagemBipados
    ? contagemBipados.total
    : guarda.produtos.length;
  // Guarda completa apenas quando 100% bipado no backend
  const guardaCompleta = contagemBipados
    ? contagemBipados.percentualBipado === 100
    : progresso === 100;
  const produtosFiltrados = obterProdutosFiltrados();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header da guarda - FIXO */}
        <View style={styles.headerSection}>
          <GuardaHeader
            guarda={guarda}
            produtosConcluidos={produtosConcluidos}
            totalProdutos={totalProdutos}
            progresso={progresso}
          />
        </View>

        {/* Interface de leitura - FIXA (sempre visível) */}
        <View style={styles.scannerSection}>
          <ScannerInput
            valorLido={valorLido}
            enderecoFiltro={enderecoFiltro}
            erro={erro}
            finalizandoGuarda={finalizandoGuarda}
            disabled={contadorModal || finalizandoGuarda}
            quantidadeProdutosFiltrados={produtosFiltrados.length}
            onChangeText={handleInputChange}
            onSubmit={handleSubmitManual}
            onLimparFiltro={resetarLeitura}
          />
        </View>

        {/* Lista de produtos - COM SCROLL */}
        <View style={styles.listaSection}>
          <ListaProdutos
            produtos={
              enderecoFiltro
                ? ordenarProdutos(produtosFiltrados)
                : ordenarProdutos(guarda.produtos)
            }
            enderecoFiltro={enderecoFiltro}
            totalProdutos={totalProdutos}
          />
        </View>

        {/* Botão finalizar guarda - FIXO */}
        {guardaCompleta && (
          <View style={styles.finishSection}>
            <Button
              title={finalizandoGuarda ? "Finalizando..." : "Finalizar Guarda"}
              onPress={handleFinalizarGuarda}
              disabled={finalizandoGuarda}
              style={{
                ...styles.finishButton,
                ...(finalizandoGuarda && styles.finishButtonDisabled),
              }}
            />
          </View>
        )}
      </View>

      {/* Modal de Contador: contagem local; Próximo abre ModalEndereco */}
      <ModalContador
        visible={contadorModal}
        produtoAtual={produtoAtual}
        quantidadeContada={quantidadeContada}
        quantidadeBipada={quantidadeLidaAoAbrirRef.current}
        quantidadeManual={quantidadeManual}
        valorModalInput={valorModalInput}
        onCancelar={cancelarModal}
        onConfirmar={confirmarQuantidadeModal}
        onModalInputChange={handleModalInputChange}
        onModalSubmit={handleModalSubmit}
        onQuantidadeManualChange={(valor) => {
          const valorNumerico = valor.replace(/[^0-9]/g, "");
          if (valorNumerico.length <= 2) {
            setQuantidadeManual(valorNumerico);
          }
        }}
        onAdicionarQuantidade={(quantidade) => {
          if (!produtoAtual) return;
          // Total = backend + local + nova quantidade
          const novoTotal =
            quantidadeLidaAoAbrirRef.current + quantidadeContada + quantidade;
          if (novoTotal <= produtoAtual.quantidade) {
            setQuantidadeManual("");
            setErro("");
            setQuantidadeContada((prev) => prev + quantidade);
          } else {
            const restante =
              produtoAtual.quantidade -
              quantidadeLidaAoAbrirRef.current -
              quantidadeContada;
            Alert.alert(
              "🚫 Limite Excedido",
              `Você está tentando adicionar mais do que o permitido!\n\nQuantidade que você tentou adicionar: ${quantidade}\nQuantidade máxima restante: ${restante}`,
              [{ text: "Entendi", style: "default" }],
            );
            setErro(
              `🚫 Quantidade excede o limite! Máximo permitido: ${restante}`,
            );
            setTimeout(() => setErro(""), 3000);
          }
        }}
        setErro={setErro}
      />

      {/* Modal de Endereço: valida endereço e ao Confirmar chama bipar */}
      <ModalEndereco
        visible={modalEnderecoVisible}
        produtoAtual={produtoAtual}
        valorEnderecoInput={valorEnderecoInput}
        quantidadeContada={quantidadeContada}
        quantidadeBipada={quantidadeLidaAoAbrirRef.current}
        onEnderecoInputChange={handleEnderecoInputChange}
        podeConfirmar={
          !!produtoAtual &&
          quantidadeContada >= 1 &&
          isEnderecoFormatoValido(
            normalizarEnderecoInformado(valorEnderecoInput),
          )
        }
        carregandoConfirmacao={bipandoProduto}
        onCancelar={cancelarModalEndereco}
        onConfirmar={confirmarEnderecoModal}
        onEnderecoSubmit={() => {}}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    // Header fixo no topo
  },
  scannerSection: {
    // Scanner fixo - sempre visível
    marginTop: 16,
    marginBottom: 16,
  },
  listaSection: {
    flex: 1,
    // Lista ocupa espaço restante e tem scroll interno
    minHeight: 0, // Importante para flex funcionar corretamente
  },
  finishSection: {
    // Botão finalizar fixo no final
    marginTop: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  errorContainerText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  finishButton: {
    backgroundColor: Colors.success,
  },
  finishButtonDisabled: {
    backgroundColor: Colors.gray[400],
    opacity: 0.7,
  },
});
