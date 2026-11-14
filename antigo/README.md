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

### Passo 3: Hospedar o Site e Acessar (Vercel)
O projeto já está configurado, hospedado e online na nuvem do Vercel!
* **Link de Acesso Principal:** [https://moneyacker.vercel.app/](https://moneyacker.vercel.app/)
* **Painel do Vercel (Gerenciamento):** [https://vercel.com/ackers-projects-831a23c7/moneyacker](https://vercel.com/ackers-projects-831a23c7/moneyacker)

Como o repositório privado do GitHub (`Ackerss/moneyacker`) está integrado diretamente ao Vercel, qualquer alteração ou melhoria que você commitar (ou que uma IA fizer) na branch `main` será compilada e atualizada no site de forma 100% automática em segundos.

---

## 👥 Uso Compartilhado: Jacson & Ana

Para que vocês dois compartilhem as mesmas informações e vejam as atualizações em tempo real:
1. Abra o link do aplicativo em qualquer dispositivo (seu celular S25, o laptop, o celular da Ana).
2. Vá até a aba **Configurações**.
3. Na seção **Conexão com o Banco de Dados (Supabase)**, cole:
   * **URL do Projeto Supabase:** A URL do seu banco de dados.
   * **Chave Anon (Public API Key):** A chave longa Anon.
4. Clique em **Conectar Banco**.
5. Repita o processo no celular de Ana utilizando **exatamente as mesmas credenciais (URL e Chave)**.
6. *Nota:* As credenciais de vocês já foram configuradas como padrão no código, portanto o aplicativo já se conectará de forma totalmente automática no primeiro acesso de vocês em novos aparelhos!

---

## 📱 Instalação como Aplicativo no Celular (PWA)

O MoneyAcker agora é um **Progressive Web App (PWA)**! Você e a Ana podem instalá-lo diretamente nos celulares sem precisar baixar de lojas de aplicativos, proporcionando uma experiência de app nativo em tela cheia e de alta performance.

### Como Instalar:
* **No Android (Google Chrome):** Ao abrir o site, clique no aviso "Instalar aplicativo" na parte inferior ou toque nos três pontinhos no canto superior direito e selecione **"Instalar aplicativo"** (ou **"Adicionar à tela inicial"**).
* **No iPhone / iOS (Safari):** Abra o site no Safari, toque no ícone de **Compartilhar** (quadrado com uma seta para cima) na barra inferior e selecione **"Adicionar à Tela de Início"**.

### Vantagens do PWA:
1. **Modo Standalone (Tela Cheia):** Abre sem a barra de endereços do navegador, parecendo um app nativo de verdade.
2. **Carregamento Instantâneo:** Graças ao *Service Worker* (`sw.js`), os arquivos fundamentais do site ficam em cache local, abrindo de imediato mesmo se você estiver com internet fraca ou sem sinal na rua.
3. **Ícone Exclusivo:** Cria um atalho premium com o logotipo estilizado do MoneyAcker na grade de aplicativos da sua tela inicial.

---

## ⚡ Aprovando Despesas diretamente do Celular (Aprovação Expressa)

Agora, você e a Ana têm **duas formas** de gerenciar as despesas capturadas pelas notificações no celular:

### Método 1: Aprovação Expressa no Celular (Recomendado)
Quando o MacroDroid intercepta uma compra, ele acende um pop-up de diálogo no seu telefone perguntando: *"Registrar compra de R$ XX,XX?"*.
* Se você clicar em **`[ APROVAR ]`**: O MacroDroid envia a despesa ao Supabase já com o status `confirmed` (Confirmado). Ela entra na hora no saldo e nos gráficos do MoneyAcker! **Você não precisa abrir o app para confirmar.**
* Se clicar em **`[ CANCELAR ]`**: O envio é interrompido e a despesa é descartada na hora.

### Método 2: Confirmação Tardia (Pendente no App)
Se a macro estiver configurada para enviar como `pending`, as transações vão para uma caixa especial chamada **"Aguardando Confirmação"** no topo do Dashboard.
Você ou Ana podem entrar no app a qualquer hora e:
* **Confirmar:** Ajustar a categoria (Alimentação, Lazer), o cartão usado e salvar (muda o status para `confirmed`).
* **Rejeitar:** Apagar o registro pendente de forma definitiva.

---

## 📂 Estrutura do Projeto

```bash
MONEYACKER/
│
├── index.html          # Layout visual, menus, modais e abas
├── style.css           # Estilos e visual premium (tema claro clean, efeitos flutuantes, pulse)
├── app.js              # Lógica financeira, conexão Supabase e registro do PWA
│
├── manifest.json       # Manifesto de PWA para permitir instalação e definir tema/cores
├── sw.js               # Service Worker para cache local do aplicativo e funcionamento offline
├── icon.svg            # Ícone oficial premium em alta definição vetorizada para celular
│
├── supabase_schema.sql # Script para rodar no editor SQL do Supabase
├── MACRODROID_SETUP.md # Guia visual detalhado para o celular do Jacson e da Ana
└── README.md           # Este arquivo de documentação e guia de uso
```
