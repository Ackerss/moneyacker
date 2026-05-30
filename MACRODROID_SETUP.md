# Guia de Configuração: Captura de Notificações com MacroDroid

Este guia ensina a configurar o aplicativo gratuito **MacroDroid** no Samsung Galaxy S25 (ou qualquer aparelho Android) para ler notificações de bancos brasileiros, extrair o valor da compra automaticamente e enviá-la instantaneamente como transação **Pendente** no MoneyAcker.

---

## Como Funciona o Fluxo?
```mermaid
graph TD
    A[Compra no Cartão/Pix] --> B[Celular recebe notificação do Banco]
    B --> C[MacroDroid lê a notificação]
    C --> D[Extrai valor com Regex & limpa formatação]
    D --> E[Envia HTTP POST direto para o Supabase]
    E --> F[MoneyAcker exibe no card 'Aguardando Confirmação' em Realtime]
```

---

## Requisitos Prévios no Celular
1. Instale o **MacroDroid** gratuitamente na Google Play Store.
2. Dê permissão de **Acesso a Notificações** para o MacroDroid nas configurações do Android.
3. Certifique-se de que os aplicativos dos seus bancos estejam configurados para enviar notificações push detalhadas de compras/Pix.

---

## Passo a Passo para Configurar a Macro

### Passo 1: Criar uma Nova Macro e Variáveis
1. Abra o **MacroDroid** e toque em **Adicionar Macro**.
2. No topo, dê o nome de: `MoneyAcker - Capturar Notificações`.
3. Toque na aba **Variáveis** (no rodapé ou no canto da edição) e crie as seguintes variáveis locais:
   - **`id_transacao`** (Tipo: *Texto / String*)
   - **`valor_raw`** (Tipo: *Texto / String*)
   - **`valor_final`** (Tipo: *Texto / String*)
   - **`data_compra`** (Tipo: *Texto / String*)

---

### Passo 2: Configurar o Gatilho (Trigger - Vermelho)
O gatilho ativa a macro sempre que chegar uma notificação bancária.

1. Na seção **Gatilhos** (bloco vermelho), toque no botão **(+)**.
2. Vá em **Eventos do dispositivo** -> **Notificação** -> **Notificação recebida**.
3. Escolha **Selecionar Aplicativo(s)** e clique em Ok.
4. Marque os aplicativos dos seus bancos (Ex: *Nubank, Itaú, Inter, C6 Bank, Bradesco, Santander, PicPay*). Toque em Ok.
5. Em **Conteúdo do texto**, selecione **Qualquer** (ou filtre por palavras como `R$` se preferir). Toque em Ok.

---

### Passo 3: Configurar as Ações (Actions - Azul)
As ações processam o texto, extraem o valor e fazem o envio HTTP.

Toque no botão **(+)** na seção **Ações** (bloco azul) para adicionar cada uma na ordem abaixo:

#### Ação 1: Gerar ID Único
1. Adicione a ação: **MacroDroid específico** -> **Definir variável**.
2. Escolha `id_transacao` e defina como texto: `md-[system_time]`.

#### Ação 2: Capturar a Data da Compra
1. Adicione a ação: **MacroDroid específico** -> **Definir variável**.
2. Escolha `data_compra` e defina como texto: `[year_four_digit]-[month_digit_zero]-[day_digit_zero]`.

#### Ação 3: Extrair o Valor da Notificação (Regex)
1. Adicione a ação: **Manipulação de texto** -> **Extrair texto**.
2. **Texto de origem**: Toque no ícone de tag `[...]` e selecione **`[not_sub_text]`** (ou `[notification]` se o app do banco mandar o valor no corpo principal da mensagem).
3. **Expressão Regular (Regex)**: 
   ```regex
   R\$\s?([\d\.]+,\d{2})
   ```
4. **Variável de destino**: Escolha `valor_raw`.

#### Ação 4: Formatar o Valor para o Banco de Dados (Substituir Pontos)
O banco de dados precisa do formato `1234.56` (ponto como decimal) em vez de `1.234,56` (padrão brasileiro).
1. Adicione a ação: **Manipulação de texto** -> **Substituir texto**.
2. **Texto de origem**: Selecione a variável `{lv=valor_raw}`.
3. **Pesquisar por**: `.` (digite um ponto final simples).
4. **Substituir por**: Deixe completamente **em branco** (para remover o ponto de milhar).
5. **Variável de destino**: Selecione `valor_raw`.

#### Ação 5: Formatar o Valor para o Banco de Dados (Substituir Vírgula por Ponto)
1. Adicione a ação: **Manipulação de texto** -> **Substituir texto**.
2. **Texto de origem**: Selecione a variável `{lv=valor_raw}`.
3. **Pesquisar por**: `,` (digite uma vírgula).
4. **Substituir por**: `.` (digite um ponto).
5. **Variável de destino**: Selecione `valor_final`.

#### Ação 6: Enviar Dados ao Supabase via HTTP POST
1. Adicione a ação: **Aplicativo** -> **Requisição HTTP (HTTP GET/POST)**.
2. Selecione o método: **POST**.
3. **URL**: Cole a URL da API REST das suas transações:
   ```text
   https://<SEU_PROJECT_REF>.supabase.co/rest/v1/transactions
   ```
   *(Substitua `<SEU_PROJECT_REF>` pelo código do seu projeto Supabase, ex: `abcde12345`)*
4. **Content-Type**: Selecione `application/json`.
5. **Cabeçalhos (Headers)** - Adicione estes 3 cabeçalhos exatamente assim:
   - `apikey` : `SUA_CHAVE_ANON_DO_SUPABASE`
   - `Authorization` : `Bearer SUA_CHAVE_ANON_DO_SUPABASE`
   - `Prefer` : `return=minimal`
6. **Corpo do POST (Body)**: Cole o seguinte JSON:
   ```json
   {
     "id": "[lv=id_transacao]",
     "amount": [lv=valor_final],
     "description": "[not_title] - [not_sub_text]",
     "date": "[lv=data_compra]",
     "category": "cat-outros-desp",
     "type": "expense",
     "status": "pending",
     "payment_method": "cash"
   }
   ```
7. Marque a opção **Bloquear até concluir** e salve.

---

### Passo 4: Salvar e Ativar
Toque no ícone de disquete no canto inferior direito para salvar a sua macro. Garanta que o botão geral do MacroDroid e a macro recém-criada estejam **Ativados**.

---

## Como Testar a Macro?
Você não precisa ir até uma loja passar o cartão para testar!
1. Vá na lista de macros no MacroDroid.
2. Toque demoradamente na macro `MoneyAcker - Capturar Notificações` e escolha **Testar Ações**.
3. Se desejar, insira valores fictícios nas variáveis locais para testar.
4. Verifique no painel do Supabase ou na tela principal do MoneyAcker se a transação apareceu como **Pendente** no topo do Dashboard.
