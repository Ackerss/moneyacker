# Manual de Configuração de Produção: MacroDroid

Este documento serve como referência técnica definitiva e detalhada para que qualquer IA ou desenvolvedor possa entender, auditar ou recriar exatamente a macro de captura automática de notificações no celular Android do Jacson (ou celular da Ana) para o **MoneyAcker**.

---

## 📱 Dados Gerais da Macro
* **Nome da Macro:** `Money Acker Notify`
* **Finalidade:** Capturar notificações de compras de aplicativos de bancos parceiros (Ailos, Santander, Nubank, Itaú, etc.), extrair o valor monetário de forma limpa, exibir um pop-up de aprovação expressa no celular e enviar os dados para processamento inteligente por IA na Edge Function do Supabase.

---

## 🗃️ 1. Variáveis Locais
As variáveis locais são criadas na área **"Variáveis Locais"** (no rodapé da tela da macro no MacroDroid). Elas servem para armazenar dados intermediários:

| Nome da Variável | Tipo | Descrição / Conteúdo Padrão |
|---|---|---|
| `id_transacao` | Texto (String) | ID único gerado em milissegundos. |
| `valor_raw` | Texto (String) | Valor bruto extraído da notificação (ex: `15,49` ou `1.250,00`). |
| `valor_final` | Texto (String) | Valor formatado com ponto decimal para o banco (ex: `15.49` ou `1250.00`). |
| `data_compra` | Texto (String) | Data da captura da compra no formato `AAAA-MM-DD`. |
| `opcao_selecionada` | Texto (String) | Resposta do usuário no pop-up: `APROVAR`, `CANCELAR` ou `PENDENTE` (default). |

---

## 🔴 2. Gatilhos (Triggers)
* **Gatilho:** **Notificação recebida**
* **Caminho no Menu:** `Eventos do dispositivo` ➔ `Notificação` ➔ `Notificação recebida`
* **Configuração:**
  * **Opção:** `Selecionar Aplicativo(s)`
  * **Apps Marcados:** *Santander, Ailos, Ailos Cartões, Empresas, Nubank, Stone, Way, Itaú* (e demais apps financeiros do aparelho).
  * **Conteúdo do texto:** `Qualquer` (Any).

---

## 🔵 3. Ações (Actions) - Ordem Exata de Execução
As ações azuis executam sequencialmente de cima para baixo. A ordem abaixo é crítica para evitar erros de variáveis vazias no envio:

### Ação 1: Definir ID da Transação (Gerador de ID Único)
* **Caminho:** `MacroDroid específico` ➔ `Definir variável`
* **Variável:** `id_transacao`
* **Tipo:** `Valor`
* **Conteúdo:** `md-[system_time]`
  *(Nota: `[system_time]` insere os milissegundos atuais do sistema).*

### Ação 2: Guardar a Data da Compra
* **Caminho:** `MacroDroid específico` ➔ `Definir variável`
* **Variável:** `data_compra`
* **Tipo:** `Valor`
* **Conteúdo:** `{year}-{month_digit}-{dayofmonth}`
  *(Nota: Formata no padrão internacional AAAA-MM-DD para o banco de dados).*

### Ação 3: Extrair o Valor Monetário da Notificação (Regex)
* **Caminho:** `Manipulação de texto` ➔ `Extrair texto`
* **Texto de origem:** `{notification}` (Selecionado a partir do botão de tags mágicas `...`)
* **Expressão Regular (Regex):**
  ```regex
  (?<=R\$\s?)[\d\.]+,\d{2}
  ```
  *(Nota: Esta regex captura apenas os números com vírgula após o termo "R$", ignorando o símbolo R$ e espaços extras).*
* **Variável de destino:** `valor_raw`

### Ação 4: Limpar Ponto de Milhar (Ex: 1.250,00 ➔ 1250,00)
* **Caminho:** `Manipulação de texto` ➔ `Substituir todos`
* **Texto de origem:** `{lv=valor_raw}`
* **Pesquisar por:** `\.` *(Atenção: o ponto precisa ser escapado com barra invertida).*
* **Substituir por:** *(Deixar completamente em branco/vazio)*
* **Variável de destino:** `valor_raw`

### Ação 5: Converter Vírgula em Ponto Decimal (Ex: 1250,00 ➔ 1250.00)
* **Caminho:** `Manipulação de texto` ➔ `Substituir todos`
* **Texto de origem:** `{lv=valor_raw}`
* **Pesquisar por:** `,`
* **Substituir por:** `.`
* **Variável de destino:** `valor_final`

### Ação 6: Definir Valor Padrão como "PENDENTE" (Mecanismo Antiperda)
* **Caminho:** `MacroDroid específico` ➔ `Definir variável`
* **Variável:** `opcao_selecionada`
* **Tipo:** `Valor`
* **Conteúdo:** `PENDENTE`
  *(Nota: Se o usuário ignorar o pop-up, der timeout ou bloquear a tela, a transação entra no banco como pendente para aprovação posterior no app).*

### Ação 7: Exibir Pop-up de Aprovação Rápida (Diálogo de Seleção)
* **Caminho:** `Interação com a UI` ➔ `Diálogo de Seleção`
* **Mensagem de diálogo:** `Registrar compra de R$ {lv=valor_raw}?`
* **Salvar índice selecionado em variável numérica:** `Nenhum`
* **Salvar valor selecionado em variável string:** `opcao_selecionada`
* **Estilo botão:** `Texto simples`
* **Opções do diálogo:** `Definir manualmente`
  * **Item 0 (Botão Verde):** Texto: `APROVAR` (Marcar Negrito, cor verde `#0e9f6e`)
  * **Item 1 (Botão Vermelho):** Texto: `CANCELAR` (Marcar Negrito, cor vermelha `#f05252`)
* **Opção padrão:** `Nenhum`
* **Configuração de Fechamento (CRÍTICO):**
  * **[x] Continuar macro ao pressionar para trás** (MARCAR esta opção!)
  * **[ ] Não fechar com o botão voltar** (DESMARCAR esta opção!)
  * *Tempo limite (Timeout) opcional:* Se sua versão do MacroDroid possuir, configure para `30 segundos`.

### Ação 8: Enviar Requisição HTTP POST para a Edge Function do Supabase
* **Caminho:** `Conectividade` ➔ `Requisição HTTP`
* **Método:** `POST`
* **URL:**
  ```text
  https://gqqjxhfqlbflfrpjnojt.supabase.co/functions/v1/process-notification
  ```
* **Tipo de conteúdo:** `application/json`
* **Parâmetros do corpo (JSON):**
  ```json
  {
    "notification_title": "{not_title}",
    "notification_text": "{notification}",
    "amount": {lv=valor_final},
    "date": "{lv=data_compra}",
    "status": "{lv=opcao_selecionada}"
  }
  ```
* **Cabeçalhos (Headers):**
  * Chave: `apikey` | Valor: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcWp4aGZxbGJmbGZycGpub2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE5OTgsImV4cCI6MjA5NTY2Nzk5OH0._QSbapoTPdRP4_Un3M5-hICi3gwoSlJRUpjP4dXhJ0Y`
  * Chave: `Authorization` | Valor: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcWp4aGZxbGJmbGZycGpub2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE5OTgsImV4cCI6MjA5NTY2Nzk5OH0._QSbapoTPdRP4_Un3M5-hICi3gwoSlJRUpjP4dXhJ0Y`
* **Opção:** `Bloquear até concluir` (Block until complete)
* **Restrição Nativa da Ação (toque rápido na ação ➔ Adicionar restrição):**
  * Tipo: `Valor da variável` (MacroDroid específico)
  * Variável: `opcao_selecionada`
  * Condição: `!=` (Diferente de)
  * Valor: `CANCELAR`
  * **[x] Ignorar maiúsculas/minúsculas** (Marcar esta opção)

---

## ⚡ 4. Restrições Gerais da Macro
* A macro não possui restrições globais (o bloco verde na parte inferior fica como **"Sem restrições"**). As únicas restrições são aplicadas cirurgicamente à ação de Envio HTTP POST (Ação 8), impedindo o envio apenas quando o usuário clica expressamente em CANCELAR.

---

## 🧠 5. Como a Lógica de Fallback de Status funciona no Backend
Quando a requisição HTTP POST chega na Edge Function `process-notification`:
1. Se a propriedade `status` no JSON enviado for igual a `"PENDENTE"` (ou `"pending"`), a Edge Function criará a despesa com o status `"pending"`. Ela aparecerá na tela do aplicativo no Dashboard sob a seção de confirmações pendentes.
2. Se a propriedade `status` no JSON enviado for igual a `"APROVAR"` (ou qualquer outra string de aprovação), ela será cadastrada no banco de dados como `"confirmed"`, computando imediatamente o saldo.
3. Se o usuário clicar em `"CANCELAR"`, a restrição do MacroDroid impede o disparo da requisição, economizando dados e processamento.
