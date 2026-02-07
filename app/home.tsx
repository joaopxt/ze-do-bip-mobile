/**
 * Tela Home - Seleção de Módulos
 * 
 * Permite ao usuário escolher entre os módulos disponíveis:
 * 1. Guardas (Fluxo existente) - Permissão: guarda
 * 2. Endereçamento (Novo módulo) - Permissão: enderecamento
 * 3. Painel de Controle - Permissão: painel
 * 
 * A renderização de cada módulo é condicional baseada nas permissões do usuário.
 */

import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { 
  podeAcessarGuardas, 
  podeAcessarEnderecamento, 
  podeAcessarPainel 
} from "@/utils/permissoes";

export default function HomeScreen() {
  const router = useRouter();
  const { usuario, logout, isLoggedIn } = useAuth();

  // Verificar permissões do usuário
  const temAcessoGuardas = podeAcessarGuardas(usuario);
  const temAcessoEnderecamento = podeAcessarEnderecamento(usuario);
  const temAcessoPainel = podeAcessarPainel(usuario);
  const temAlgumaPermissao = temAcessoGuardas || temAcessoEnderecamento || temAcessoPainel;

  // Observar logout e redirecionar para login
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoggedIn, router]);

  const handleLogout = () => {
    Alert.alert("Confirmar Logout", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
          <Text style={styles.role}>Selecione um módulo</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.modulesContainer}>
        {/* Mensagem se usuário não tem nenhuma permissão */}
        {!temAlgumaPermissao && (
          <View style={styles.noPermissionContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.noPermissionTitle}>Sem Permissões</Text>
            <Text style={styles.noPermissionText}>
              Você não possui permissão para acessar nenhum módulo.{'\n'}
              Entre em contato com o administrador.
            </Text>
          </View>
        )}

        {/* Módulo de Guardas */}
        {temAcessoGuardas && (
          <TouchableOpacity 
            style={styles.moduleCard} 
            onPress={() => router.push("/guardas" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
              <Ionicons name="clipboard-outline" size={32} color={Colors.primary} />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Guardas</Text>
              <Text style={styles.moduleDescription}>
                Recebimento, conferência e organização de cargas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Módulo de Endereçamento */}
        {temAcessoEnderecamento && (
          <TouchableOpacity 
            style={styles.moduleCard} 
            onPress={() => router.push("/enderecamento" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="location-outline" size={32} color="#16a34a" />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Endereçamento</Text>
              <Text style={styles.moduleDescription}>
                Mover produtos e atualizar endereços de estoque
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Módulo de Painel de Controle */}
        {temAcessoPainel && (
          <TouchableOpacity 
            style={styles.moduleCard} 
            onPress={() => router.push("/painel" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="settings-outline" size={32} color={Colors.warning} />
            </View>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleTitle}>Painel de Controle</Text>
              <Text style={styles.moduleDescription}>
                Gerenciar permissões e níveis de acesso dos usuários
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.version}>Zé do Bip v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  role: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  modulesContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  version: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
