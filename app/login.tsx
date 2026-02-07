/**
 * Tela de Login - Zé da Entrega
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

  const handleForceLogin = async () => {
    try {
      setCarregando(true);

      const tryLogout = await logoutAll(cd_usuario.trim());

      if (!tryLogout) {
        showToast(
          "Falha ao desconectar outras sessões. Verifique sua senha ou conexão.",
          "error"
        );
        return;
      }

      const sucesso = await login({ cd_usuario: cd_usuario.trim(), senha });

      if (sucesso) {
        setCdUsuario("");
        setSenha("");
        router.replace("/(app)/carga");
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
        setCdUsuario("");
        setSenha("");
        router.replace("/(app)/carga");
      } else {
        showToast("Usuário ou senha inválidos", "error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro inesperado";

      if (errorMessage.includes("já está logado")) {
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
        {/* Header com identidade visual */}
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>GRUPO BUENO</Text>
        </View>

        <Text style={styles.loginTitle}>Zé da Entrega</Text>
        <Text style={styles.loginSubtitle}>Sistema de Entregas e Coletas</Text>

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

        {/* Versão */}
        <Text style={styles.versionText}>v1.0.0</Text>
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
  headerBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  headerBadgeText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary,
    marginBottom: 4,
  },
  loginSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
    textAlign: "center",
  },
  loginForm: {
    width: "100%",
    maxWidth: 320,
    gap: 16,
  },
  loginInput: {
    marginBottom: 4,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
  },
  loginButtonLoading: {
    marginTop: 8,
    opacity: 0.6,
    backgroundColor: Colors.primary,
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
  versionText: {
    position: "absolute",
    bottom: 20,
    fontSize: 12,
    color: Colors.gray[400],
  },
});
