# Design Spec: MoneyAcker Personal Finance App

Este documento detalha as especificações de design e arquitetura para o **MoneyAcker**, um aplicativo web de controle financeiro pessoal, de uso local e totalmente personalizado.

---

## 1. Diretrizes de Design (Tema Claro Premium - Clean & Pristine)

O aplicativo foi projetado com uma interface limpa, minimalista e profissional, inspirada nas melhores fintechs modernas. O objetivo é transmitir clareza, segurança e facilidade de visualização dos dados financeiros.

### Paleta de Cores (CSS Variables)

```css
:root {
  --bg-primary: #f8fafc;       /* Fundo principal suave (Slate 50) */
  --bg-secondary: #ffffff;     /* Fundo dos cartões e painéis (Branco) */
  --text-primary: #0f172a;     /* Título e textos principais (Slate 900) */
  --text-secondary: #475569;   /* Textos secundários e descrições (Slate 600) */
  --text-muted: #94a3b8;       /* Textos discretos e placeholders (Slate 400) */
  
  --primary: #4f46e5;          /* Azul Índigo sofisticado para botões e foco */
  --primary-hover: #4338ca;    
  --primary-light: #e0e7ff;    /* Fundo suave para elementos ativos */
  
  --income: #059669;           /* Verde Esmeralda para Receitas */
  --income-light: #d1fae5;     /* Fundo verde claro translúcido */
  
  --expense: #ef4444;          /* Coral/Vermelho vibrante para Despesas */
  --expense-light: #fee2e2;    /* Fundo vermelho claro translúcido */
  
  --warning: #f59e0b;          /* Amarelo/Laranja para alertas de orçamento */
  --warning-light: #fef3c7;
  
  --border-color: #e2e8f0;     /* Bordas suaves (Slate 200) */
  --card-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
  --modal-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
}
```

### Tipografia
* **Fonte Principal:** `Outfit`, carregada via Google Fonts. Caso não carregue, utiliza o fallback sans-serif padrão do sistema (`system-ui`).
* **Hierarquia:**
  * Títulos de seções com peso `600` ou `700` para destaque visual.
  * Valores monetários em negrito e tamanho destacado para rápida absorção.

### Efeitos Visuais & Micro-animações
* **Bordas Suaves & Sombras:** Transição fluida de elevação no hover dos cartões.
* **Modais Animados:** Entrada suave de baixo para cima com desfoque de fundo no overlay.
* **Feedback de Ação:** Botões com efeitos de escala sutil ao serem clicados.

---

## 2. Arquitetura de Informação e Seções

A tela principal adota um layout responsivo de **duas colunas (Desktop)** que se adapta a uma **coluna única (Mobile)**.

### A. Menu Lateral (Sidebar)
* Logo da aplicação (**MoneyAcker**).
* Links de navegação com ícones SVG modernos integrados:
  1. **Dashboard** (Visão geral)
  2. **Transações** (Listagem detalhada e busca)
  3. **Orçamentos** (Metas por categorias)
  4. **Configurações** (Categorias personalizadas e reset de dados)

### B. Dashboard (Painel Principal)
* **Cartões de Resumo:**
  * **Receitas:** Total do mês atual com indicador de crescimento.
  * **Despesas:** Total acumulado de despesas.
  * **Saldo:** Balanço total (Receitas - Despesas). Muda de cor de destaque baseado em positivo/negativo.
* **Área de Gráficos (Chart.js via CDN):**
  * **Evolução de Fluxo:** Gráfico de linhas mostrando entradas vs. saídas por dia/mês.
  * **Distribuição:** Gráfico de Rosca (Doughnut) das despesas divididas por categorias.
* **Transações Recentes:**
  * Uma tabela limpa com as últimas 5 transações inseridas, permitindo exclusão direta para facilitar correções rápidas.
  * Botões flutuantes ou de cabeçalho destacados para `+ Nova Receita` e `+ Nova Despesa`.

### C. Gestão de Transações (Extrato)
* Lista completa de todas as transações cadastradas.
* Filtros por Tipo (Todas, Receitas, Despesas), Categoria, e campo de busca textual de descrição.

### D. Planejamento (Limites de Orçamento)
* Configuração de limite máximo de gasto por categoria.
* Barra de progresso visual que se preenche conforme as despesas são adicionadas.
* A barra muda de cor (`--income` para seguro, `--warning` quando ultrapassa 80% do limite, e `--expense` quando atinge ou passa 100%).

---

## 3. Armazenamento & Tecnologias
* **Client-side Pure HTML/CSS/JS:** Sem dependências ou ferramentas de build complicadas para máxima performance local.
* **Local Storage:** Os dados são serializados em JSON e salvos na chave `moneyacker_data` do navegador local.
* **Visualização de Dados:** Integração limpa com a biblioteca *Chart.js* via CDN oficial.
