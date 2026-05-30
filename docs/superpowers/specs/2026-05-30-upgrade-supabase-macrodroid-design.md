# Especificação Técnica: Sincronização Supabase & Integração MacroDroid

Esta especificação técnica serve para orientar futuros agentes de IA e desenvolvedores sobre a arquitetura do **MoneyAcker**, a integração com o Supabase (Realtime) e a captura automática de notificações via MacroDroid.

---

## 🎯 Objetivo Geral
Permitir que múltiplos dispositivos (especificamente usados pelo usuário Jacson e sua esposa Ana) acessem a aplicação web em tempo real através da nuvem, compartilhando dados de transações, orçamentos, cartões e categorias sem servidores dedicados ou fluxos complexos de autenticação, e recebendo lançamentos automáticos "pendentes" a partir das notificações bancárias do celular de Jacson.

---

## 🚀 Arquitetura de Dados e Integração

```mermaid
graph TD
    subgraph Cliente (Web App)
        UI[Interface HTML/CSS] <--> JS[Controlador app.js]
        JS <--> LS[LocalStorage Cache]
    end

    subgraph Supabase (Backend/Nuvem)
        API[API REST Automática]
        DB[(PostgreSQL)]
        Realtime[Canais Realtime WebSockets]
    end

    subgraph Dispositivo Móvel
        MD[MacroDroid Android]
        Notif[Notificações Bancárias]
    end

    Notif -->|Trigger| MD
    MD -->|Regex & HTTP POST| API
    API -->|Persiste| DB
    JS -->|Upsert/Delete| API
    DB -->|postgres_changes| Realtime
    Realtime -->|Push event| JS
    JS -->|Render| UI
```

---

## 💾 Modelagem do Banco de Dados (Supabase/PostgreSQL)

O schema do banco de dados está localizado em `supabase_schema.sql`. Ele define quatro tabelas principais:

### 1. `categories`
Armazena as categorias de despesa e receita, tanto as padrões quanto as customizadas.
* `id` (text, PK)
* `name` (text, not null)
* `icon` (text, not null) - Emoji utilizado na listagem
* `color` (text, not null) - Cor em formato Hexadecimal (`#rrggbb`)
* `type` (text, not null) - `'expense'` ou `'income'`
* `created_at` (timestamp with time zone, default: now)

### 2. `cards`
Cadastra cartões de crédito para calcular limites e gerar faturas parceladas.
* `id` (text, PK)
* `name` (text, not null)
* `limit_amount` (numeric, not null)
* `closing_day` (integer, not null) - Dia de fechamento da fatura
* `due_day` (integer, not null) - Dia de vencimento da fatura
* `color` (text, not null) - Cor do gradiente do cartão
* `created_at` (timestamp with time zone, default: now)

### 3. `budgets`
Gerencia limites mensais por categoria.
* `category_id` (text, PK, FK -> categories.id)
* `limit_amount` (numeric, not null)
* `created_at` (timestamp with time zone, default: now)

### 4. `transactions`
Registra toda movimentação financeira do sistema.
* `id` (text, PK)
* `amount` (numeric, not null)
* `description` (text, not null)
* `date` (date, not null)
* `category` (text, FK -> categories.id)
* `type` (text, not null) - `'expense'` ou `'income'`
* `payment_method` (text, default: `'cash'`) - ID do cartão associado ou `'cash'` (saldo)
* `installment_id` (text, nullable) - ID comum agrupando parcelas de uma compra
* `installment_number` (integer, nullable) - Número da parcela
* `total_installments` (integer, nullable) - Total de parcelas geradas
* `purchase_date` (date, nullable) - Data real da compra
* `status` (text, default: `'confirmed'`) - `'confirmed'` (confirmada) ou `'pending'` (pendente do celular)
* `created_at` (timestamp with time zone, default: now)

---

## 🔒 Segurança (Row Level Security)

* **Políticas RLS:** Como a aplicação web não exige login (compartilhando apenas as credenciais do Supabase no cliente), o RLS está habilitado com políticas que concedem acesso total (`ALL`) de leitura, escrita, atualização e exclusão para a role `anon`.
* **Segurança na Prática:** O banco é protegido pela própria chave `anon` do projeto Supabase.

---

## 📡 Sincronização em Tempo Real (Realtime)

1. **Habilitação:** As tabelas estão inscritas na publicação `supabase_realtime` do PostgreSQL.
2. **Escuta:** No `app.js`, a função `setupRealtimeConnection()` inicializa uma escuta contínua nas tabelas do banco usando WebSockets via `supabase.channel()`.
3. **Resolução de Conflitos:** Ao receber eventos `INSERT`, `UPDATE` ou `DELETE`:
   * O estado local `state` é atualizado correspondendo ao item modificado.
   * A visualização ativa na tela (`refreshActiveView()`) é renderizada de forma reativa e sem cliques, sincronizando múltiplos dispositivos abertos na mesma conta.

---

## 📱 Lógica de Lançamentos Pendentes (MacroDroid)

* As transações inseridas pelo MacroDroid chegam ao banco com a coluna `status` definida como `'pending'`.
* **Exclusão de Cálculos:** Em `app.js`, todas as rotinas de cálculo do Dashboard, evolução de fluxo de caixa, totalizadores de receitas/despesas, gráficos e monitoramento de orçamentos aplicam um filtro explícito para excluir transações pendentes:
  ```javascript
  const transactionsValidas = state.transactions.filter(t => t.status !== 'pending');
  ```
* **Aguardando Confirmação:** O Dashboard exibe um card dinâmico `#pending-panel` se houver transações pendentes. O usuário pode:
  * **Confirmar:** Abre a modal de cadastro preenchida com os dados capturados. Ao submeter, o status muda para `'confirmed'`, a categoria é associada e a transação passa a fazer parte dos saldos oficiais.
  * **Rejeitar:** Remove a transação localmente e no banco de dados.

---

## 🌐 Deploy e Integração Contínua
* **Vercel:** O projeto está implantado em `https://moneyacker.vercel.app/` integrado à branch `main` do repositório privado do GitHub `Ackerss/moneyacker`. Qualquer commit ou alteração no branch atualiza o site na nuvem automaticamente.
