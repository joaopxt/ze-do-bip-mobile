---
name: Fluxo Ciclo Vida App
overview: Documentação completa do ciclo de vida da aplicação Zé do Bip, incluindo fluxos de navegação, alimentação de dados, triggers e arquivos obsoletos.
todos: []
---

# Ciclo de Vida da Aplicação Zé do Bip

## 1. Arquitetura Geral

A aplicação usa **Expo Router** para navegação baseada em arquivos e **Zustand** para gerenciamento de estado global com persistência via **AsyncStorage**.

### Stack Tecnológico

- **React Native 0.79** + **Expo 53**
- **Zustand 5** (estado global com middleware persist)
- **expo-secure-store** (dados sensíveis como tokens)
- **AsyncStorage** (persistência de guardas e estado)

---

## 2. Fluxo de Inicialização do App

```
App Inicia
    |
    v
[_layout.tsx] - Configura Stack Navigator
    |
    v
[index.tsx] - Tela de Redirect
    |
    +-- useEffect chama recuperarSessao()
    |       |
    |       v
    |   [AuthService.recuperarSessao()]
    |       |
    |       +-- SecureStore.getItemAsync(token)
    |       +-- SecureStore.getItemAsync(userData)
    |       +-- AuthService.validarToken(token) via API
    |       |
    |       v
    +-- Se sessao valida:
    |       |
    |       v
    |   [appStore.carregarGuardas()]
    |       |
    |       v
    |   Redirect para /home
    |
    +-- Se sessao invalida/expirada:
            |
            v
        Redirect para /login
```

---

## 3. Fluxo de Login

```
[login.tsx]
    |
    v
Usuario digita cd_usuario + senha
    |
    v
Clica "Entrar"
    |
    v
[appStore.login()]
    |
    +-- [AuthService.gerarHashSenha(senha)]
    |       POST /auth/hash
    |
    +-- [AuthService.autenticarSiac(cd_usuario, senha_hash)]
    |       POST /auth/siac
    |       Retorna: token + nome do usuario
    |
    +-- [AuthService.salvarSessao()]
    |       SecureStore: USER_TOKEN + USER_DATA
    |
    +-- [appStore.carregarGuardas()]
    |       |
    |       v
    |   [refreshGuardas()] -> [GuardaService.listarGuardas()]
    |       GET /guardas?cd_usuario=XXX
    |
    v
router.replace('/home')
```

---

## 4. Fluxo da Tela Home

### 4.1 Carregamento Inicial

```
[home.tsx] monta
    |
    v
useAppStore() - Acessa estado global:
    - guardasDisponiveis
    - guardasAssumidas
    - guardasFinalizadas
    - usuario
    |
    v
Renderiza listas de guardas
```

### 4.2 Triggers na Home

| Trigger | Acao | Fluxo |

|---------|------|-------|

| **Pull-to-refresh** | `handleRefresh()` | Chama `refreshGuardas()` que sincroniza com API |

| **Auto-refresh 30s** | `setInterval` | Chama `refreshGuardas()` silenciosamente |

| **Assumir Guarda** | `handleAssumirGuarda()` | Alert confirma -> `assumirGuarda(guardaId)` |

| **Escanear** | Botao na guarda ativa | `router.push(/leitura/[guardaId])` |

| **Logout** | Botao "Sair" | Alert confirma -> `logout()` -> redirect /login |

### 4.3 Assumir Guarda - Fluxo Detalhado

```
[assumirGuarda(guardaId)]
    |
    +-- Verifica se ja assumindo (prevenir duplicatas)
    |
    +-- Busca guarda em guardasDisponiveis
    |
    +-- [ApiService.iniciarGuarda(guardaId)]
    |       POST /guardas/{sq_guarda}/iniciar
    |
    +-- [GuardaService.obterDetalhesGuarda(guardaId)]
    |       GET /guardas/{sq_guarda}
    |       Retorna produtos da guarda
    |
    +-- Atualiza estado:
    |       - Remove de guardasDisponiveis
    |       - Adiciona em guardasAssumidas
    |       - Define como guardaAtiva
    |
    v
Guarda aparece na secao "Guardas Ativas"
```

---

## 5. Fluxo de Leitura de Produtos

### 5.1 Entrada na Tela

```
[leitura/[guardaId].tsx]
    |
    v
[LeituraInterface] monta
    |
    +-- useLocalSearchParams() - obtem guardaId da URL
    |
    +-- carregarDetalhesGuarda()
    |       |
    |       +-- Busca em guardasAssumidas local
    |       |
    |       +-- Se nao tem produtos:
    |               [obterDetalhesGuarda(guardaId)]
    |               GET /guardas/{sq_guarda}
    |
    v
Renderiza lista de produtos com scanner input
```

### 5.2 Fluxo de Bipagem (Scanner USB)

```
Scanner le codigo de barras
    |
    v
[useScannerInput] hook
    |
    +-- handleInputChange() - acumula caracteres
    +-- Scanner envia Enter automaticamente
    +-- handleSubmitManual() - processa codigo
    |
    v
[processarCodigoCompleto(codigo)]
    |
    v
[CodigoProcessorService.identificarCodigo()]
    |
    +-- Busca produto por:
    |       - codigoBarras[] (array)
    |       - codigoFabrica
    |       - cdProduto
    |       - idEndereco
    |
    +-- Ou busca endereco (QR Code)
    |
    v
Se PRODUTO encontrado:
    |
    +-- [abrirModalContador(produto)]
    |       - Modal para contar quantidade
    |       - Cada bip incrementa contador
    |       - Confirmar quando qtd = esperada
    |
    +-- Se iniciou por PRODUTO:
    |       [abrirModalEndereco()]
    |       - Bipar endereco para confirmar
    |
    +-- [marcarProdutoConcluido(guardaId, produtoId, qtd)]
    |       - Atualiza estado local
    |       - Persiste no AsyncStorage
    |
    v
Produto marcado como concluido na lista

Se ENDERECO encontrado:
    |
    +-- [setEnderecoFiltro(endereco)]
    |       - Filtra lista para mostrar so produtos deste endereco
    |
    v
Usuario bipa produtos do endereco
```

### 5.3 Finalizacao da Guarda

```
Todos produtos concluidos (progresso = 100%)
    |
    v
Botao "Finalizar Guarda" aparece
    |
    v
[handleFinalizarGuarda()]
    |
    +-- Valida guarda via API
    +-- Alert confirma
    |
    +-- [finalizarGuarda(guardaId)]
    |       |
    |       +-- [GuardaService.finalizarGuarda()]
    |               POST /guardas/{sq_guarda}/finalizar
    |       |
    |       +-- Move para guardasFinalizadas
    |       +-- Remove de guardasAssumidas
    |
    v
Alert sucesso -> router.back() para /home
```

---

## 6. Alimentacao de Dados

### 6.1 Fonte de Dados

| Dado | Origem | Persistencia |

|------|--------|--------------|

| **Usuario/Token** | API /auth/siac | SecureStore (criptografado) |

| **Lista Guardas** | API /guardas | AsyncStorage (via Zustand persist) |

| **Detalhes Guarda** | API /guardas/{id} | AsyncStorage (guardas assumidas) |

| **Progresso Leitura** | Local | AsyncStorage (dentro da guarda) |

### 6.2 Sincronizacao com API

A aplicacao prioriza **storage local** sobre API devido a delay de ate 2.5min da API:

```
[refreshGuardas()]
    |
    +-- Carrega guardas da API
    |
    +-- Para cada guarda local:
    |       |
    |       +-- Se iniciada ha < 3min: MANTER LOCAL
    |       +-- Se iniciada ha > 3min:
    |               +-- Verifica se existe na API
    |               +-- Se API diz cancelada: REMOVER
    |               +-- Se API confirma: MANTER
    |
    +-- Protecao anti-duplicacao:
    |       - Nao mostrar como disponivel se esta ativa
    |       - Nao mostrar como ativa se foi finalizada
    |
    v
Estado sincronizado
```

### 6.3 Endpoints da API

| Endpoint | Metodo | Descricao |

|----------|--------|-----------|

| `/auth/hash` | POST | Gera hash da senha |

| `/auth/siac` | POST | Autenticacao no SIAC |

| `/auth/validate` | POST | Valida token |

| `/guardas?cd_usuario=X` | GET | Lista guardas do usuario |

| `/guardas/{sq_guarda}` | GET | Detalhes + produtos |

| `/guardas/{sq_guarda}/iniciar` | POST | Inicia guarda |

| `/guardas/{sq_guarda}/finalizar` | POST | Finaliza guarda |

| `/health` | GET | Teste conectividade |

---

## 7. Mapa de Arquivos e Responsabilidades

### 7.1 Arquivos Ativos e Essenciais

| Arquivo | Responsabilidade |

|---------|-----------------|

| [`app/_layout.tsx`](app/_layout.tsx) | Stack Navigator principal |

| [`app/index.tsx`](app/index.tsx) | Redirect baseado em autenticacao |

| [`app/login.tsx`](app/login.tsx) | Tela de login |

| [`app/home.tsx`](app/home.tsx) | Lista de guardas |

| [`app/leitura/[guardaId].tsx`](app/leitura/[guardaId].tsx) | Rota dinamica de leitura |

| [`components/LeituraInterface.tsx`](components/LeituraInterface.tsx) | Interface completa de bipagem |

| [`store/appStore.ts`](store/appStore.ts) | Estado global Zustand |

| [`services/ApiService.ts`](services/ApiService.ts) | Gateway de comunicacao API |

| [`services/AuthService.ts`](services/AuthService.ts) | Autenticacao e tokens |

| [`services/GuardaService.ts`](services/GuardaService.ts) | Orquestrador de guardas |

| [`services/CodigoProcessorService.ts`](services/CodigoProcessorService.ts) | Identificacao de codigos |

| [`hooks/useScannerInput.ts`](hooks/useScannerInput.ts) | Hook para scanner USB |

| [`types/siac.ts`](types/siac.ts) | Tipos TypeScript |

| [`constants/Environment.ts`](constants/Environment.ts) | Configuracao de ambientes |

| [`constants/Colors.ts`](constants/Colors.ts) | Tema visual |

### 7.2 Arquivos Potencialmente Obsoletos

| Arquivo | Motivo | Recomendacao |

|---------|--------|--------------|

| [`services/OfflineService.ts`](services/OfflineService.ts) | Fallback minimo, retorna lista vazia. Nunca usado de verdade pois app requer conexao | **Avaliar remocao** ou expandir para cache real |

| [`hooks/useColorScheme.ts`](hooks/useColorScheme.ts) | Hook padrao do Expo, app nao usa dark mode | **Avaliar remocao** |

| [`hooks/useColorScheme.web.ts`](hooks/useColorScheme.web.ts) | Web nao e plataforma alvo | **Avaliar remocao** |

| [`hooks/useThemeColor.ts`](hooks/useThemeColor.ts) | Hook padrao do Expo, nao usado | **Avaliar remocao** |

| [`app/leitura/types.ts`](app/leitura/types.ts) | Tipos locais que poderiam estar em types/siac.ts | **Mover para types/** |

### 7.3 Componentes de Leitura (Subpasta)

| Arquivo | Usado |

|---------|-------|

| [`app/leitura/_components/GuardaHeader.tsx`](app/leitura/_components/GuardaHeader.tsx) | Sim - Header da guarda |

| [`app/leitura/_components/ListaProdutos.tsx`](app/leitura/_components/ListaProdutos.tsx) | Sim - Lista de produtos |

| [`app/leitura/_components/ItemProduto.tsx`](app/leitura/_components/ItemProduto.tsx) | Sim - Card de produto |

| [`app/leitura/_components/ScannerInput.tsx`](app/leitura/_components/ScannerInput.tsx) | Sim - Input do scanner |

| [`app/leitura/_components/ModalContador.tsx`](app/leitura/_components/ModalContador.tsx) | Sim - Modal de contagem |

| [`app/leitura/_components/ModalEndereco.tsx`](app/leitura/_components/ModalEndereco.tsx) | Sim - Modal endereco |

| [`app/leitura/_components/FiltroEndereco.tsx`](app/leitura/_components/FiltroEndereco.tsx) | **Verificar** - Pode nao estar em uso |

---

## 8. Diagrama de Estado da Guarda

```
                    [DISPONIVEL]
                         |
            assumirGuarda() + POST /iniciar
                         |
                         v
                    [EM_ANDAMENTO]
                    /           \
           (local)              (API confirma)
          iniciadaLocalmente    status: 'Iniciado'
                    \           /
                     \         /
                      v       v
                    [Leitura de Produtos]
                         |
            finalizarGuarda() + POST /finalizar
                         |
                         v
                    [FINALIZADA]
```

---

## 9. Resumo dos Triggers

| Tela | Trigger | Acao |

|------|---------|------|

| **Index** | Mount | recuperarSessao() -> redirect |

| **Login** | Submit | login() -> carregarGuardas() -> /home |

| **Home** | Pull refresh | refreshGuardas() |

| **Home** | 30s interval | refreshGuardas() |

| **Home** | Assumir | assumirGuarda() |

| **Home** | Escanear | navigate /leitura/{id} |

| **Home** | Logout | logout() -> /login |

| **Leitura** | Mount | carregarDetalhesGuarda() |

| **Leitura** | Scanner Enter | processarCodigoCompleto() |

| **Leitura** | Modal confirmar | marcarProdutoConcluido() |

| **Leitura** | Finalizar | finalizarGuarda() -> /home |

| **Leitura** | Back button | onVoltar() ou cancel modal |

---

Este documento serve como referencia para entender o funcionamento completo da aplicacao Zé do Bip.