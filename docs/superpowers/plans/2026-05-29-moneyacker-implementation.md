# MoneyAcker Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma aplicação web de página única (SPA) premium, responsiva e completa para controle financeiro pessoal (MoneyAcker), baseada no design clássico do Mobills em modo claro elegante, com persistência local e gráficos interativos.

**Architecture:** Estrutura limpa de arquivos estáticos (HTML5, CSS3, JS Vanilla) que rodam diretamente em qualquer navegador, persistindo os dados no `localStorage` e integrando gráficos com Chart.js.

**Tech Stack:** HTML5, CSS3 Vanilla, JavaScript (ES6+), Chart.js (via CDN).

---

## Proposed Changes

### Component 1: Design System & HTML Shell
Criar os alicerces visuais da aplicação com variáveis CSS robustas, layouts flexíveis de duas colunas, menu lateral interativo e o esqueleto semântico das telas do aplicativo.

#### [NEW] [index.html](file:///c:/Users/NATUBRAVA/Meu%20Drive%20%28jacsonsax@gmail.com%29/ANTIGRAVITY/MONEYACKER/index.html)
#### [NEW] [style.css](file:///c:/Users/NATUBRAVA/Meu%20Drive%20%28jacsonsax@gmail.com%29/ANTIGRAVITY/MONEYACKER/style.css)

- [ ] **Step 1: Criar o arquivo index.html base com tags SEO, fontes Outfit do Google Fonts e contêineres principais.**
- [ ] **Step 2: Criar o arquivo style.css com o sistema de design completo (cores, sombras, tipografia, reset global, sidebar responsiva e cartões de resumo).**
- [ ] **Step 3: Verificar visualmente abrindo o index.html no navegador local.**

---

### Component 2: Estado da Aplicação & Banco de Dados Local (JavaScript)
Implementar a lógica central do aplicativo, responsável por ler e escrever no `localStorage`, formatar moedas, iniciar dados mockados na primeira execução e gerenciar o estado global de transações e limites.

#### [NEW] [app.js](file:///c:/Users/NATUBRAVA/Meu%20Drive%20%28jacsonsax@gmail.com%29/ANTIGRAVITY/MONEYACKER/app.js)

- [ ] **Step 1: Criar o esqueleto do app.js com constantes de categorias padrão, estrutura de dados inicial e persistência em localStorage.**
- [ ] **Step 2: Desenvolver as funções utilitárias de formatação monetária (BRL) e de datas em português.**
- [ ] **Step 3: Testar no console do navegador que os dados iniciais estão salvos e são lidos corretamente.**

---

### Component 3: Formulários & Modais de Transações
Adicionar a capacidade de registrar novas Receitas e Despesas por meio de modais dinâmicos, com validação de campos, preenchimento automático de categorias e atualizações automáticas do estado.

- [ ] **Step 1: Inserir a marcação HTML dos modais de cadastro no index.html com campos de Valor, Descrição, Data, Categoria e Tipo.**
- [ ] **Step 2: Implementar em style.css a estilização premium do modal (overlay translúcido, transições suaves, inputs estilizados).**
- [ ] **Step 3: Implementar a lógica JS em app.js para abrir/fechar modais, validar e salvar novas transações.**
- [ ] **Step 4: Verificar o registro correto de transações manuais no armazenamento local.**

---

### Component 4: Dashboard Dinâmico & Lista de Transações
Calcular em tempo real os resumos de Receitas, Despesas e Saldo, renderizando dinamicamente os cartões informativos e a lista das transações mais recentes com filtros avançados.

- [ ] **Step 1: Escrever as funções de renderização dos cards (Receitas, Despesas, Saldo) atualizando o DOM no app.js.**
- [ ] **Step 2: Implementar a tabela/lista dinâmica de transações com ícones e cores diferentes para receitas e despesas.**
- [ ] **Step 3: Adicionar a lógica de filtros por tipo, busca textual e categoria na aba de Transações.**
- [ ] **Step 4: Validar a funcionalidade de exclusão de transações.**

---

### Component 5: Sistema de Planejamento e Orçamentos
Criar o controle de metas de gastos por categorias, permitindo definir limites e ver barras de progresso inteligentes que mudam de cor conforme o gasto se aproxima do limite.

- [ ] **Step 1: Adicionar a tela de Orçamentos no index.html com cartões para cada categoria ativa.**
- [ ] **Step 2: Adicionar estilos para as barras de progresso dinâmicas em style.css.**
- [ ] **Step 3: Programar em app.js o cálculo de gastos acumulados do mês por categoria contra os limites configurados e atualizar a barra e a porcentagem.**
- [ ] **Step 4: Adicionar modal para configurar/alterar o limite de uma categoria específica.**

---

### Component 6: Gráficos Interativos (Chart.js)
Integrar a biblioteca Chart.js para desenhar gráficos de rosca e barras dinâmicos que se adaptam aos dados cadastrados, com transições atraentes e legibilidade impecável.

- [ ] **Step 1: Importar o Chart.js via CDN no index.html.**
- [ ] **Step 2: Criar contêineres canvas estilizados para o gráfico de despesas por categoria e evolução mensal.**
- [ ] **Step 3: Escrever a lógica em app.js para processar os dados em formato consumível pelo Chart.js e gerar os gráficos.**
- [ ] **Step 4: Implementar a destruição e recriação dos gráficos ao inserir/deletar transações para evitar bugs visuais.**

---

## Verification Plan

### Manual Verification
1. Abrir a aplicação no Google Chrome.
2. Inserir uma despesa de R$ 50,00 na categoria "Alimentação".
3. Inserir uma receita de R$ 3.000,00 na categoria "Salário".
4. Confirmar se o Saldo Atual mostra R$ 2.950,00.
5. Ir até a aba "Orçamentos", definir um limite de R$ 100,00 para "Alimentação" e checar se a barra está em 50% (verde).
6. Adicionar mais R$ 60,00 em "Alimentação" e conferir se a barra mudou para vermelho indicando estouro de limite (R$ 110/100).
7. Verificar se o gráfico de rosca exibe corretamente as proporções de gastos por categoria.
8. Atualizar a página (F5) e garantir que todos os dados continuam preenchidos.
