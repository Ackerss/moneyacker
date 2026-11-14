# Novas Funcionalidades MoneyAcker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar máscara de valor monetário em tempo real, leitor de cupom fiscal com a câmera usando Tesseract.js (OCR) e gerenciamento de cartões de crédito com suporte a parcelamento de despesas.

**Architecture:** A aplicação continuará 100% client-side rodando no navegador sem dependências de build. O OCR usará o Tesseract.js carregado via CDN oficial. O parcelamento estenderá o estado global (`state`) para gerar transações individuais futuras vinculadas ao dia de vencimento da fatura do cartão escolhido.

**Tech Stack:** HTML5, CSS3, JavaScript Vanilla (ES6+), Tesseract.js (CDN), Chart.js (já integrado).

---

## Chunk 1: Máscara de Valor Monetário Dinâmica

### Files
- Modify: `index.html:338-341`, `index.html:388-392`
- Modify: `app.js` (Função de escuta e formatação de valores)

- [ ] **Step 1: Modificar os inputs de valor no HTML**
  Mudar os inputs de valor de `type="number"` para `type="text"` com `inputmode="numeric"` para permitir a formatação da máscara.
  * Arquivo: [index.html](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/index.html)
  * Modificar input de valor no modal de transação (`trans-amount`) e no modal de orçamento (`budget-limit`).

- [ ] **Step 2: Implementar a função de formatação de máscara monetária**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Adicionar no topo/área de utilitários uma função `setupMoneyMask(inputEl)` que:
    * Inicia o campo com `0,00` se estiver vazio.
    * Escuta o evento `input` e formata o valor empurrando os números da direita para a esquerda.
    * Impede a inserção de caracteres não numéricos.

- [ ] **Step 3: Vincular a máscara aos inputs de valor na inicialização**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Executar `setupMoneyMask` para o input de valor da transação e do limite de orçamento após a carga do DOM.
  * Ajustar a função de leitura dos valores desses inputs (fazer o parse convertendo `1.250,00` em float `1250.00` antes de salvar).

- [ ] **Step 4: Verificar manualmente no navegador**
  * Abrir a página no navegador.
  * Abrir o modal de receita/despesa e tentar digitar valores como `10` (deve virar `0,10`), `100` (`1,00`), `1000` (`10,00`).
  * Salvar uma transação e garantir que o valor no histórico e gráficos seja exibido corretamente (ex: `R$ 10,00`).

---

## Chunk 2: Scanner de Cupom Fiscal com Câmera (OCR)

### Files
- Modify: `index.html` (Carregar Tesseract.js e adicionar elementos visuais)
- Modify: `style.css` (Estilos do botão e loader de OCR)
- Modify: `app.js` (Captura da câmera, processamento Tesseract e parser regex)

- [ ] **Step 1: Adicionar Tesseract.js e Elementos HTML**
  * Arquivo: [index.html](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/index.html)
  * Adicionar na tag `<head>` a tag script:
    ```html
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
    ```
  * No modal de transação, próximo ao campo de Valor, adicionar o botão "Escanear Cupom" e o input de arquivo oculto com captura de câmera.
  * Adicionar uma div de progresso/loader no modal de transação (ex: `<div id="ocr-loader" style="display:none">Escaneando cupom...</div>`).

- [ ] **Step 2: Estilizar os elementos do OCR no CSS**
  * Arquivo: [style.css](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/style.css)
  * Estilizar o botão "Escanear Cupom" para combinar com a identidade visual premium.
  * Estilizar o loader com spinner moderno e degradê suave.

- [ ] **Step 3: Implementar a lógica de OCR e Parser Regex no JS**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Criar um event listener para quando o input de câmera receber um arquivo de imagem.
  * Executar `Tesseract.recognize` na imagem recebida.
  * Criar algoritmo de extração baseada em Regex para obter:
    * **Valor Total**: Encontrar expressões como `TOTAL`, `VALOR TOTAL`, `PAGO`, `R$` seguidas de valores decimais, ou pegar o maior valor decimal encontrado.
    * **Data**: Encontrar padrões de data `dd/mm/aaaa` ou `dd-mm-aa`.
    * **Descrição**: Extrair as primeiras linhas do texto que normalmente contêm o estabelecimento.
  * Preencher os inputs correspondentes do modal (`trans-amount`, `trans-description`, `trans-date`).
  * Desativar o loader de progresso e exibir um toast de sucesso.

- [ ] **Step 4: Verificar a leitura da câmera e OCR**
  * Abrir o app, clicar em "Escanear Cupom" e enviar um cupom fiscal de teste.
  * Verificar se o loader aparece, extrai os dados corretamente e preenche o modal.

---

## Chunk 3: Cadastro e Gerenciamento de Cartões de Crédito

### Files
- Modify: `index.html` (Seção de cartões nas Configurações)
- Modify: `style.css` (Estilos visuais de cartões premium)
- Modify: `app.js` (Extensão do estado, persistência e interface de cartões)

- [ ] **Step 1: Atualizar o Estado Inicial e Persistência**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Adicionar `state.cards = []` na inicialização padrão e no `loadState()` sanitizador.
  * Adicionar cartões de teste em `initializeMockData()`.

- [ ] **Step 2: Adicionar Seção de Cartões nas Configurações**
  * Arquivo: [index.html](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/index.html)
  * Na aba de configurações (`tab-settings`), adicionar o formulário para cadastrar novos cartões de crédito (Nome, Limite, Dia de Fechamento, Dia de Vencimento, Cor).
  * Adicionar um contêiner para listar os cartões salvos.

- [ ] **Step 3: Estilizar a Seção de Cartões**
  * Arquivo: [style.css](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/style.css)
  * Criar layouts em grid e cartões de crédito virtuais premium (estilo glassmorphic/degradê) para listar os cartões cadastrados de forma impressionante.

- [ ] **Step 4: Programar Lógica de CRUD dos Cartões**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Criar funções:
    * `renderSettingsCards()`: lista cartões no HTML.
    * `addNewCard()`: lê campos, gera ID e adiciona ao `state.cards`.
    * `deleteCard(cardId)`: exclui cartão do estado e remove transações vinculadas se necessário.
  * Invocar `renderSettingsCards()` ao entrar na aba de configurações.

---

## Chunk 4: Pagamento em Cartão e Parcelamento de Despesas

### Files
- Modify: `index.html` (Campos de forma de pagamento e parcelamento no modal)
- Modify: `app.js` (Lógica de salvamento e cálculo de vencimento de parcelas)

- [ ] **Step 1: Adicionar Campos de Cartão no Modal de Transação**
  * Arquivo: [index.html](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/index.html)
  * No modal de transação, adicionar a seleção "Forma de Pagamento" (Dropdown: "Saldo / Dinheiro" + Lista de Cartões cadastrados).
  * Adicionar um contêiner oculto para "Opções de Parcelamento" (Checkbox "Parcelado?" e Dropdown "Número de Parcelas" de 2x a 12x).

- [ ] **Step 2: Adicionar Lógica UI para Exibição Dinâmica**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Mostrar "Forma de Pagamento" apenas se o tipo for despesa (`expense`).
  * Mostrar "Opções de Parcelamento" apenas se a forma de pagamento for um cartão de crédito.

- [ ] **Step 3: Implementar o algoritmo de divisão de parcelas e datas**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Ao salvar transação com cartão e com parcelamento ativo:
    * Obter o valor da parcela ($Total / N$).
    * Descobrir o dia de fechamento do cartão.
    * Para cada parcela de $1$ a $N$:
      * Adicionar um mês à data base da transação se a compra foi feita após o dia de fechamento.
      * Definir a data da transação como a data de vencimento daquela respectiva fatura.
      * Definir descrição como `[Descrição] (Parcela X/N)`.
      * Definir propriedades da transação: `paymentMethod: [card-id]`, `installmentId: [uuid]`, `installmentNumber: X`, `totalInstallments: N`.
      * Salvar cada parcela como uma transação individual no array `state.transactions`.

- [ ] **Step 4: Ajustar Exibição de Transações e Gráficos**
  * Arquivo: [app.js](file:///c:/Users/User/Meu%20Drive/ANTIGRAVITY/MONEYACKER/app.js)
  * Garantir que as transações futuras parceladas sejam mostradas na tabela e computadas apenas no respectivo mês de vencimento (visto que o dashboard hoje filtra transações do mês vigente baseado em `t.date`).

- [ ] **Step 5: Verificação Geral**
  * Cadastrar cartão com vencimento dia 10 e fechamento dia 2.
  * Lançar despesa no dia 1 de R$ 300,00 em 3x. Conferir se gerou parcelas nos dias 10 do mês atual, 10 do mês seguinte e 10 do subsequente.
  * Lançar despesa no dia 3 de R$ 300,00 em 3x. Conferir se gerou parcelas nos dias 10 do mês seguinte, 10 do subsequente e 10 do quarto mês (pulando o mês atual por causa do fechamento).
