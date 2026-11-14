# Plano de Implementação: Sincronização Supabase & Integração MacroDroid

> **Histórico de Execução:** Este plano de implementação lista as tarefas realizadas para migrar a persistência local do MoneyAcker para a nuvem do Supabase, configurar sincronização em tempo real e habilitar entrada de notificações do celular via MacroDroid.

---

## 📋 Lista de Tarefas Concluídas

### Tarefa 1: Banco de Dados e Schema SQL
- [x] Desenhar a modelagem relacional de tabelas (`categories`, `cards`, `budgets`, `transactions`)
- [x] Criar o arquivo `supabase_schema.sql` contendo o DDL
- [x] Pré-popular categorias padrão no script SQL
- [x] Escrever comandos para habilitar Realtime (replicação postgres)
- [x] Configurar políticas de Row Level Security (RLS) liberando acesso anon

### Tarefa 2: Interface HTML e CSS
- [x] Modificar `index.html` para incluir script da CDN oficial do Supabase JS v2
- [x] Criar no Dashboard o painel visual `#pending-panel` ("Aguardando Confirmação")
- [x] Adicionar o formulário de credenciais Supabase e indicadores de status de conexão na aba de Configurações
- [x] Estilizar os cards de transações pendentes no `style.css` com botões rápidos de "Confirmar" e "Rejeitar"
- [x] Estilizar o status de conexão com bolinhas brilhantes/piscantes reativas em `style.css`

### Tarefa 3: Lógica e Conexão em app.js
- [x] Implementar fallback offline seguro com cache local no `localStorage`
- [x] Implementar funções assíncronas de busca relacional do estado inicial no banco
- [x] Implementar funções de persistência de escrita assíncronas no Supabase (`dbUpsertTransaction`, `dbDeleteTransaction`, etc.)
- [x] Configurar WebSockets com `supabase.channel()` para escuta em tempo real de eventos PostgreSQL (`INSERT`, `UPDATE`, `DELETE`)
- [x] Atualizar rotinas de renderização e cálculo do Dashboard para ignorar transações pendentes (`status === 'pending'`)
- [x] Configurar fluxo de aprovação e edição de transações pendentes via modal de despesa existente
- [x] Adicionar lógica para salvar e desconectar credenciais do Supabase na aba Configurações

### Tarefa 4: Guia MacroDroid
- [x] Criar arquivo `MACRODROID_SETUP.md` com instruções ilustradas para configuração
- [x] Definir regex de captura de valores brasileiros `R$\s?([\d\.]+,\d{2})`
- [x] Escrever fluxo de manipulação de string para converter o valor para o padrão americano `1234.56`
- [x] Configurar o JSON e os cabeçalhos do HTTP POST apontando diretamente para a API REST do Supabase

### Tarefa 5: Deploy e Controle de Versão
- [x] Inicializar o repositório Git local
- [x] Commit Geral dos arquivos do projeto
- [x] Conectar com o repositório do GitHub `Ackerss/moneyacker`
- [x] Fazer push para a branch `main` do GitHub
- [x] Atualizar `README.md` com a URL final de produção da Vercel (`https://moneyacker.vercel.app/`)

---

## 🛡️ Validação Técnica Realizada
* Verificação de sintaxe básica em `app.js` usando o compilador Node.js (`node -c app.js`) garantindo zero erros de fechamento de blocos ou parênteses.
