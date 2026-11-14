# Especificação de Design: Janelas de Confirmação de Exclusão Premium

## Objetivo
Implementar janelas de confirmação de exclusão totalmente customizadas e integradas ao visual premium do MoneyAcker. Isso evita que transações comuns, parceladas, categorias e cartões sejam excluídos acidentalmente, e resolve a experiência confusa de exclusão de parcelados do confirm nativo.

## Alterações Propostas

### 1. Estrutura HTML (`index.html`)
Adicionar duas modais estilizadas antes do fechamento da tag `<body>`:
*   `confirm-delete-modal`: Modal genérica para exclusões simples (transações individuais, categorias e cartões).
*   `confirm-installment-modal`: Modal com 3 botões específicos para exclusões de despesas parceladas.

### 2. Estilização CSS (`style.css`)
Aproveitar os estilos existentes de `.modal-overlay` e `.modal`, adicionando apenas estilos de hover para os botões do modal de confirmação para garantir transições suaves e feedback visual adequado ao usuário.

### 3. Lógica JavaScript (`app.js`)
*   Criar a lógica controladora em JavaScript para os dois modais de confirmação.
*   Integrar as exclusões existentes de transações comuns, parcelas, categorias e cartões com os novos modais.

## Verificação
*   Testar a exclusão de uma transação comum (deve pedir confirmação e excluir ao confirmar).
*   Testar a exclusão de uma transação parcelada (deve abrir 3 opções: excluir só a selecionada, excluir todas, ou cancelar).
*   Testar a exclusão de categorias (deve pedir confirmação se não estiver em uso).
*   Testar a exclusão de cartões (deve pedir confirmação alertando sobre as despesas vinculadas).
