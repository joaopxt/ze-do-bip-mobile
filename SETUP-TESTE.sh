#!/bin/bash
# ============================================================
# ZÉ DA ENTREGA — Setup de Teste Local
# Roda o app em DEV_MODE (mock data, sem backend)
# ============================================================

echo "🚚 ZÉ DA ENTREGA — Setup de Teste"
echo "=================================="
echo ""

# 1. Verificar Node
echo "📦 Verificando Node.js..."
node --version || { echo "❌ Node.js não instalado! Instale: brew install node"; exit 1; }
echo ""

# 2. Instalar dependências
echo "📦 Instalando dependências (pode demorar 2-3 min)..."
npm install
echo ""

# 3. Verificar Expo CLI
echo "📦 Verificando Expo CLI..."
if ! command -v expo &> /dev/null; then
  echo "📦 Instalando Expo CLI globalmente..."
  npm install -g expo-cli @expo/ngrok
fi
echo ""

# 4. Limpar cache
echo "🧹 Limpando cache..."
npx expo start --clear --no-dev &
EXPO_PID=$!
sleep 3
kill $EXPO_PID 2>/dev/null
echo ""

echo "✅ Setup completo!"
echo ""
echo "🎯 COMO RODAR:"
echo "  npx expo start"
echo ""
echo "📱 COMO CONECTAR O ANDROID:"
echo "  1. Instale 'Expo Go' no celular (Play Store)"
echo "  2. Conecte celular e Mac no MESMO WiFi"
echo "  3. Escaneie o QR Code que aparece no terminal"
echo ""
echo "🔧 SE USAR CABO USB:"
echo "  npx expo start --localhost"
echo "  (precisa de adb instalado: brew install android-platform-tools)"
echo ""
echo "📋 FLUXO DE TESTE:"
echo "  1. Login: qualquer user/senha (DEV_MODE aceita tudo)"
echo "  2. Tela Carga: clique 'Buscar Nova Rota' → dados mock carregam"
echo "  3. Carga: 'Iniciar Carga' → bipe os 5 volumes (VOL001-VOL005)"
echo "  4. Clientes: navegue pelos 3 clientes mock"
echo "  5. Volumes: bipe volumes de entrega em cada cliente"
echo "  6. Sync Up: quando todos finalizados, envie ao 'servidor'"
echo ""
echo "💡 DEV_MODE: Tudo funciona com mock data, sem backend!"
