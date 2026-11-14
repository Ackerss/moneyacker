# Finanças Acker: o que já está pronto e o que falta

> Para IAs e para o estado atual do projeto, veja `LEIA_PRIMEIRO_IA.md`.

## ✅ Já feito (14/11/2026)
- Planilha **Finanças Acker** criada no seu Google Drive, com as abas Lancamentos, Categorias, Contas, Regras e Log.
- Script **Finanças Acker API** colado, autorizado e publicado como App da Web.
- App no ar: **https://moneyacker.vercel.app/financas/** (o endereço da planilha já vem configurado dentro do app).

## 1) Conectar o celular (1 min, Jacson e Ana)
1. Na planilha, recarregue a página e use o menu **💰 Financeiro → Ver token de acesso**. Copie o token.
2. No celular, abra **https://moneyacker.vercel.app/financas/** → **Ajustes** → cole o token → escolha quem é você → **Salvar e testar**.
3. Instale na tela inicial:
   - **Android (Chrome):** menu ⋮ → *Instalar app*.
   - **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.

## 2) IA para foto e categorização: Gemini (2 min)
1. Abra **https://aistudio.google.com/apikey** → *Criar chave de API* (escolha o projeto com os créditos).
2. Na planilha: **💰 Financeiro → Definir chave do Gemini** → cole → **Testar Gemini**. (Já feito. Modelo em uso: `gemini-3.1-flash-lite`; para trocar, mude a propriedade `GEMINI_MODEL` no script.)

## 3) Bancos e cartões automáticos: Pluggy (3 min)
Você precisa de **Client ID**, **Client Secret** e dos **Item IDs** (um por banco conectado).
- Ficam no painel da Pluggy (*dashboard.pluggy.ai*).
- **Atalho:** peça ao seu bot Grok: *"me passe o clientId, clientSecret e os itemIds do Pluggy que você usa"*.

Na planilha: **💰 Financeiro → Definir credenciais Pluggy** (no 3º campo: `item1=Jacson, item2=Ana`) → **Sincronizar bancos agora** → **Ativar sincronização automática**.

## 4) Bot Grok (2 min cada)
Abra `bot/INSTRUCOES_BOT.md`, troque URL e token, e mande o texto para o seu bot e para o da Ana (trocando o nome).
URL da API: `https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec`

---

### Atualizar o script no futuro
Cole o novo `Code.gs` → Salvar → **Implantar → Gerenciar implantações → ✏️ → Versão: Nova versão → Implantar**. O endereço continua o mesmo.

### Problemas comuns
- **"Token inválido"**: confira o token (menu *Ver token de acesso*).
- **Menu 💰 Financeiro não aparece**: recarregue a planilha e espere uns 5 segundos.
