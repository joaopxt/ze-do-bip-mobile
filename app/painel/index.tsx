/**
 * Tela Principal do Painel de Controle
 * Módulo para gerenciar roles de usuários
 *
 * Features:
 * - Lista de usuários Admin
 * - Lista de usuários Armazenista (10 primeiros)
 * - Busca por código de usuário
 * - Alteração de roles em lote
 */

import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { podeAcessarPainel } from "@/utils/permissoes";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

// Componentes do Painel
import CardBuscaUsuario from "./_components/CardBuscaUsuario";
import CardUsuarios from "./_components/CardUsuarios";
import FooterSalvar from "./_components/FooterSalvar";
import HeaderPainel from "./_components/HeaderPainel";

// Hook do Painel
import { usePainelControle } from "./_hooks/usePainelControle";

export default function PainelScreen() {
  const router = useRouter();
  const { usuario, isLoggedIn } = useAuth();

  // Hook com toda a lógica do painel
  const {
    admins,
    armazenistas,
    adminsCompletos,
    armazenistasCompletos,
    mudancasPendentes,
    resultadoBusca,
    isLoading,
    isSaving,
    isBuscando,
    carregarDados,
    buscarUsuario,
    alterarRole,
    removerRole,
    salvarMudancas,
    limparBusca,
    temMudancasPendentes,
    quantidadeMudancas,
    carregarMaisAdmins,
    carregarMaisArmazenistas,
    temMaisAdmins,
    temMaisArmazenistas,
  } = usePainelControle();

  // Verificar permissão de acesso
  const temPermissao = podeAcessarPainel(usuario);

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  // Tela de acesso negado
  if (!temPermissao) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Ionicons name="lock-closed" size={64} color={Colors.textSecondary} />
          <Text style={styles.unauthorizedTitle}>Acesso Negado</Text>
          <Text style={styles.unauthorizedText}>
            Você não tem permissão para acessar o Painel de Controle.
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com busca */}
      <HeaderPainel onBuscar={buscarUsuario} isBuscando={isBuscando} />

      {/* Conteúdo principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Resultado da busca (se houver) */}
        {resultadoBusca && (
          <CardBuscaUsuario
            nomeUsuario={resultadoBusca.nomeUsuario}
            resultado={resultadoBusca}
            mudancaPendente={mudancasPendentes.get(resultadoBusca.codoper)}
            onRoleChange={alterarRole}
            onFechar={limparBusca}
          />
        )}

        {/* Card de Administradores */}
        <CardUsuarios
          titulo="Administradores"
          icone="shield-checkmark"
          usuarios={admins}
          usuariosCompletos={adminsCompletos}
          mudancasPendentes={mudancasPendentes}
          onRoleChange={alterarRole}
          onRemoveRole={removerRole}
          isLoading={isLoading}
          emptyMessage="Nenhum administrador encontrado"
          iconColor={Colors.warning}
          onCarregarMais={carregarMaisAdmins}
          temMais={temMaisAdmins}
        />

        {/* Card de Armazenistas */}
        <CardUsuarios
          titulo="Armazenistas"
          icone="people"
          usuarios={armazenistas}
          usuariosCompletos={armazenistasCompletos}
          mudancasPendentes={mudancasPendentes}
          onRoleChange={alterarRole}
          onRemoveRole={removerRole}
          isLoading={isLoading}
          emptyMessage="Nenhum armazenista encontrado"
          iconColor={Colors.primary}
          onCarregarMais={carregarMaisArmazenistas}
          temMais={temMaisArmazenistas}
        />

        {/* Espaço extra para o footer fixo */}
        <View style={styles.footerSpacer} />
      </ScrollView>

      {/* Footer fixo com botão Salvar */}
      <FooterSalvar
        quantidadeMudancas={quantidadeMudancas}
        onSalvar={salvarMudancas}
        isSaving={isSaving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Espaço para o footer
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  footerSpacer: {
    height: 80,
  },
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
