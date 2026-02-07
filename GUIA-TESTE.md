# 🚚 Zé da Entrega — Guia de Teste Local

## Pré-requisitos
- Node.js v18+ (você tem v22 ✅)
- npm 9+ (você tem 10.9 ✅)
- App **Expo Go** no celular Android (Play Store)
- Mac e celular no **mesmo WiFi**

---

## 🚀 Passo a Passo

### 1. Abrir Terminal no projeto
```bash
cd ~/Desktop/ze-da-entrega-mobile
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Rodar o Expo
```bash
npx expo start
```

Um QR Code vai aparecer no terminal.

### 4. Conectar o celular
- Abra o app **Expo Go** no Android
- Escaneie o QR Code
- O app carrega no celular!

---

## 📋 Roteiro de Teste (DEV_MODE)

O app roda com **dados fictícios** — não precisa de backend.

### Login
- User: qualquer coisa (ex: `teste`)
- Senha: qualquer coisa (ex: `123`)
- DEV_MODE aceita qualquer credencial

### Tela Carga (após login)
1. Clique **"Buscar Nova Rota"**
2. Mock carrega: 5 volumes na carga
3. Clique **"Iniciar Carga"**
4. **Bipe os volumes** digitando no campo:
   - `VOL001` → Enter
   - `VOL002` → Enter
   - `VOL003` → Enter
   - `VOL004` → Enter
   - `VOL005` → Enter
5. Feedback verde a cada bipagem ✅
6. Barra de progresso enche
7. Clique **"Finalizar Carga"**

### Tela Clientes
- 3 clientes mock aparecem:
  1. Mercado Premium São Paulo
  2. Distribuidora Central da Zona Norte
  3. Comércio e Alimentos Brasil
- Clique em cada um para ver ordens

### Volumes (dentro de cada cliente)
- Bipe os volumes de cada ordem
- Teste marcar como **extraviado** (clique no volume → justificativa obrigatória)
- Finalize cada ordem

### Faltantes
- Acesse via botão na tela de volumes
- Mostra volumes pendentes de resolução

### Sync Up
- Quando todos clientes finalizados, volte à tela Carga
- Card verde aparece: **"Enviar Resultados"**
- Confirme → tela de sucesso
- Botão **"Nova Rota"** reseta tudo

---

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| QR Code não funciona | `npx expo start --tunnel` |
| Metro Bundler travou | `npx expo start --clear` |
| Expo Go não conecta | Verifique se estão no mesmo WiFi |
| Erro de permissão | `sudo chown -R $USER .` |

---

## 📱 Códigos de Barra para Teste

Na carga: `VOL001`, `VOL002`, `VOL003`, `VOL004`, `VOL005`

Nos clientes (por ordem):
- Cliente 1: `VOL001`, `VOL002`, `VOL003`
- Cliente 2: `VOL004`, `VOL005`
- Cliente 3: `VOL001`, `VOL002`, `VOL003`

---

*Zé da Entrega v1.0 — Grupo Bueno*
