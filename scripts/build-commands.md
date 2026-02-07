# 🚀 **COMANDOS DE BUILD POR AMBIENTE**

## 📋 **Resumo dos Ambientes**

| Ambiente | Descrição | API URL | Debug | Uso |
|----------|-----------|---------|-------|-----|
| `development` | Desenvolvimento local | API de teste | ✅ | Desenvolvimento local |
| `test` | Teste | API de teste | ✅ | Builds para teste |
| `staging` | Homologação | API de staging | ❌ | Testes finais |
| `production` | Produção | API de produção | ❌ | Lançamento oficial |

---

## 🛠️ **Comandos EAS Build**

### **Development (APK para desenvolvimento)**
```bash
# Build development com debug habilitado
eas build --platform android --profile development

# Para testar localmente
npx expo run:android
```

### **Test (APK para testes)**
```bash
# Build test com API de teste
eas build --platform android --profile test
```

### **Staging (APK para homologação)**
```bash
# Build staging com API de homologação
eas build --platform android --profile staging
```

### **Production (AAB para Play Store)**
```bash
# Build production para lançamento
eas build --platform android --profile production
```

---

## 🔧 **Configurações Específicas**

### **Para trocar ambiente sem rebuild:**
1. Editar `app.json`:
```json
{
  "expo": {
    "extra": {
      "environment": "production"  // Alterar aqui
    }
  }
}
```

2. Reiniciar o app:
```bash
npx expo start --clear
```

### **Para usar configs específicas:**
```bash
# Copiar config específica
cp app-configs/app-production.json app.json

# Ou usar via build
EXPO_PUBLIC_ENVIRONMENT=production eas build --platform android --profile production
```

---

## 📱 **Instalação e Teste**

### **APK Development/Test:**
```bash
# Baixar e instalar APK
adb install -r caminho/para/app.apk

# Ver logs em tempo real
adb logcat | grep "ReactNativeJS"
```

### **AAB Production:**
```bash
# Upload para Play Console
# Seguir processo normal de upload na Play Store
```

---

## 🔍 **Debug e Validação**

### **Verificar ambiente atual:**
No app, nas configurações ou logs, você verá:
```
[ENV] Ambiente definido via app.json: production
[API] Configurado para ambiente: production
[API] API de Produção: https://api.grupobueno.com.br/api
```

### **Testar conectividade:**
```bash
# Testar API de teste
curl https://teste.kaizenautopecas.com.br/app/api/health

# Testar API de produção (quando disponível)
curl https://api.grupobueno.com.br/api/health
```

---

## ⚠️ **IMPORTANTE**

- **NUNCA** fazer build production com API de teste
- **SEMPRE** validar o ambiente antes do upload
- **CONFIRMAR** URLs nas configurações antes do build
- **TESTAR** conectividade da API antes de lançar

---

*Atualizado em: ${new Date().toLocaleDateString('pt-BR')}*
