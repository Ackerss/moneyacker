# Como instalar (uma vez só, cerca de 15 minutos)

## 1) Planilha + servidor (5 min)

1. Abra **https://sheets.new** e dê o nome **Finanças Acker**.
2. Menu **Extensões → Apps Script**.
3. Apague o que estiver no editor, cole **todo** o conteúdo de `backend/Code.gs` e clique em 💾 **Salvar**.
4. Volte na planilha e recarregue a página (F5). Aparece o menu **💰 Financeiro**.
5. **💰 Financeiro → 1) Configurar planilha.** O Google pede autorização: *Continuar → escolha sua conta → Avançado → Acessar (não seguro) → Permitir*. Isso é normal em script próprio.
6. Vai aparecer o **TOKEN**. Copie e guarde.
7. No Apps Script: **Implantar → Nova implantação → ⚙️ Tipo: App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
   - **Implantar** → copie o **URL do app da Web** (termina em `/exec`).

> Quem não tiver o token não lê nem grava nada. O token é a "senha" da API.

## 2) Publicar o app (3 min)

1. Entre em **https://app.netlify.com/drop** (mesma conta do catálogo).
2. Arraste a pasta **`app`** inteira para a página.
3. Em *Site configuration → Change site name*, use por exemplo `financas-acker` → o endereço fica **https://financas-acker.netlify.app**.

(Se preferir atualização automática como no catálogo, crie um repositório no GitHub e me avise que eu subo os arquivos.)

## 3) No celular (Jacson e Ana, 2 min cada)

1. Abra o link do app → aba **Ajustes**.
2. Cole o **URL do app da Web** e o **token**, escolha quem é você e toque em **Salvar e testar**.
3. Instale na tela inicial:
   - **Android (Chrome):** menu ⋮ → *Instalar app*.
   - **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.

## 4) IA para foto e categorização: Gemini (2 min, recomendado)

1. Abra **https://aistudio.google.com/apikey** → *Criar chave de API* (escolha o projeto que tem os créditos).
2. Na planilha: **💰 Financeiro → Definir chave do Gemini** → cole → depois **Testar Gemini**.

## 5) Bancos e cartões automáticos: Pluggy (3 min)

Você precisa de 3 coisas: **Client ID**, **Client Secret** e os **Item IDs** (um por banco conectado).
- Ficam no painel da Pluggy (*dashboard.pluggy.ai → Applications* e *Items/Conexões*).
- **Atalho:** pergunte ao seu bot Grok: *"me passe o clientId, clientSecret e os itemIds do Pluggy que você usa"*.

Na planilha:
1. **💰 Financeiro → Definir credenciais Pluggy.** No 3º campo, escreva quem é o dono de cada item, por exemplo `abc-123=Jacson, def-456=Ana`.
2. **Sincronizar bancos agora** (a 1ª vez puxa os últimos 60 dias).
3. **Ativar sincronização automática** (roda sozinho a cada 8 horas).

Depois da primeira sincronização, confira 2 ou 3 compras do cartão no app (valor e se aparece como despesa). Se algo vier invertido, me avise que eu ajusto.

## 6) Bot Grok (2 min cada)

Abra `bot/INSTRUCOES_BOT.md`, troque URL e token, e mande o texto para o seu bot e para o da Ana (trocando o nome).

---

### Atualizar o script no futuro
Cole o novo `Code.gs` → Salvar → **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**. O endereço continua o mesmo.

### Problemas comuns
- **"Token inválido"**: confira o token (menu *Ver token de acesso*).
- **App não conecta**: confira se o URL termina em `/exec` e se o acesso está como *Qualquer pessoa*.
- **Mudou o script e nada mudou**: faltou criar a *Nova versão* na implantação.
