/**
 * Tela de Login - Zé do Bip
 * Autenticação com ze-backend usando JWT
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function LoginScreen() {
  const [cd_usuario, setCdUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const { login, logoutAll } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  // Forçar logout de todas as sessões antes de fazer novo login
  const handleForceLogin = async () => {
    try {
      setCarregando(true);

      // Primeiro faz logout de todas as sessões
      const tryLogout = await logoutAll(cd_usuario.trim());

      if (!tryLogout) {
        showToast(
          "Falha ao desconectar outras sessões. Verifique sua senha ou conexão.",
          "error"
        );
        // Se falhar o logout, não impede login? O usuário quer "Desconectar e Entrar".
        // Se falhar desconexão, talvez não devesse logar.
        // Mas vamos manter a lógica de bloquear o return se falhar.
        return;
      }

      // Depois tenta login novamente
      const sucesso = await login({ cd_usuario: cd_usuario.trim(), senha });

      if (sucesso) {
        setCdUsuario("");
        setSenha("");
        router.replace("/home");
      } else {
        showToast(
          "Falha ao fazer login após desconectar outras sessões",
          "error"
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado";
      showToast(errorMessage, "error");
    } finally {
      setCarregando(false);
    }
  };

  const handleLogin = async () => {
    if (!cd_usuario.trim() || !senha.trim()) {
      showToast("Por favor, preencha todos os campos", "warning");
      return;
    }

    try {
      setCarregando(true);

      const sucesso = await login({ cd_usuario: cd_usuario.trim(), senha });

      if (sucesso) {
        // Login bem-sucedido - navegar para home
        setCdUsuario("");
        setSenha("");
        router.replace("/home");
      } else {
        showToast("Usuário ou senha inválidos", "error");
      }
    } catch (error) {
      // Tratar mensagens de erro específicas
      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado";

      if (errorMessage.includes("já está logado")) {
        // Usuário já está logado em outro dispositivo
        Alert.alert(
          "Sessão Ativa",
          "Você já está logado em outro dispositivo. Deseja desconectar as outras sessões e continuar?",
          [
            {
              text: "Cancelar",
              style: "cancel",
            },
            {
              text: "Desconectar e Entrar",
              style: "destructive",
              onPress: handleForceLogin,
            },
          ]
        );
      } else if (errorMessage.includes("Usuário ou senha inválidos")) {
        showToast("Usuário ou senha inválidos", "error");
      } else if (errorMessage.includes("Verifique sua conexão")) {
        showToast(
          "Verifique sua conexão com a internet e tente novamente",
          "error"
        );
      } else {
        showToast("Erro na autenticação. Tente novamente.", "error");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>Zé do Bip - Galpão</Text>
        <Text style={styles.loginSubtitle}>Sistema de Guardas</Text>

        <View style={styles.loginForm}>
          <Input
            placeholder="Código do Usuário"
            value={cd_usuario}
            onChangeText={setCdUsuario}
            style={styles.loginInput}
            keyboardType="numeric"
            editable={!carregando}
          />
          <Input
            placeholder="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            style={styles.loginInput}
            editable={!carregando}
          />
          <Button
            title={carregando ? "Autenticando..." : "Entrar"}
            onPress={handleLogin}
            style={carregando ? styles.loginButtonLoading : styles.loginButton}
            disabled={carregando}
          />

          {carregando && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Autenticando...</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
    textAlign: "center",
  },
  loginForm: {
    width: "100%",
    maxWidth: 300,
    gap: 16,
  },
  loginInput: {
    marginBottom: 16,
  },
  loginButton: {
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonLoading: {
    marginTop: 8,
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
