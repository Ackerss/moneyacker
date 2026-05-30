# Janelas de Confirmação de Exclusão Premium - Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar modais modernos e seguros de confirmação para exclusão de transações (comuns e parceladas), categorias e cartões no MoneyAcker, evitando exclusões acidentais.

**Architecture:** Implementação de duas modais estilizadas diretamente no `index.html` e controle via funções utilitárias no `app.js` (`showConfirmDeleteModal` e `showConfirmInstallmentModal`).

**Tech Stack:** HTML5, CSS3 vanilla (estilos compartilhados), JavaScript vanilla.

---

### Task 1: Modais Customizados no HTML
**Files:**
*   Modify: `c:\Users\NATUBRAVA\Meu Drive (jacsonsax@gmail.com)\ANTIGRAVITY\MONEYACKER\index.html`

- [ ] **Step 1: Adicionar o HTML das modais antes do fechamento do `<body>`**
    Adicionar os overlays e modais de confirmação simples e confirmação de parcelados:
    ```html
    <!-- 12. MODAL: CONFIRMAÇÃO DE EXCLUSÃO SIMPLES -->
    <div class="modal-overlay" id="confirm-delete-modal">
      <div class="modal" style="max-width: 400px; text-align: center;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          <div style="background-color: var(--expense-light); color: var(--expense); width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 30px; height: 30px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;" id="confirm-delete-title">Excluir Item?</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin: 0;" id="confirm-delete-message">Tem certeza?</p>
          <div style="display: flex; gap: 0.75rem; width: 100%; margin-top: 1rem;">
            <button class="btn" id="btn-confirm-delete-cancel" style="flex: 1; padding: 0.75rem; border-radius: 10px; border: 1.5px solid var(--border-color); background: none; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: var(--transition-fast);">Cancelar</button>
            <button class="btn" id="btn-confirm-delete-execute" style="flex: 1; padding: 0.75rem; border-radius: 10px; border: none; background-color: var(--expense); font-weight: 600; color: white; cursor: pointer; transition: var(--transition-fast);">Excluir</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 13. MODAL: CONFIRMAÇÃO DE COMPRA PARCELADA -->
    <div class="modal-overlay" id="confirm-installment-modal">
      <div class="modal" style="max-width: 440px; text-align: center;">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
          <div style="background-color: #fef3c7; color: #d97706; width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 30px; height: 30px;">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">Excluir Compra Parcelada?</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin: 0;" id="confirm-installment-message">Esta despesa faz parte de uma compra parcelada. Como deseja proceder?</p>
          <div style="display: flex; flex-direction: column; gap: 0.6rem; width: 100%; margin-top: 1rem;">
            <button class="btn" id="btn-confirm-inst-all" style="width: 100%; padding: 0.75rem; border-radius: 10px; border: none; background-color: var(--expense); font-weight: 600; color: white; cursor: pointer; transition: var(--transition-fast);">⚠️ Excluir TODAS as parcelas</button>
            <button class="btn" id="btn-confirm-inst-single" style="width: 100%; padding: 0.75rem; border-radius: 10px; border: 1.5px solid var(--border-color); background-color: var(--bg-secondary); font-weight: 600; color: var(--text-primary); cursor: pointer; transition: var(--transition-fast);">Excluir APENAS esta parcela</button>
            <button class="btn" id="btn-confirm-inst-cancel" style="width: 100%; padding: 0.75rem; border-radius: 10px; border: none; background: none; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: var(--transition-fast);">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
    ```

---

### Task 2: Implementação JavaScript dos Controles e Lógica
**Files:**
*   Modify: `c:\Users\NATUBRAVA\Meu Drive (jacsonsax@gmail.com)\ANTIGRAVITY\MONEYACKER\app.js`

- [ ] **Step 1: Criar as variáveis de callback e funções controladoras no final do `app.js`**
    ```javascript
    let deleteConfirmCallback = null;
    let installmentSingleCallback = null;
    let installmentAllCallback = null;

    function showConfirmDeleteModal({ title, message, onConfirm }) {
      const modal = document.getElementById('confirm-delete-modal');
      const titleEl = document.getElementById('confirm-delete-title');
      const messageEl = document.getElementById('confirm-delete-message');
      
      if (!modal) return;
      titleEl.textContent = title || 'Excluir Item?';
      messageEl.textContent = message || 'Tem certeza?';
      
      deleteConfirmCallback = onConfirm;
      modal.classList.add('active');
    }

    function closeConfirmDeleteModal() {
      const modal = document.getElementById('confirm-delete-modal');
      if (modal) modal.classList.remove('active');
      deleteConfirmCallback = null;
    }

    function showConfirmInstallmentModal({ message, onConfirmSingle, onConfirmAll }) {
      const modal = document.getElementById('confirm-installment-modal');
      const messageEl = document.getElementById('confirm-installment-message');
      
      if (!modal) return;
      if (message) messageEl.textContent = message;
      
      installmentSingleCallback = onConfirmSingle;
      installmentAllCallback = onConfirmAll;
      modal.classList.add('active');
    }

    function closeConfirmInstallmentModal() {
      const modal = document.getElementById('confirm-installment-modal');
      if (modal) modal.classList.remove('active');
      installmentSingleCallback = null;
      installmentAllCallback = null;
    }
    ```

- [ ] **Step 2: Configurar os event listeners para as novas modais (no final do `app.js` ou junto com a inicialização)**
    ```javascript
    document.getElementById('btn-confirm-delete-cancel').addEventListener('click', closeConfirmDeleteModal);
    document.getElementById('btn-confirm-delete-execute').addEventListener('click', () => {
      if (deleteConfirmCallback) deleteConfirmCallback();
      closeConfirmDeleteModal();
    });

    document.getElementById('btn-confirm-inst-cancel').addEventListener('click', closeConfirmInstallmentModal);
    document.getElementById('btn-confirm-inst-single').addEventListener('click', () => {
      if (installmentSingleCallback) installmentSingleCallback();
      closeConfirmInstallmentModal();
    });
    document.getElementById('btn-confirm-inst-all').addEventListener('click', () => {
      if (installmentAllCallback) installmentAllCallback();
      closeConfirmInstallmentModal();
    });
    ```

- [ ] **Step 3: Substituir a função `deleteCategory(id, type)` para usar a confirmação customizada**
    ```javascript
    function deleteCategory(id, type) {
      const inUse = state.transactions.some(t => t.category === id);
      if (inUse) {
        showToast("Não é possível excluir esta categoria pois ela possui transações vinculadas.", true);
        return;
      }
      
      const cat = state.categories[type].find(c => c.id === id);
      const catName = cat ? ` "${cat.icon} ${cat.name}"` : '';

      showConfirmDeleteModal({
        title: 'Excluir Categoria?',
        message: `Tem certeza que deseja excluir a categoria${catName}? Esta ação não pode ser desfeita.`,
        onConfirm: () => {
          state.categories[type] = state.categories[type].filter(c => c.id !== id);
          if (state.budgets[id]) {
            delete state.budgets[id];
          }
          saveState();
          dbDeleteCategory(id);
          renderSettingsCategories();
          showToast("Categoria excluída!");
        }
      });
    }
    ```

- [ ] **Step 4: Substituir a função `deleteCard(id)` para usar a confirmação customizada**
    ```javascript
    function deleteCard(id) {
      const card = state.cards.find(c => c.id === id);
      const cardName = card ? ` "💳 ${card.name}"` : '';
      const inUse = state.transactions.some(t => t.paymentMethod === id);
      
      if (inUse) {
        showConfirmDeleteModal({
          title: 'Excluir Cartão em Uso?',
          message: `Este cartão${cardName} possui despesas vinculadas. Se você o excluir, essas despesas continuarão registradas, mas perderão a associação com o cartão. Deseja continuar?`,
          onConfirm: () => {
            state.transactions = state.transactions.map(t => {
              if (t.paymentMethod === id) {
                return { ...t, paymentMethod: 'cash' };
              }
              return t;
            });
            executeDeleteCard(id);
          }
        });
      } else {
        showConfirmDeleteModal({
          title: 'Excluir Cartão de Crédito?',
          message: `Tem certeza que deseja excluir o cartão${cardName}? Esta ação não pode ser desfeita.`,
          onConfirm: () => {
            executeDeleteCard(id);
          }
        });
      }
    }

    function executeDeleteCard(id) {
      state.cards = state.cards.filter(c => c.id !== id);
      saveState();
      dbDeleteCard(id);
      renderSettingsCards();
      showToast("Cartão excluído com sucesso!");
    }
    ```

- [ ] **Step 5: Substituir a função `deleteTransactionHandler(id, callback)` para usar a confirmação customizada**
    ```javascript
    function deleteTransactionHandler(id, callback) {
      const transToDelete = state.transactions.find(t => t.id === id);
      if (!transToDelete) return;

      if (transToDelete.installmentId) {
        showConfirmInstallmentModal({
          message: `A despesa "${transToDelete.description}" faz parte de uma compra parcelada. Como deseja excluí-la?`,
          onConfirmSingle: () => {
            state.transactions = state.transactions.filter(t => t.id !== id);
            dbDeleteTransaction(id);
            saveState();
            showToast("Apenas esta parcela foi excluída.");
            if (callback) callback();
          },
          onConfirmAll: async () => {
            const installmentsToDelete = state.transactions.filter(t => t.installmentId === transToDelete.installmentId);
            state.transactions = state.transactions.filter(t => t.installmentId !== transToDelete.installmentId);
            installmentsToDelete.forEach(async t => {
              await dbDeleteTransaction(t.id);
            });
            saveState();
            showToast("Todas as parcelas foram excluídas!");
            if (callback) callback();
          }
        });
      } else {
        showConfirmDeleteModal({
          title: 'Excluir Transação?',
          message: `Tem certeza que deseja excluir a transação "${transToDelete.description}" no valor de ${formatCurrency(transToDelete.amount)}?`,
          onConfirm: () => {
            state.transactions = state.transactions.filter(t => t.id !== id);
            dbDeleteTransaction(id);
            saveState();
            showToast("Transação excluída com sucesso!");
            if (callback) callback();
          }
        });
      }
    }
    ```

---

### Task 3: Estilização de Hover e Pequenos Ajustes CSS
**Files:**
*   Modify: `c:\Users\NATUBRAVA\Meu Drive (jacsonsax@gmail.com)\ANTIGRAVITY\MONEYACKER\style.css`

- [ ] **Step 1: Adicionar estilos de hover e foco para os botões das modais customizadas no final de `style.css`**
    ```css
    #btn-confirm-delete-cancel:hover, #btn-confirm-inst-single:hover {
      background-color: var(--bg-primary) !important;
      border-color: var(--text-secondary) !important;
    }

    #btn-confirm-delete-execute:hover, #btn-confirm-inst-all:hover {
      filter: brightness(0.9) !important;
    }

    #btn-confirm-inst-cancel:hover {
      color: var(--text-primary) !important;
    }
    ```
