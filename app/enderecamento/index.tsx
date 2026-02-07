/**
 * Tela Inicial - Módulo de Endereçamento
 *
 * Permite consultar e alterar o endereço de estoque de um produto.
 * Fluxo:
 * 1. Bipar/Digitar Produto -> Valida
 * 2. Bipar/Digitar Novo Endereço -> Valida
 * 3. Bipar Quantidade (Modal) -> Confirma
 * 4. Envia Alteração
 * 
 * Requer permissão: enderecamento
 */

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { useToast } from "@/contexts/ToastContext";
import { podeAcessarEnderecamento } from "@/utils/permissoes";
import ProdutoService from "@/services/ProdutoService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import HeaderEnderecamento from "./_components/HeaderEnderecamento";
import { ModalContador } from "./_components/ModalContador";
import { ModalEndereco } from "./_components/ModalEndereco";
import Steps from "./_components/Steps";

interface Produto {
  cd_produto: string;
  no_produto: string;
  cd_fabrica: string;
  endereco: string;
  qt_estoque: number;
  situacao: string;
  cod_barras: string[];
}

export default function EnderecamentoScreen() {
  const router = useRouter();
  const { usuario, isLoggedIn } = useAuth();
  
  // Verificar permissão de acesso
  const temPermissao = podeAcessarEnderecamento(usuario);

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  // Estados do formulário
  const [step, setStep] = useState<1 | 2>(1); // 1: Produto, 2: Endereço
  const [codigoProduto, setCodigoProduto] = useState("");
  const [novoEndereco, setNovoEndereco] = useState("");
  const [enderecoAtual, setEnderecoAtual] = useState("");
  const [enderecoAtualValido, setEnderecoAtualValido] = useState(false);
  const [produto, setProduto] = useState<Produto>();
  const { showToast } = useToast();

  // Mocks de loading
  const [loading, setLoading] = useState(false);

  // Handlers (Simulações por enquanto)
  const handleVerificarProduto = async () => {
    if (!codigoProduto.trim()) return;

    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await ProdutoService.verificarProduto(
        Number(codigoProduto)
      );
      setProduto(response);

      // Normaliza o endereço para verificação (remove pontos)
      const enderecoFormatado = (response.endereco || "")
        .trim()
        .replaceAll(".", "");

      setLoading(false);
      setStep(2); // Avança visualmente para o passo 2
      showToast("Produto encontrado com sucesso", "success");

      // LÓGICA ESPECIAL PARA 11111 e 22222
      if (
        (enderecoFormatado.includes("11111") ||
          enderecoFormatado.includes("22222")) &&
        response.qt_estoque <= 0
      ) {
        console.log(
          "Endereço especial detectado, pulando validação endereço antigo e contador..."
        );

        // Configura o estado para pular direto para o final do fluxo
        setEnderecoAtual(response.endereco); // Preenche visualmente
        setEnderecoAtualValido(true); // Valida automaticamente

        // Se precisar pular também a contagem, abre direto o Modal de Endereço Novo
        // Pequeno timeout para garantir que o estado atualizou
        setTimeout(() => {
          setModalEnderecoVisible(true);
        }, 300);

        return response;
      } else if (
        (enderecoFormatado.includes("11111") ||
          enderecoFormatado.includes("22222")) &&
        response.qt_estoque > 0
      ) {
        console.log(
          "Endereço especial detectado, pulando validação endereço antigo..."
        );

        // Configura o estado para pular direto para o final do fluxo
        setEnderecoAtual(response.endereco); // Preenche visualmente
        setEnderecoAtualValido(true); // Valida automaticamente

        // Se precisar pular também a contagem, abre direto o Modal de Endereço Novo
        // Pequeno timeout para garantir que o estado atualizou
        setTimeout(() => {
          setModalVisible(true);
        }, 300);

        return response;
      }

      // Fluxo normal continua aqui (usuário terá que bipar o endereço antigo)
      return response;
    } catch (error) {
      setLoading(false);
      console.log(error);
      showToast("Produto não encontrado ou não existe", "error");
    }
  };

  // app/enderecamento/index.tsx

  const handleVerificarEndereco = async () => {
    console.log("Verificando endereço ", enderecoAtual);
    const input = enderecoAtual.trim();
    if (!input) return;

    Keyboard.dismiss();
    setLoading(true);

    try {
      if (!produto) return;

      // REMOVIDO: A checagem hardcoded antiga (1.11.11...) se não for mais necessária,
      // ou pode mantê-la como um caso especial antes.

      // Regex para verificar se é apenas número (até 5 dígitos)
      const isCodigoNumerico = /^\d{1,5}$/.test(input);

      // Verifica se começa com letra (indica formato de endereço LETRA.NUMERO...)
      // O regex /^[a-zA-Z]/ cobre tanto "A.1.2..." quanto "A12..."
      const isFormatoEndereco = /^[a-zA-Z]/.test(input);

      if (isFormatoEndereco) {
        console.log("Endereço é formato LETRA.NUMERO...");
        // Normaliza removendo pontos para comparação
        const inputLimpo = input.replaceAll(/\./g, "").toUpperCase();
        // Assume que produto.endereco já vem sem pontos, conforme relatado
        const produtoEnderecoLimpo = (produto.endereco || "")
          .replaceAll(/\./g, "")
          .toUpperCase();

        if (inputLimpo === produtoEnderecoLimpo) {
          // Sucesso: O endereço digtado bate com o do produto
          setEnderecoAtualValido(true);
          // Opcional: Atualizar o input para o formato "oficial" ou manter o digitado
          setEnderecoAtual(produto.endereco);
          setLoading(false);
          setModalVisible(true);
          return produto.endereco;
        } else {
          // Falha: Endereço digitado não confere
          setLoading(false);
          showToast("Endereço não confere com o produto.", "error");
          return;
        }
      }

      if (isCodigoNumerico) {
        console.log("Endereço é formato NUMERO...");
        // Fluxo original para códigos numéricos curtos
        // Chama o serviço convertendo para Number
        const response = await ProdutoService.verificarEndereco(
          Number(input),
          produto.cd_produto
        );

        if (response.status === false) {
          setLoading(false);
          showToast("Endereço não encontrado ou não existe", "error");
          return;
        }

        setEnderecoAtualValido(response.status);
        setEnderecoAtual(response.endereco);
        setLoading(false);
        setModalVisible(true);
        return response.endereco; // Retorna o endereço vindo da API
      }

      // Caso não caia em nenhum dos ifs acima (ex: digitou algo inválido)
      setLoading(false);
      showToast("Formato de endereço inválido.", "error");
    } catch (error) {
      setLoading(false);
      console.log(error);
      showToast("Erro ao verificar endereço", "error");
    }
  };

  const resetFlow = () => {
    setStep(1);
    setCodigoProduto("");
    setNovoEndereco("");
    setLoading(false);
    setEnderecoAtual("");
    setEnderecoAtualValido(false);
    setProduto(undefined);
    setQuantidadeContada(0);
    setModalEnderecoVisible(false);
  };

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [quantidadeContada, setQuantidadeContada] = useState(0);
  const [quantidadeManual, setQuantidadeManual] = useState("");
  const [valorModalInput, setValorModalInput] = useState("");

  // Modal Endereco State
  const [modalEnderecoVisible, setModalEnderecoVisible] = useState(false);

  // Tela de acesso negado
  if (!temPermissao) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
          <Text style={styles.unauthorizedTitle}>Acesso Negado</Text>
          <Text style={styles.unauthorizedText}>
            Você não tem permissão para acessar o módulo de Endereçamento.
          </Text>
          <Button
            title="Voltar"
            onPress={() => router.back()}
            variant="outline"
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleCloseModalEndereco = () => {
    setModalEnderecoVisible(false);
    setNovoEndereco("");
  };

  const handleFinalizarFluxo = async () => {
    if (!novoEndereco.trim()) {
      showToast("Por favor, informe o novo endereço.", "warning");
      return;
    }

    if (!produto?.cd_produto) {
      showToast("Produto não encontrado ou não existe", "error");
      return;
    }

    if (novoEndereco === produto.endereco) {
      showToast("Novo endereço não pode ser o mesmo do produto", "warning");
      return;
    }

    // 1. Definição do endereço final (padrão é o que foi digitado/bipado)
    let enderecoFinalParaSalvar = novoEndereco.trim();

    // 2. Verifica se é um código numérico curto (1 a 5 dígitos)
    // Se for, precisamos buscar o endereço real na API
    const isCodigoNumerico = /^\d{1,5}$/.test(enderecoFinalParaSalvar);

    try {
      if (isCodigoNumerico) {
        console.log("Detectado código numérico, buscando endereço...");
        const enderecoResponse = await ProdutoService.verificarEndereco(
          Number(enderecoFinalParaSalvar),
          produto.cd_produto
        );

        if (enderecoResponse.endereco === produto.endereco) {
          showToast("Novo endereço não pode ser o mesmo do produto", "warning");
          return;
        }

        console.log("Endereço Response:", enderecoResponse);

        if (!enderecoResponse.endereco) {
          showToast("Endereço (código) não encontrado ou não existe", "error");
          return;
        }

        enderecoFinalParaSalvar = enderecoResponse.endereco;
      }

      // 3. Normaliza removendo pontos para salvar (formato do backend)
      // Se não era código numérico, assume que é o endereço formatado (ex: A.01...)
      const enderecoSemPontos = enderecoFinalParaSalvar
        .replaceAll(".", "")
        .toUpperCase();

      setLoading(true);
      const output = await ProdutoService.alterarEndereco(
        produto?.cd_produto,
        enderecoSemPontos
      );

      handleCloseModalEndereco();
      showToast(
        `Sucesso: Endereço alterado para ${enderecoSemPontos}`,
        "success"
      );
      resetFlow();
    } catch (error) {
      console.log(error);
      showToast(`Erro ao alterar endereço: ${error}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setQuantidadeContada(0);
    setQuantidadeManual("");
    setValorModalInput("");
  };

  const handleConfirmarQuantidade = () => {
    console.log("Quantidade confirmada:", quantidadeContada);
    handleCloseModal();
    // Abre o próximo modal para validar o endereço novo
    setTimeout(() => {
      setModalEnderecoVisible(true);
    }, 200);
  };

  const handleModalSubmit = () => {
    // Lógica simples de incremento para teste

    if (!valorModalInput || !produto?.cod_barras.includes(valorModalInput)) {
      showToast(
        "Código bipado não confere com o produto selecionado!",
        "error"
      );
      return;
    }
    setQuantidadeContada((prev) => prev + 1);
    setValorModalInput("");
  };

  const handleAdicionarQuantidade = (qtd: number) => {
    setQuantidadeContada((prev) => prev + qtd);
    setQuantidadeManual("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header */}
            <HeaderEnderecamento onReset={resetFlow} />

            <ScrollView contentContainerStyle={styles.content}>
              {/* Instruções / Steps */}
              <Steps step={step} />

              <Card style={styles.formCard}>
                <CardContent style={styles.cardContent}>
                  {/* Passo 1: Produto */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Produto</Text>
                    <Input
                      placeholder="Bipe ou digite o código do produto"
                      value={codigoProduto}
                      onChangeText={setCodigoProduto}
                      autoFocus={step === 1}
                      editable={step === 1 && !loading}
                      onSubmitEditing={handleVerificarProduto}
                      returnKeyType="next"
                      leftIcon={
                        <Ionicons
                          name="cube-outline"
                          size={20}
                          color={Colors.textSecondary}
                        />
                      }
                    />
                  </View>

                  {/* Passo 2: Endereço (Visível mas desabilitado inicialmente) */}
                  <View
                    style={[styles.inputGroup, step === 1 && { opacity: 0.5 }]}
                  >
                    <Text style={styles.label}>Endereço Atual</Text>
                    <Input
                      placeholder="Bipe ou digite o endereço atual"
                      value={enderecoAtual}
                      onChangeText={setEnderecoAtual}
                      editable={step === 2 && !loading}
                      onSubmitEditing={handleVerificarEndereco}
                      returnKeyType="done"
                      leftIcon={
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={Colors.textSecondary}
                        />
                      }
                    />
                  </View>

                  {/* Botão de Ação */}
                  <View style={styles.buttonContainer}>
                    {step === 1 ? (
                      <Button
                        title="Verificar Produto"
                        onPress={handleVerificarProduto}
                        disabled={!codigoProduto.trim() || loading}
                        loading={loading}
                      />
                    ) : (
                      <Button
                        title="Verificar Endereço"
                        onPress={handleVerificarEndereco}
                        disabled={!enderecoAtual.trim() || loading}
                        loading={loading}
                      />
                    )}
                  </View>
                </CardContent>
              </Card>

              {/* Informações Auxiliares (Placeholder) */}
              {step === 2 && produto && (
                <View style={styles.infoContainer}>
                  <Text style={styles.infoTitle}>Produto Selecionado:</Text>
                  <Text style={styles.infoText}>
                    N° Fab: {produto.cd_fabrica}
                  </Text>
                  <Text style={styles.infoText}>{produto.endereco}</Text>
                  <Text style={styles.infoText}>QTD: {produto.qt_estoque}</Text>
                  <Text style={styles.infoText}>{produto.no_produto}</Text>
                </View>
              )}
              {step === 2 && enderecoAtualValido && (
                <View style={styles.infoContainer}>
                  <Text style={styles.infoTitle}>Endereço Atual:</Text>
                  <Text style={styles.infoText}>{enderecoAtual}</Text>
                </View>
              )}
            </ScrollView>

            <ModalContador
              visible={modalVisible}
              produtoAtual={
                produto
                  ? {
                      ...produto,
                      id: produto.cd_produto,
                      descricao: produto.no_produto,
                      codigoFabrica: produto.cd_fabrica,
                      quantidade: produto.qt_estoque, // Mock quantity for now
                      endereco: enderecoAtual,
                      codigoBarras: produto.cod_barras,
                      idEndereco: "",
                      // Fields required by Siac Produto type
                      cdProduto: produto.cd_produto,
                      quantidadeLida: 0,
                      concluido: false,
                      bipado: false,
                      item: "1",
                    }
                  : null
              }
              quantidadeContada={quantidadeContada}
              quantidadeManual={quantidadeManual}
              valorModalInput={valorModalInput}
              onCancelar={handleCloseModal}
              onConfirmar={handleConfirmarQuantidade}
              onModalInputChange={setValorModalInput}
              onModalSubmit={handleModalSubmit}
              onQuantidadeManualChange={setQuantidadeManual}
              onAdicionarQuantidade={handleAdicionarQuantidade}
              setErro={(erro: string) => showToast(erro, "error")}
            />

            <ModalEndereco
              visible={modalEnderecoVisible}
              produtoAtual={
                produto
                  ? {
                      ...produto,
                      id: produto.cd_produto,
                      descricao: produto.no_produto,
                      codigoFabrica: produto.cd_fabrica,
                      quantidade: quantidadeContada, // Use counted quantity
                      endereco: enderecoAtual,
                      codigoBarras: produto.cod_barras,
                      idEndereco: "",
                      cdProduto: produto.cd_produto,
                      quantidadeLida: quantidadeContada,
                      concluido: false,
                      bipado: false,
                      item: "1",
                    }
                  : null
              }
              valorEnderecoInput={novoEndereco}
              onCancelar={handleCloseModalEndereco}
              onConfirmar={handleFinalizarFluxo}
              onEnderecoInputChange={setNovoEndereco}
              onEnderecoSubmit={handleFinalizarFluxo}
            />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  content: {
    padding: 20,
  },

  formCard: {
    marginBottom: 20,
  },
  cardContent: {
    gap: 20,
    padding: 16,
  },
  inputGroup: {
    paddingTop: 10,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
    marginLeft: 4,
  },
  buttonContainer: {
    marginTop: 8,
  },
  infoContainer: {
    padding: 16,
    backgroundColor: "#e0f2fe",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0369a1",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 16,
    color: "#0c4a6e",
    marginBottom: 8,
    textAlign: "center",
  },
  infoSubtext: {
    fontSize: 12,
    color: "#0c4a6e",
    fontStyle: "italic",
  },
  
  // Acesso negado
  unauthorizedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  unauthorizedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  unauthorizedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});
