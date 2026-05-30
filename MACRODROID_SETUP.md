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
3. Selecione **Valor** (Value) e digite: `{year}-{month_digit}-{dayofmonth}`
   * *(Nota: você também pode usar o botão de três pontinhos `...` ou o ícone de etiqueta para selecionar Ano, Mês e Dia do Mês, o que inserirá a tag `{year}-{month_digit}-{dayofmonth}`).*

### Ação 3: Extrair o Valor da Notificação (Regex)
1. Caminho: **Manipulação de texto** (Text Manipulation) ➔ **Extrair texto** (Extract Text).
2. **Texto de origem** (Source text): Toque no botão de três pontinhos `...` ou ícone de etiqueta no canto do campo e selecione **Texto da notificação** (isto inserirá a tag `{notification}` ou `{not_sub_text}`).
3. **Expressão Regular** (Regex):
   ```regex
   (?<=R\$\s?)[\d\.]+,\d{2}
   ```
   *(Nota: esta expressão garante que o MacroDroid capture apenas os números, descartando o "R$" e o espaço).*
4. **Variável de destino** (Save to variable): Escolha `valor_raw`.

### Ação 4: Remover o Ponto de Milhar (Ex: 1.250,00 ➔ 1250,00)
1. Caminho: **Manipulação de texto** (Text Manipulation) ➔ **Substituir texto** (Replace Text).
2. **Texto de origem** (Source text): Selecione a variável `{lv=valor_raw}` usando o botão `...` ou digite `{lv=valor_raw}`.
3. **Pesquisar por** (Search for): Como o MacroDroid sempre usa expressões regulares aqui, você deve escapar o ponto digitando uma barra antes dele: `\.`
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
     "id": "{lv=id_transacao}",
     "amount": {lv=valor_final},
     "description": "{not_title} - {notification}",
     "date": "{lv=data_compra}",
     "category": "cat-outros-desp",
     "type": "expense",
     "status": "pending",
     "payment_method": "cash"
   }
   ```
7. Marque a opção **Bloquear até concluir** (Block until complete) e clique em OK.

---

## ⚡ Opcional: Configurando a Aprovação Expressa pelo Celular (Pop-up de Confirmação)

Se você preferir aprovar a despesa na mesma hora em que a notificação de compra chegar no celular — sem ter o trabalho de abrir o aplicativo MoneyAcker —, siga estes passos simples para adicionar um pop-up de aprovação rápida na sua tela:

### Passo A: Criar a Variável de Resposta
1. Com a sua macro aberta no MacroDroid, vá até a seção **Variáveis Locais** no rodapé.
2. Toque no **(+)** verde e crie uma nova variável com os dados:
   * **Nome:** `opcao_selecionada` | **Tipo:** Texto (String).

### Passo B: Adicionar a Ação de Pop-up (Diálogo)
1. No bloco de **Ações (Azul)**, toque no **(+)**.
2. Toque na **lupa de pesquisa** no topo e digite: `diálogo` (ou `dialogo`).
3. Sob a categoria **"Interação com a UI"**, selecione a ação: **"Diálogo de Seleção"** (ou *Diálogo de confirmação*).
4. Na tela de configuração:
   * **Mensagem de diálogo:** Digite exatamente: `Registrar compra de R$ {lv=valor_raw}?`
   * **Salvar índice selecionado em variável numérica:** Deixe como **`Nenhum`**.
   * **Salvar valor selecionado em variável string:** Selecione a variável **`opcao_selecionada`** (toque no dropdown e clique nela. Se não aparecer, crie a variável de texto clicando no `+` ao lado).
   * **Estilo botão:** Deixe como **`Texto simples`**.
   * **Opções do diálogo:** Deixe como **`Definir manualmente`**.
   * Toque no botão azul **`[ ADICIONAR ITEM ]`** e escreva: `APROVAR`
   * Toque novamente no **`[ ADICIONAR ITEM ]`** e escreva: `CANCELAR`
   * *(Opcional: Você pode colorir os botões de verde e vermelho e deixá-los em negrito como preferir!)*
   * Toque em **`OK`** no canto inferior direito para salvar a ação.

### Passo C: Ajustar a Ordem das Ações
1. Toque no ícone de duas setas verticais **`⇅`** (topo direito do bloco de Ações azul).
2. Segure e arraste a ação **"Caixa de diálogo de seleção"** para cima, deixando-a posicionada **antes** da ação de **"Requisição HTTP (POST)"** (ela deve ser a penúltima, e o HTTP POST a última).
3. Toque novamente em **`⇅`** para salvar a ordem.

### Passo D: Fazer o Envio Depender do "APROVAR"
1. Dê um toque rápido na ação de **"Requisição HTTP (POST)"** e escolha **"Adicionar restrição"**.
2. Na lupa de pesquisa de restrições, digite: `variável` (ou `variavel`).
3. Selecione **"Valor da variável"** (sob a categoria *MacroDroid específico*).
4. Escolha a variável local: **`opcao_selecionada`**.
5. Configure como: **Igual a** (Equal to) ➔ digite no valor exatamente: **`APROVAR`** (em maiúsculas).
6. Salve a restrição clicando em **OK**.

### Passo E: Alterar o status para Confirmado no JSON
1. Dê dois toques rápidos na ação de **"Requisição HTTP (POST)"** para abrir as configurações.
2. Role até a caixa de texto do JSON (fim da página).
3. Mude a linha do status de `"pending"` para:
   ```json
   "status": "confirmed",
   ```
4. Salve clicando em **OK**.

---

## 4. Salvar e Ligar
Toque no ícone de **Check (✔️)** branco dentro do círculo azul no canto inferior direito para salvar definitivamente toda a macro no aparelho! Confirme que a chave geral do MacroDroid está ligada no menu principal do app.

---

## 🔍 Histórico de Resolução de Problemas (Troubleshooting) e Aprendizados Técnicos

Esta seção documenta todos os problemas encontrados durante os testes reais no celular Samsung Galaxy S25 e como eles foram resolvidos. Isso servirá de referência técnica se você precisar reconfigurar seu celular ou o da Ana:

### 1. O Mistério das Quebras de Linha (`Unexpected char 0x0a` na Autenticação)
* **Problema:** A ação de envio de dados HTTP POST falhava instantaneamente com erro: `IllegalArgumentException: Unexpected char 0x0a`.
* **Causa:** Ao copiar e colar os tokens do Supabase, o Android inseriu caracteres invisíveis de quebra de linha (`\n` ou `0x0a` em hexadecimal).
* **Solução:** Os cabeçalhos `apikey` e `Authorization` devem ser colados como uma **linha de texto 100% contínua e sem quebras**.

### 2. O Comportamento do "Substituir todos" (Regex Wildcard `.` Limpando Variáveis)
* **Problema:** A variável `valor_raw` ficava completamente vazia após rodar a Ação 4, gerando erro **HTTP 400 (Bad Request)** no Supabase.
* **Causa:** O ponto final `.` é um curinga em expressões regulares que significa "qualquer caractere". Logo, a macro substituía todos os caracteres por nada.
* **Solução:** O ponto deve ser escapado com uma barra invertida no campo de busca: `\.`

### 3. Evitando Caracteres Não-Numéricos (`R$` e Espaços no Supabase)
* **Problema:** A extração capturava o termo `"R$ 33,00"`, o que quebra a validação numérica decimal do banco de dados (que exige `33.00`).
* **Solução:** Usamos Lookbehind Positivo no Regex da Ação 3: `(?<=R\$\s?)[\d\.]+,\d{2}` para ignorar o "R$" e o espaço, extraindo apenas os dígitos puros.

### 4. Por que o Pop-up de Teste apareceu com `R$ ?` sem o valor da compra?
* **Problema:** Durante testes manuais no WhatsApp, o pop-up abriu como: *"Registrar compra de R$ ?"* sem carregar o valor.
* **Causa:** O teste enviado foi: `"compra 3,75 aprovada"`. Como a mensagem não continha o símbolo **`R$`** antes dos dígitos, o extrator Regex (Ação 3) ignorou a mensagem por segurança, deixando a variável vazia.
* **Solução:** Os testes e mensagens reais devem sempre incluir o símbolo **`R$`** antes do valor (ex: `compra de R$ 3,75 aprovada`) para que a macro funcione perfeitamente.

---

## 🚀 Como o Novo Fluxo de Aprovação Expressa Funciona

```mermaid
graph TD
    A[Notificação de Banco Recebida] --> B{Possui padrão R$ XX,XX?}
    B -- Não --> C[Macro ignora silenciosamente]
    B -- Sim --> D[Ação 1: Gera ID md-system_time]
    D --> E[Ação 2: Guarda Data AAAA-MM-DD]
    E --> F[Ação 3: Extrai dígitos ex: 75,00]
    F --> G[Ação 4: Remove ponto de milhar ex: 1250,00]
    G --> H[Ação 5: Troca vírgula por ponto ex: 75.00]
    H --> I[Ação 6: Exibe pop-up no celular do usuário]
    I --> J{Escolha do usuário?}
    J -- CANCELAR --> K[Fim da macro - nada é enviado]
    J -- APROVAR --> L[Ação 7: Envia Requisição HTTP POST ao Supabase com status 'confirmed']
    L --> M[Despesa lançada e computada na hora no MoneyAcker de todos!]
```

---

## 📤 Como Compartilhar/Importar para Outro Celular (Ex: Celular da Ana)

Você não precisa refazer toda a configuração do zero no celular da Ana. O MacroDroid permite exportar e importar a macro de forma extremamente rápida:

### Passo 1: No seu Celular (Exportar)
1. Abra o **MacroDroid** e vá na aba **Macros**.
2. Toque e segure na macro `Money Acker Notify`.
3. Toque nos **três pontinhos (...)** no canto superior direito e selecione **Compartilhar** (Share).
4. Envie pelo **WhatsApp** diretamente para o contato da Ana (isso enviará um arquivo `.macro`).

### Passo 2: No Celular dela (Importar)
1. Certifique-se de que o **MacroDroid** está instalado no celular dela.
2. No WhatsApp dela, toque no arquivo `.macro` recebido.
3. Escolha abrir com o **MacroDroid**.
4. A macro abrirá inteiramente configurada com as chaves e o fluxo de pop-up!
5. Toque no ícone de **Check (✔️)** azul no canto inferior direito para salvar.

> [!IMPORTANT]
> **Únicos ajustes necessários no celular da Ana:**
> 1. **Permissões:** Conceda ao MacroDroid dela a permissão de **Acesso às Notificações** no Android.
> 2. **Aplicativos de Banco:** Dê dois toques no gatilho vermelho (Notificação Recebida), selecione **Configurar** e marque os aplicativos de banco instalados no celular dela (como Nubank, Itaú, etc.). Salve após alterar!


