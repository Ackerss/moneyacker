# MoneyAcker — Controle Financeiro Coletivo em Tempo Real (Supabase + MacroDroid)

Bem-vindo ao **MoneyAcker**, seu aplicativo web premium de controle financeiro pessoal. Esta versão foi atualizada para suportar **persistência em nuvem compartilhada via Supabase** e **captura automática de notificações de celular via MacroDroid**.

Agora, você, sua esposa Ana e qualquer dispositivo que você conectar podem ver, editar e aprovar transações em tempo real.

---

## 🚀 Como Funciona o Sistema?

1. **Persistência Compartilhada (Supabase):** Toda vez que você ou Ana cadastram uma receita, despesa, cartão ou orçamento, o dado é gravado na nuvem do Supabase.
2. **Sincronização em Tempo Real (Realtime):** Se você abrir o site no seu computador e Ana abrir no celular dela, qualquer alteração que um fizer aparecerá instantaneamente na tela do outro sem precisar recarregar a página.
3. **Captura via MacroDroid (Notificações):** A macro no celular intercepta notificações de aplicativos de bancos brasileiros, lê o valor da compra, gera uma transação com status **Pendente** e envia para o site. Ela fica aguardando sua confirmação no topo do Dashboard.

---

## 🛠️ Passo a Passo de Setup Inicial

Como o projeto é voltado para facilidade máxima, você não precisará programar nada nem usar terminais/comandos. Tudo é feito copiando e colando.

### Passo 1: Configurar o Banco de Dados no Supabase
1. Crie uma conta gratuita no [Supabase](https://supabase.com).
2. Crie um novo projeto (ex: `MoneyAckerDB`). Defina a senha do banco de dados e a região do servidor (recomenda-se *São Paulo*).
3. No painel do seu projeto no Supabase, clique no menu lateral **SQL Editor** e depois em **New Query**.
4. Abra o arquivo [supabase_schema.sql](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/supabase_schema.sql) deste projeto, copie todo o seu conteúdo, cole na caixa de texto do SQL Editor e clique em **Run** (no canto inferior direito).
   * *Pronto! As tabelas e as políticas de segurança de tempo real estão configuradas.*

### Passo 2: Configurar o MacroDroid no Celular
A macro do celular vai capturar as compras do seu cartão e Pix e enviar direto para o MoneyAcker.
1. Instale o **MacroDroid** no seu celular Android.
2. Siga as instruções passo a passo detalhadas no arquivo [MACRODROID_SETUP.md](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/MACRODROID_SETUP.md) para criar o gatilho, as ações de limpeza do valor e a requisição HTTP POST apontando para o seu Supabase.

### Passo 3: Hospedar o Site de Graça (Netlify)
Você quer acessar o site de qualquer lugar do mundo (no computador, tablet e celular). A hospedagem é feita de forma visual sem comandos:
1. Acesse o site do [Netlify](https://www.netlify.com) e crie uma conta gratuita.
2. Acesse a aba **Sites** e clique na opção **Deploy manually** (ou acesse [app.netlify.com/drop](https://app.netlify.com/drop)).
3. **Arraste e solte** a pasta `MONEYACKER` do seu computador (contendo os arquivos `index.html`, `style.css`, `app.js`) na área pontilhada da página web do Netlify.
4. Aguarde alguns segundos. O Netlify gerará um link público de graça (Ex: `https://moneyacker-finance.netlify.app`). 
5. *(Opcional)* Nas configurações do site no Netlify, você pode alterar o nome do subdomínio para algo de sua preferência.

---

## 👥 Uso Compartilhado: Jacson & Ana

Para que vocês dois compartilhem as mesmas informações e vejam as atualizações em tempo real:
1. Abra o link gerado pelo Netlify em qualquer dispositivo (seu celular S25, o laptop, o celular da Ana).
2. Vá até a aba **Configurações**.
3. Na seção **Conexão com o Banco de Dados (Supabase)**, cole:
   * **URL do Projeto Supabase:** `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   * **Chave Anon (Public API Key):** A chave longa disponível nas configurações de API do seu projeto Supabase.
4. Clique em **Conectar Banco**.
5. Repita o processo no celular de Ana utilizando **exatamente as mesmas credenciais (URL e Chave)**.
6. *Pronto! A partir desse momento, as transações criadas por um serão refletidas na tela do outro instantaneamente.*

---

## 📱 Lançamentos Pendentes (Aguardando Confirmação)

* Quando o MacroDroid capturar uma notificação (por exemplo, uma compra de R$ 35,00 no Nubank), ela será enviada para o banco com a categoria genérica "Outros (Despesas)" e o status `pending`.
* No Dashboard do MoneyAcker, aparecerá um card no topo chamado **"Aguardando Confirmação"**.
* Você ou Ana podem:
  * **Confirmar:** Abre a janela de cadastro pré-preenchida. Vocês escolhem a categoria correta (Ex: Alimentação), selecionam o cartão de crédito e clicam em Salvar. O status vira `confirmed` e ela entra nos gráficos de saldo.
  * **Rejeitar:** Exclui permanentemente o lançamento pendente (caso seja uma notificação de propaganda do banco ou uma compra duplicada).

---

## 📂 Estrutura do Projeto

```bash
MONEYACKER/
│
├── index.html          # Layout visual, menus, modais e abas
├── style.css           # Estilos e visual premium (tema claro clean, efeitos flutuantes, pulse)
├── app.js              # Lógica financeira, conexão Supabase CDN e Realtime
│
├── supabase_schema.sql # Script para rodar no editor SQL do Supabase
├── MACRODROID_SETUP.md # Guia visual detalhado para o celular do Jacson
└── README.md           # Este arquivo de documentação e guia de uso
```
