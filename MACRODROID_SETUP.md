# Guia de Configuração Detalhado: MacroDroid

Este guia traz os caminhos de menu exatos em **Português** (e inglês) para configurar a macro no seu celular Samsung Galaxy S25 sem erros.

---

## 🎨 Entendendo as Cores do MacroDroid
No MacroDroid, as macros são construídas com blocos coloridos:
1. **Gatilhos (Triggers) - Bloco Vermelho:** O que faz a macro rodar (no nosso caso, a chegada da notificação).
2. **Ações (Actions) - Bloco Azul:** O que a macro vai fazer (extrair o valor e enviar para o banco de dados).
3. **Restrições (Constraints) - Bloco Verde:** Condições opcionais (não precisaremos usar).

---

## 1. Como Criar as Variáveis Locais
Antes de adicionar os blocos coloridos, você precisa criar 4 "gavetas" de texto (variáveis locais) para guardar as informações temporariamente.

1. Abra o **MacroDroid** e toque em **Adicionar Macro** (Add Macro).
2. No topo, dê o nome de: `MoneyAcker - Notificações`.
3. Olhe para a barra amarela no rodapé da tela ou toque no ícone de lista/chave no canto superior direito para ver a seção **Variáveis Locais** (Local Variables).
4. Toque no botão **(+)** verde dessa área de Variáveis Locais e crie as seguintes 4 variáveis:
   * **Nome:** `id_transacao` | **Tipo:** Texto (String)
   * **Nome:** `valor_raw` | **Tipo:** Texto (String)
   * **Nome:** `valor_final` | **Tipo:** Texto (String)
   * **Nome:** `data_compra` | **Tipo:** Texto (String)

---

## 2. Configurar o Gatilho (Trigger - Bloco Vermelho)
1. Toque no botão **(+)** no bloco vermelho.
2. Siga este caminho: **Eventos do dispositivo** (Device Events) ➔ **Notificação** (Notification) ➔ **Notificação recebida** (Notification Received).
3. Na janela que abrir, selecione **Selecionar Aplicativo(s)** (Select Application(s)) e clique em OK.
4. Na lista de aplicativos, marque os seus bancos (Ex: *Nubank, Itaú, Inter, C6 Bank, Bradesco, PicPay*). Clique em OK.
5. Em **Conteúdo do texto** (Text Content), marque a primeira opção: **Qualquer** (Any). Clique em OK.

---

## 3. Configurar as Ações (Actions - Bloco Azul)
Toque no botão **(+)** no bloco azul para adicionar cada ação abaixo, uma por uma, seguindo a ordem exata:

### Ação 1: Definir ID da Transação
1. Caminho: **MacroDroid específico** (MacroDroid Specific) ➔ **Definir variável** (Set Variable).
2. Escolha a variável: `id_transacao`.
3. Selecione a opção **Valor** (Value) e digite: `md-[system_time]`
   * *(Nota: o `[system_time]` é um Texto Mágico que o MacroDroid substitui pelo horário em milissegundos, garantindo que cada transação tenha um código único).*

### Ação 2: Definir a Data da Compra
1. Caminho: **MacroDroid específico** (MacroDroid Specific) ➔ **Definir variável** (Set Variable).
2. Escolha a variável: `data_compra`.
3. Selecione **Valor** (Value) e digite: `[year_four_digit]-[month_digit_zero]-[day_digit_zero]`

### Ação 3: Extrair o Valor da Notificação (Regex)
1. Caminho: **Manipulação de texto** (Text Manipulation) ➔ **Extrair texto** (Extract Text).
2. **Texto de origem** (Source text): Toque no botão de três pontinhos `...` ou ícone de etiqueta no canto do campo e selecione **Texto da notificação** (isto inserirá a tag `{notification}` ou `{not_sub_text}`).
3. **Expressão Regular** (Regex):
   ```regex
   R\$\s?([\d\.]+,\d{2})
   ```
4. **Variável de destino** (Save to variable): Escolha `valor_raw`.

### Ação 4: Remover o Ponto de Milhar (Ex: 1.250,00 ➔ 1250,00)
1. Caminho: **Manipulação de texto** (Text Manipulation) ➔ **Substituir texto** (Replace Text).
2. **Texto de origem** (Source text): Selecione a variável `{lv=valor_raw}` usando o botão `...` ou digite `{lv=valor_raw}`.
3. **Pesquisar por** (Search for): Digite apenas um ponto final: `.`
4. **Substituir por** (Replace with): Deixe completamente **vazio**.
5. **Variável de destino** (Save to variable): Escolha `valor_raw`.

### Ação 5: Converter Vírgula em Ponto (Ex: 1250,00 ➔ 1250.00)
O banco de dados precisa do ponto para reconhecer os centavos.
1. Caminho: **Manipulação de texto** (Text Manipulation) ➔ **Substituir texto** (Replace Text).
2. **Texto de origem** (Source text): Digite ou selecione `{lv=valor_raw}`.
3. **Pesquisar por** (Search for): Digite uma vírgula: `,`
4. **Substituir por** (Replace with): Digite um ponto final: `.`
5. **Variável de destino** (Save to variable): Escolha `valor_final`.

### Ação 6: Enviar Dados ao Supabase (HTTP POST)
1. Caminho: **Conectividade** (Connectivity) ➔ **Requisição HTTP** (HTTP Request).
2. **Método** (Method): Selecione **POST**.
3. **URL**: Cole a URL da API das suas transações:
   ```text
   https://gqqjxhfqlbflfrpjnojt.supabase.co/rest/v1/transactions
   ```
4. **Tipo de Conteúdo** (Content-Type): Escolha `application/json`.
5. **Cabeçalhos** (Headers): Toque no botão para adicionar cabeçalhos e insira estes 3 cabeçalhos exatamente assim:
   * Chave: `apikey` | Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcWp4aGZxbGJmbGZycGpub2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE5OTgsImV4cCI6MjA5NTY2Nzk5OH0._QSbapoTPdRP4_Un3M5-hICi3gwoSlJRUpjP4dXhJ0Y`
   * Chave: `Authorization` | Valor: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcWp4aGZxbGJmbGZycGpub2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE5OTgsImV4cCI6MjA5NTY2Nzk5OH0._QSbapoTPdRP4_Un3M5-hICi3gwoSlJRUpjP4dXhJ0Y`
   * Chave: `Prefer` | Valor: `return=minimal`
6. **Corpo do POST (Body / Conteúdo)**: Cole o seguinte código JSON:
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
7. Marque a opção **Bloquear até concluir** (Block until complete) e clique em OK.

---

## 4. Salvar
Toque no ícone de disquete no canto inferior direito para salvar a sua macro. Confirme que a chave geral do MacroDroid está ligada!
