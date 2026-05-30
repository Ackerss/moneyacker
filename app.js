/* -------------------------------------------------------------
 * MoneyAcker - Application Controller (JavaScript)
 * ------------------------------------------------------------- */

// 1. Definições de Categorias Padrão
const DEFAULT_CATEGORIES = {
  expense: [
    { id: 'cat-alimentacao', name: 'Alimentação', icon: '🍔', color: '#f59e0b' },
    { id: 'cat-moradia', name: 'Moradia', icon: '🏠', color: '#3b82f6' },
    { id: 'cat-transporte', name: 'Transporte', icon: '🚗', color: '#10b981' },
    { id: 'cat-lazer', name: 'Lazer', icon: '🎮', color: '#ec4899' },
    { id: 'cat-saude', name: 'Saúde', icon: '❤️', color: '#ef4444' },
    { id: 'cat-educacao', name: 'Educação', icon: '📚', color: '#8b5cf6' },
    { id: 'cat-pet', name: 'Pet', icon: '🐶', color: '#06b6d4' },
    { id: 'cat-outros-desp', name: 'Outros (Despesas)', icon: '💸', color: '#64748b' }
  ],
  income: [
    { id: 'cat-salario', name: 'Salário', icon: '💼', color: '#10b981' },
    { id: 'cat-investimentos', name: 'Investimentos', icon: '📈', color: '#3b82f6' },
    { id: 'cat-outros-rec', name: 'Outros (Receitas)', icon: '💰', color: '#f59e0b' }
  ]
};

// 2. Estado Global da Aplicação
let state = {
  transactions: [],
  categories: { ...DEFAULT_CATEGORIES },
  budgets: {
    'cat-alimentacao': 600,
    'cat-lazer': 300,
    'cat-transporte': 250
  },
  cards: []
};

// 3. Gráficos Chart.js Globais (para podermos destruí-los antes de recriar)
let categoryChartInstance = null;
let flowChartInstance = null;

// 4. Inicialização & Persistência de Dados (Supabase + Local Storage Cache)
const DEFAULT_SUPABASE_URL = 'https://gqqjxhfqlbflfrpjnojt.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxcWp4aGZxbGJmbGZycGpub2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTE5OTgsImV4cCI6MjA5NTY2Nzk5OH0._QSbapoTPdRP4_Un3M5-hICi3gwoSlJRUpjP4dXhJ0Y';

let supabaseClient = null;
const isSupabaseDisabled = localStorage.getItem('moneyacker_supabase_disabled') === 'true';
let supabaseUrl = '';
let supabaseKey = '';

if (!isSupabaseDisabled) {
  supabaseUrl = localStorage.getItem('moneyacker_supabase_url') || DEFAULT_SUPABASE_URL;
  supabaseKey = localStorage.getItem('moneyacker_supabase_key') || DEFAULT_SUPABASE_KEY;
}

function loadState() {
  const localData = localStorage.getItem('moneyacker_data');
  if (localData) {
    try {
      state = JSON.parse(localData);
      
      // Sanitização básica se chaves estiverem vazias
      if (!state.transactions) state.transactions = [];
      if (!state.categories || !state.categories.expense) state.categories = { ...DEFAULT_CATEGORIES };
      if (!state.budgets) state.budgets = {};
      if (!state.cards) state.cards = [];
    } catch (e) {
      console.error("Erro ao carregar dados do localStorage cache, inicializando padrão.", e);
      initializeMockData();
    }
  } else {
    initializeMockData();
  }
}

function saveState() {
  localStorage.setItem('moneyacker_data', JSON.stringify(state));
}

// Inicializar cliente do Supabase
async function initSupabase() {
  const statusEl = document.getElementById('connection-status');
  const statusTextEl = document.getElementById('connection-status-text');
  const btnSave = document.getElementById('btn-save-supabase');
  const btnDisconnect = document.getElementById('btn-disconnect-supabase');
  const inputUrl = document.getElementById('supabase-url');
  const inputKey = document.getElementById('supabase-key');
  const toolsSection = document.getElementById('supabase-tools-section');

  if (inputUrl) inputUrl.value = supabaseUrl;
  if (inputKey) inputKey.value = supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    updateConnectionStatus('disconnected', 'Desconectado (Modo Local Offline)');
    if (btnDisconnect) btnDisconnect.style.display = 'none';
    if (toolsSection) toolsSection.style.display = 'none';
    return;
  }

  updateConnectionStatus('connecting', 'Conectando ao Supabase...');

  try {
    if (!window.supabase) {
      throw new Error("Biblioteca do Supabase não foi carregada pelo navegador.");
    }

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

    // Testar conexão buscando categorias
    const { error } = await supabaseClient.from('categories').select('id').limit(1);
    if (error) throw error;

    updateConnectionStatus('connected', 'Conectado em Tempo Real');
    if (btnDisconnect) btnDisconnect.style.display = 'inline-flex';
    if (btnSave) btnSave.textContent = 'Atualizar Conexão';

    // Exibir ferramentas adicionais de dados se conectado
    if (toolsSection) toolsSection.style.display = 'block';

    // Controlar exibição do botão de migração local se existirem dados locais
    const btnMigrate = document.getElementById('btn-migrate-local-data');
    if (btnMigrate) {
      const localData = localStorage.getItem('moneyacker_data_backup') || localStorage.getItem('moneyacker_data');
      let hasRealData = false;
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          hasRealData = (parsed.transactions && parsed.transactions.length > 0 && parsed.transactions.some(t => !t.id.startsWith('mock-'))) ||
                        (parsed.cards && parsed.cards.length > 0 && parsed.cards.some(c => !c.id.startsWith('card-')));
        } catch (e) {}
      }
      btnMigrate.style.display = hasRealData ? 'inline-flex' : 'none';
    }

    // Carregar dados iniciais do Supabase
    await loadStateFromSupabase();
    
    // Configurar escuta em tempo real
    setupRealtimeConnection();
    
    // Atualizar telas
    refreshActiveView();
    showToast("Conectado com sucesso ao Supabase!");
  } catch (err) {
    console.error("Erro de conexão ao Supabase:", err);
    updateConnectionStatus('disconnected', 'Erro de Conexão (Modo Local Offline)');
    if (toolsSection) toolsSection.style.display = 'none';
    showToast("⚠️ Não foi possível conectar ao Supabase. Rodando no modo local.", true);
  }
}

function updateConnectionStatus(status, text) {
  const statusEl = document.getElementById('connection-status');
  const statusTextEl = document.getElementById('connection-status-text');
  if (!statusEl || !statusTextEl) return;

  statusEl.className = `connection-status ${status}`;
  statusTextEl.textContent = text;
}

// Popular dados fictícios de exemplo e cartões no banco do Supabase caso esteja completamente vazio
async function initializeSupabaseMockData() {
  if (!supabaseClient) return;

  try {
    const today = new Date();
    const currentMonthStr = today.toISOString().substring(0, 7);

    // 1. Cartões de crédito padrão
    const defaultCards = [
      { id: 'card-1', name: 'Nubank Roxinho', limit_amount: 3000.00, closing_day: 28, due_day: 5, color: '#8a05be' },
      { id: 'card-2', name: 'Visa Platinum', limit_amount: 8000.00, closing_day: 10, due_day: 17, color: '#0f172a' }
    ];

    for (const card of defaultCards) {
      await supabaseClient.from('cards').insert(card);
    }

    // 2. Orçamentos padrão
    const defaultBudgets = [
      { category_id: 'cat-alimentacao', limit_amount: 600 },
      { category_id: 'cat-lazer', limit_amount: 300 },
      { category_id: 'cat-moradia', limit_amount: 1500 },
      { category_id: 'cat-pet', limit_amount: 250 }
    ];

    for (const budget of defaultBudgets) {
      await supabaseClient.from('budgets').insert(budget);
    }

    // 3. Transações de exemplo
    const defaultTransactions = [
      { id: 'mock-1', amount: 3500.00, description: 'Salário Mensal', date: `${currentMonthStr}-05`, category: 'cat-salario', type: 'income', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-2', amount: 1200.00, description: 'Aluguel do Apartamento', date: `${currentMonthStr}-10`, category: 'cat-moradia', type: 'expense', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-3', amount: 320.50, description: 'Supermercado Mensal', date: `${currentMonthStr}-12`, category: 'cat-alimentacao', type: 'expense', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-4', amount: 150.00, description: 'Combustível Carro', date: `${currentMonthStr}-15`, category: 'cat-transporte', type: 'expense', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-5', amount: 450.00, description: 'Rendimento Dividendos', date: `${currentMonthStr}-20`, category: 'cat-investimentos', type: 'income', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-6', amount: 180.00, description: 'Jantar com Amigos', date: `${currentMonthStr}-22`, category: 'cat-lazer', type: 'expense', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-8', amount: 120.00, description: 'Ração e Petiscos', date: `${currentMonthStr}-18`, category: 'cat-pet', type: 'expense', payment_method: 'cash', status: 'confirmed' },
      { id: 'mock-7', amount: 85.00, description: 'Farmácia', date: `${currentMonthStr}-25`, category: 'cat-saude', type: 'expense', payment_method: 'cash', status: 'confirmed' }
    ];

    for (const trans of defaultTransactions) {
      await supabaseClient.from('transactions').insert(trans);
    }

    console.log("Mock data inicial inserido com sucesso no Supabase!");
  } catch (err) {
    console.error("Erro ao inicializar dados de exemplo no Supabase:", err);
  }
}

// Carregar dados de forma relacional do Supabase
async function loadStateFromSupabase() {
  if (!supabaseClient) return;
  
  try {
    // Fazer backup de segurança dos dados locais se existirem no localStorage
    const localData = localStorage.getItem('moneyacker_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const hasRealData = (parsed.transactions && parsed.transactions.length > 0 && parsed.transactions.some(t => !t.id.startsWith('mock-'))) ||
                            (parsed.cards && parsed.cards.length > 0 && parsed.cards.some(c => !c.id.startsWith('card-')));
        if (hasRealData && !localStorage.getItem('moneyacker_data_backup') && !localStorage.getItem('moneyacker_data_migrated_backup')) {
          localStorage.setItem('moneyacker_data_backup', localData);
          console.log("Backup de segurança dos dados locais criado com sucesso.");
        }
      } catch (errBackup) {
        console.error("Erro ao fazer backup de segurança dos dados locais:", errBackup);
      }
    }
    // 1. Categorias
    const { data: dbCategories, error: catError } = await supabaseClient.from('categories').select('*');
    if (catError) throw catError;
    
    if (dbCategories && dbCategories.length > 0) {
      state.categories = {
        expense: dbCategories.filter(c => c.type === 'expense').map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color })),
        income: dbCategories.filter(c => c.type === 'income').map(c => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))
      };
    } else {
      // Popular categorias padrão no banco caso esteja vazio
      for (const cat of [...DEFAULT_CATEGORIES.expense, ...DEFAULT_CATEGORIES.income]) {
        const type = DEFAULT_CATEGORIES.expense.find(c => c.id === cat.id) ? 'expense' : 'income';
        await supabaseClient.from('categories').insert({
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: type
        });
      }
      state.categories = { ...DEFAULT_CATEGORIES };
    }
    
    // 2. Cartões
    const { data: dbCards, error: cardError } = await supabaseClient.from('cards').select('*');
    if (cardError) throw cardError;
    
    // 3. Orçamentos
    const { data: dbBudgets, error: budgetError } = await supabaseClient.from('budgets').select('*');
    if (budgetError) throw budgetError;
    
    // 4. Transações
    const { data: dbTransactions, error: transError } = await supabaseClient.from('transactions').select('*');
    if (transError) throw transError;

    // O auto-populamento silencioso de dados de demonstração no Supabase quando vazio foi removido 
    // para permitir que o usuário inicie do zero perfeitamente sem que dados fictícios reapareçam.
    // O usuário pode carregar dados de demonstração a qualquer momento nas configurações.


    state.cards = dbCards ? dbCards.map(c => ({
      id: c.id,
      name: c.name,
      limit: parseFloat(c.limit_amount),
      closingDay: c.closing_day,
      dueDay: c.due_day,
      color: c.color
    })) : [];
    
    state.budgets = {};
    if (dbBudgets) {
      dbBudgets.forEach(b => {
        state.budgets[b.category_id] = parseFloat(b.limit_amount);
      });
    }
    
    state.transactions = dbTransactions ? dbTransactions.map(t => ({
      id: t.id,
      amount: parseFloat(t.amount),
      description: t.description,
      date: t.date,
      category: t.category,
      type: t.type,
      paymentMethod: t.payment_method,
      installmentId: t.installment_id,
      installmentNumber: t.installment_number,
      totalInstallments: t.total_installments,
      purchaseDate: t.purchase_date,
      status: t.status
    })) : [];
    
    saveState(); // Atualiza cache local
  } catch (err) {
    console.error("Erro ao carregar dados do Supabase:", err);
    showToast("⚠️ Falha ao atualizar dados do banco de dados.", true);
  }
}

// Configurar escuta em tempo real do Supabase
function setupRealtimeConnection() {
  if (!supabaseClient) return;

  // Cancela conexões realtime anteriores se existirem
  supabaseClient.channel('moneyacker_realtime').unsubscribe();

  supabaseClient.channel('moneyacker_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
      handleRealtimeEvent('transactions', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, payload => {
      handleRealtimeEvent('categories', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, payload => {
      handleRealtimeEvent('budgets', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, payload => {
      handleRealtimeEvent('cards', payload);
    })
    .subscribe(status => {
      console.log("Status da sincronização em tempo real:", status);
    });
}

function handleRealtimeEvent(table, payload) {
  const event = payload.eventType;
  const newRow = payload.new;
  const oldRow = payload.old;

  console.log(`Evento de Sincronização [${table}] [${event}]:`, payload);

  if (table === 'transactions') {
    if (event === 'DELETE') {
      state.transactions = state.transactions.filter(t => t.id !== oldRow.id);
    } else {
      const mapped = {
        id: newRow.id,
        amount: parseFloat(newRow.amount),
        description: newRow.description,
        date: newRow.date,
        category: newRow.category,
        type: newRow.type,
        paymentMethod: newRow.payment_method,
        installmentId: newRow.installment_id,
        installmentNumber: newRow.installment_number,
        totalInstallments: newRow.total_installments,
        purchaseDate: newRow.purchase_date,
        status: newRow.status
      };
      const idx = state.transactions.findIndex(t => t.id === mapped.id);
      if (idx !== -1) {
        state.transactions[idx] = mapped;
      } else {
        state.transactions.push(mapped);
      }
    }
  }

  if (table === 'categories') {
    if (event === 'DELETE') {
      state.categories.expense = state.categories.expense.filter(c => c.id !== oldRow.id);
      state.categories.income = state.categories.income.filter(c => c.id !== oldRow.id);
    } else {
      const mapped = { id: newRow.id, name: newRow.name, icon: newRow.icon, color: newRow.color };
      const catType = newRow.type;
      const idx = state.categories[catType].findIndex(c => c.id === mapped.id);
      if (idx !== -1) {
        state.categories[catType][idx] = mapped;
      } else {
        state.categories[catType].push(mapped);
      }
    }
  }

  if (table === 'cards') {
    if (event === 'DELETE') {
      state.cards = state.cards.filter(c => c.id !== oldRow.id);
    } else {
      const mapped = {
        id: newRow.id,
        name: newRow.name,
        limit: parseFloat(newRow.limit_amount),
        closingDay: newRow.closing_day,
        dueDay: newRow.due_day,
        color: newRow.color
      };
      const idx = state.cards.findIndex(c => c.id === mapped.id);
      if (idx !== -1) {
        state.cards[idx] = mapped;
      } else {
        state.cards.push(mapped);
      }
    }
  }

  if (table === 'budgets') {
    if (event === 'DELETE') {
      delete state.budgets[oldRow.category_id];
    } else {
      state.budgets[newRow.category_id] = parseFloat(newRow.limit_amount);
    }
  }

  saveState(); // atualiza o cache local do localStorage
  refreshActiveView(); // recarrega a visualização ativa na tela
}

function refreshActiveView() {
  const activeTab = document.querySelector('.nav-item.active');
  if (!activeTab) return;
  const tabId = activeTab.getAttribute('data-tab');
  
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'transactions') {
    renderTransactionsTable();
  } else if (tabId === 'budgets') {
    renderBudgets();
  } else if (tabId === 'settings') {
    renderSettingsCategories();
    renderSettingsCards();
  }
}

// Funções de Persistência Assíncronas no Supabase (Escritas)
async function dbUpsertTransaction(trans) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('transactions').upsert({
      id: trans.id,
      amount: trans.amount,
      description: trans.description,
      date: trans.date,
      category: trans.category,
      type: trans.type,
      payment_method: trans.paymentMethod || 'cash',
      installment_id: trans.installmentId || null,
      installment_number: trans.installmentNumber || null,
      total_installments: trans.totalInstallments || null,
      purchase_date: trans.purchaseDate || null,
      status: trans.status || 'confirmed'
    });
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao salvar transação no Supabase:", e);
    showToast("⚠️ Falha de conexão. Salvo localmente.", true);
  }
}

async function dbDeleteTransaction(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao deletar transação no Supabase:", e);
    showToast("⚠️ Falha de conexão ao excluir no banco.", true);
  }
}

async function dbUpsertCategory(cat, type) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('categories').upsert({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: type
    });
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao salvar categoria no Supabase:", e);
  }
}

async function dbDeleteCategory(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao deletar categoria no Supabase:", e);
  }
}

async function dbUpsertCard(card) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('cards').upsert({
      id: card.id,
      name: card.name,
      limit_amount: card.limit,
      closing_day: card.closingDay,
      due_day: card.dueDay,
      color: card.color
    });
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao salvar cartão no Supabase:", e);
  }
}

async function dbDeleteCard(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('cards').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    console.error("Erro ao deletar cartão no Supabase:", e);
  }
}

async function dbUpsertBudget(catId, limit) {
  if (!supabaseClient) return;
  try {
    if (limit === 0) {
      const { error } = await supabaseClient.from('budgets').delete().eq('category_id', catId);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('budgets').upsert({
        category_id: catId,
        limit_amount: limit
      });
      if (error) throw error;
    }
  } catch (e) {
    console.error("Erro ao salvar orçamento no Supabase:", e);
  }
}


// Migra os dados locais salvos no localStorage (ativos ou backup de segurança) para o banco do Supabase conectado
async function migrateLocalDataToSupabase() {
  if (!supabaseClient) {
    showToast("⚠️ Supabase não está conectado.", true);
    return;
  }

  // Tentar ler primeiro do backup de segurança criado, senão ler do moneyacker_data atual
  const backupDataStr = localStorage.getItem('moneyacker_data_backup') || localStorage.getItem('moneyacker_data');
  if (!backupDataStr) {
    showToast("Nenhum dado local de teste ou configurações antigas foi localizado neste navegador.", true);
    return;
  }

  try {
    const localState = JSON.parse(backupDataStr);
    showToast("Processando importação de dados locais...");

    let importedTransactionsCount = 0;
    let importedCardsCount = 0;
    let importedBudgetsCount = 0;
    let importedCategoriesCount = 0;

    // 1. Migrar Categorias personalizadas (IDs que não começam com cat-alimentacao, cat-moradia, etc.)
    const defaultCatIds = new Set([
      ...DEFAULT_CATEGORIES.expense.map(c => c.id),
      ...DEFAULT_CATEGORIES.income.map(c => c.id)
    ]);

    if (localState.categories) {
      const allLocalCats = [
        ...(localState.categories.expense || []),
        ...(localState.categories.income || [])
      ];

      for (const cat of allLocalCats) {
        if (!defaultCatIds.has(cat.id)) {
          const type = (localState.categories.expense || []).some(c => c.id === cat.id) ? 'expense' : 'income';
          await dbUpsertCategory(cat, type);
          importedCategoriesCount++;
        }
      }
    }

    // 2. Migrar Cartões
    if (localState.cards && localState.cards.length > 0) {
      for (const card of localState.cards) {
        // Mapear propriedades corretas do estado local antes do salvamento
        await dbUpsertCard({
          id: card.id,
          name: card.name,
          limit: card.limit,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          color: card.color
        });
        importedCardsCount++;
      }
    }

    // 3. Migrar Orçamentos
    if (localState.budgets) {
      for (const [catId, limit] of Object.entries(localState.budgets)) {
        if (limit > 0) {
          await dbUpsertBudget(catId, limit);
          importedBudgetsCount++;
        }
      }
    }

    // 4. Migrar Transações (ignorar transações que já começam com mock- para não duplicar mocks padrões)
    if (localState.transactions && localState.transactions.length > 0) {
      const realLocalTransactions = localState.transactions.filter(t => !t.id.startsWith('mock-'));
      for (const trans of realLocalTransactions) {
        await dbUpsertTransaction(trans);
        importedTransactionsCount++;
      }
    }

    // Recarregar o estado atual a partir do Supabase agora com os novos dados importados
    await loadStateFromSupabase();
    refreshActiveView();

    // Renomear a chave no localStorage para marcar como migrado e não processar de novo
    localStorage.removeItem('moneyacker_data_backup');
    localStorage.setItem('moneyacker_data_migrated_backup', backupDataStr);

    showToast(`🎉 Migração concluída! Importados: ${importedTransactionsCount} transações, ${importedCardsCount} cartões e ${importedBudgetsCount} orçamentos.`);
    
    // Ocultar botão de migração após concluir
    const btnMigrate = document.getElementById('btn-migrate-local-data');
    if (btnMigrate) btnMigrate.style.display = 'none';

  } catch (err) {
    console.error("Erro ao migrar dados locais para o Supabase:", err);
    showToast("⚠️ Falha ao processar os dados locais para importação.", true);
  }
}

// Reinserir dados fictícios de exemplo no banco do Supabase conectado
async function loadDemoDataIntoSupabase() {
  if (!supabaseClient) {
    showToast("⚠️ Supabase não está conectado.", true);
    return;
  }

  if (confirm("Deseja popular o banco do Supabase com os dados e transações de exemplo? Isso pode gerar transações de teste no seu painel para demonstração.")) {
    showToast("Gerando dados de exemplo no Supabase...");
    await initializeSupabaseMockData();
    await loadStateFromSupabase();
    refreshActiveView();
    showToast("🎉 Dados de exemplo inseridos com sucesso no Supabase!");
  }
}

// Cria dados iniciais fictícios bonitos para o usuário ver o sistema funcionando
function initializeMockData() {
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
  
  state.categories = { ...DEFAULT_CATEGORIES };
  state.budgets = {
    'cat-alimentacao': 600,
    'cat-lazer': 300,
    'cat-moradia': 1500,
    'cat-pet': 250
  };
  
  state.cards = [
    { id: 'card-1', name: 'Nubank Roxinho', limit: 3000.00, closingDay: 28, dueDay: 5, color: '#8a05be' },
    { id: 'card-2', name: 'Visa Platinum', limit: 8000.00, closingDay: 10, dueDay: 17, color: '#0f172a' }
  ];
  
  state.transactions = [
    {
      id: 'mock-1',
      amount: 3500.00,
      description: 'Salário Mensal',
      date: `${currentMonthStr}-05`,
      category: 'cat-salario',
      type: 'income'
    },
    {
      id: 'mock-2',
      amount: 1200.00,
      description: 'Aluguel do Apartamento',
      date: `${currentMonthStr}-10`,
      category: 'cat-moradia',
      type: 'expense'
    },
    {
      id: 'mock-3',
      amount: 320.50,
      description: 'Supermercado Mensal',
      date: `${currentMonthStr}-12`,
      category: 'cat-alimentacao',
      type: 'expense'
    },
    {
      id: 'mock-4',
      amount: 150.00,
      description: 'Combustível Carro',
      date: `${currentMonthStr}-15`,
      category: 'cat-transporte',
      type: 'expense'
    },
    {
      id: 'mock-5',
      amount: 450.00,
      description: 'Rendimento Dividendos',
      date: `${currentMonthStr}-20`,
      category: 'cat-investimentos',
      type: 'income'
    },
    {
      id: 'mock-6',
      amount: 180.00,
      description: 'Jantar com Amigos',
      date: `${currentMonthStr}-22`,
      category: 'cat-lazer',
      type: 'expense'
    },
    {
      id: 'mock-8',
      amount: 120.00,
      description: 'Ração e Petiscos',
      date: `${currentMonthStr}-18`,
      category: 'cat-pet',
      type: 'expense'
    },
    {
      id: 'mock-7',
      amount: 85.00,
      description: 'Farmácia',
      date: `${currentMonthStr}-25`,
      category: 'cat-saude',
      type: 'expense'
    }
  ];
  
  saveState();
}

// 5. Utilitários de Formatação
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatDate(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getCategoryById(catId) {
  const allCats = [...state.categories.expense, ...state.categories.income];
  return allCats.find(c => c.id === catId) || { name: 'Geral', icon: '💰', color: '#64748b' };
}

// Máscara de valor monetário dinâmica
function setupMoneyMask(inputEl) {
  if (!inputEl) return;
  
  if (!inputEl.value || inputEl.value === '0') {
    inputEl.value = '0,00';
  }

  inputEl.addEventListener('focus', () => {
    if (inputEl.value === '0,00' || inputEl.value === '') {
      inputEl.value = '0,00';
      setTimeout(() => inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length), 0);
    }
  });

  inputEl.addEventListener('input', () => {
    let value = inputEl.value;
    
    // Remove tudo que não é número
    value = value.replace(/\D/g, '');
    
    if (value === '') {
      value = '0';
    }
    
    const integerVal = parseInt(value, 10);
    const decimalVal = integerVal / 100;
    
    inputEl.value = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(decimalVal);
  });
}

function parseMaskedValue(valStr) {
  if (!valStr) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleanStr = valStr.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}

// Notificações Toast
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  
  toastMsg.textContent = message;
  
  if (isError) {
    toast.style.backgroundColor = '#ef4444';
  } else {
    toast.style.backgroundColor = '#0f172a';
  }
  
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// 6. Navegação entre Abas
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');
const pageTitle = document.getElementById('page-title');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const tabId = item.getAttribute('data-tab');
    
    // Altera active no menu
    navItems.forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    
    // Altera active no container
    tabPanes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Altera Título do Header
    const tabNames = {
      dashboard: 'Dashboard',
      transactions: 'Histórico de Transações',
      budgets: 'Planejamento de Orçamentos',
      settings: 'Configurações'
    };
    pageTitle.textContent = tabNames[tabId] || 'Dashboard';
    
    // Ações ao abrir abas específicas
    if (tabId === 'dashboard') {
      renderDashboard();
    } else if (tabId === 'transactions') {
      renderTransactionsTable();
      populateFilterCategories();
    } else if (tabId === 'budgets') {
      renderBudgets();
    } else if (tabId === 'settings') {
      renderSettingsCategories();
      renderSettingsCards();
    }
  });
});

// Exibir Data Atual no Cabeçalho
function renderHeaderDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  const formatted = today.toLocaleDateString('pt-BR', options);
  document.getElementById('header-date').textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// 7. Renderizar Tela Principal (Dashboard)
// 7. Renderizar Tela Principal (Dashboard)
function renderDashboard() {
  // Renderizar o painel de transações pendentes do MacroDroid
  renderPendingTransactions();

  // Filtrar apenas transações confirmadas do mês atual para o dashboard
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7); // YYYY-MM
  
  const currentMonthTransactions = state.transactions.filter(t => t.date.startsWith(currentMonthStr) && t.status !== 'pending');
  
  // Calcular totais
  let totalIncome = 0;
  let totalExpense = 0;
  
  currentMonthTransactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
  });
  
  const totalBalance = totalIncome - totalExpense;
  
  // Atualizar DOM dos Cards
  document.getElementById('dashboard-income').textContent = formatCurrency(totalIncome);
  document.getElementById('dashboard-expense').textContent = formatCurrency(totalExpense);
  
  const balanceEl = document.getElementById('dashboard-balance');
  balanceEl.textContent = formatCurrency(totalBalance);
  
  // Colorir cartão de saldo dinamicamente
  const balanceBg = document.getElementById('balance-icon-bg');
  const balanceIcon = document.getElementById('balance-icon');
  
  if (totalBalance >= 0) {
    balanceEl.style.color = 'var(--text-primary)';
    balanceBg.style.backgroundColor = 'var(--primary-light)';
    balanceIcon.style.color = 'var(--primary)';
  } else {
    balanceEl.style.color = 'var(--expense)';
    balanceBg.style.backgroundColor = 'var(--expense-light)';
    balanceIcon.style.color = 'var(--expense)';
  }
  
  // Renderizar Últimas Transações
  renderRecentTransactions();
  
  // Renderizar Gráficos
  renderCharts();
}

// --- Inteligência de Auto-Categorização & Auto-Detecção de Crédito/Débito ---

function suggestCategory(description) {
  const desc = description.toLowerCase();
  
  if (desc.includes('uber') || desc.includes('posto') || desc.includes('combustivel') || desc.includes('combustível') || desc.includes('99app') || desc.includes('99 taxi') || desc.includes('cabify') || desc.includes('taxi') || desc.includes('pedagio') || desc.includes('pedágio')) {
    return 'cat-transporte';
  }
  if (desc.includes('ifood') || desc.includes('mercado') || desc.includes('restaurante') || desc.includes('pizzaria') || desc.includes('padaria') || desc.includes('lanches') || desc.includes('supermercado') || desc.includes('atacadao') || desc.includes('pao de acucar') || desc.includes('pão de açúcar') || desc.includes('carrefour') || desc.includes('mcdonald') || desc.includes('burger king') || desc.includes('alimento') || desc.includes('comida') || desc.includes('cafe') || desc.includes('café') || desc.includes('açougue') || desc.includes('acougue') || desc.includes('angelina') || desc.includes('koch') || desc.includes('giassi') || desc.includes('brasil atacadista') || desc.includes('brasil atacado') || desc.includes('angeloni') || desc.includes('mercearia')) {
    return 'cat-alimentacao';
  }
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('cinema') || desc.includes('steam') || desc.includes('playstation') || desc.includes('xbox') || desc.includes('jogo') || desc.includes('lazer') || desc.includes('shopee') || desc.includes('mercadolivre') || desc.includes('mercado livre') || desc.includes('amazon') || desc.includes('aliexpress') || desc.includes('shein') || desc.includes('viagem') || desc.includes('ingresso') || desc.includes('show') || desc.includes('bar') || desc.includes('churrasco') || desc.includes('cerveja')) {
    return 'cat-lazer';
  }
  if (desc.includes('pet') || desc.includes('veterinario') || desc.includes('veterinário') || desc.includes('petz') || desc.includes('cobasi') || desc.includes('kobasi') || desc.includes('pipoca') || desc.includes('ração') || desc.includes('racao') || desc.includes('banho e tosa') || desc.includes('cachorro') || desc.includes('gato')) {
    return 'cat-pet';
  }
  if (desc.includes('farmacia') || desc.includes('farmácia') || desc.includes('saude') || desc.includes('saúde') || desc.includes('medico') || desc.includes('médico') || desc.includes('dentista') || desc.includes('remedio') || desc.includes('remédio') || desc.includes('drogaria') || desc.includes('pague menos') || desc.includes('drogasil') || desc.includes('raia') || desc.includes('clinica') || desc.includes('clínica') || desc.includes('hospital')) {
    return 'cat-saude';
  }
  if (desc.includes('colegio') || desc.includes('colégio') || desc.includes('escola') || desc.includes('curso') || desc.includes('faculdade') || desc.includes('livro') || desc.includes('udemy') || desc.includes('estudo') || desc.includes('mensalidade escolar')) {
    return 'cat-educacao';
  }
  if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('condomínio') || desc.includes('luz') || desc.includes('agua') || desc.includes('água') || desc.includes('gas') || desc.includes('gás') || desc.includes('internet') || desc.includes('energia') || desc.includes('enel') || desc.includes('sabesp') || desc.includes('celesc') || desc.includes('vivo') || desc.includes('claro')) {
    return 'cat-moradia';
  }
  return 'cat-outros-desp'; // padrão
}

function suggestPaymentMethod(description) {
  const desc = description.toLowerCase();
  if (desc.includes('credito') || desc.includes('crédito') || desc.includes('cartao') || desc.includes('cartão')) {
    if (state.cards && state.cards.length > 0) {
      for (const card of state.cards) {
        const cardName = card.name.toLowerCase();
        if (desc.includes(cardName)) {
          return card.id;
        }
      }
      return state.cards[0].id; // Retorna o primeiro cartão por padrão
    }
  }
  return 'cash'; // Débito, pix ou dinheiro por padrão
}

// Renderizar Transações Pendentes (notificações enviadas pelo MacroDroid)
function renderPendingTransactions() {
  const pendingPanel = document.getElementById('pending-panel');
  const pendingList = document.getElementById('pending-transactions-list');
  const pendingCountBadge = document.getElementById('pending-count-badge');
  
  if (!pendingPanel || !pendingList) return;

  const pending = state.transactions.filter(t => t.status === 'pending');

  if (pending.length === 0) {
    pendingPanel.style.display = 'none';
    return;
  }

  pendingPanel.style.display = 'block';
  pendingCountBadge.textContent = `${pending.length} ${pending.length === 1 ? 'transação' : 'transações'}`;
  pendingList.innerHTML = '';

  pending.forEach(t => {
    // Calcular sugestões
    const suggestedCatId = suggestCategory(t.description);
    const suggestedPayId = suggestPaymentMethod(t.description);

    const catObj = getCategoryById(suggestedCatId) || { icon: '🏷️', name: 'Outros (Despesas)' };
    
    let payName = '💰 Saldo / Pix';
    if (suggestedPayId !== 'cash') {
      const cardObj = state.cards.find(c => c.id === suggestedPayId);
      payName = cardObj ? `💳 ${cardObj.name}` : '💳 Cartão de Crédito';
    }

    const li = document.createElement('li');
    li.className = 'pending-card';
    li.innerHTML = `
      <div class="pending-card-header">
        <span class="pending-card-date">${formatDate(t.date)}</span>
        <span class="pending-card-amount">${formatCurrency(t.amount)}</span>
      </div>
      <div class="pending-card-body">
        <span class="pending-card-desc">${t.description}</span>
        <div class="pending-suggestion-box" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.75rem; flex-wrap: wrap; background: rgba(255, 255, 255, 0.05); padding: 0.4rem; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1);">
          <span>💡 Sugerido: <strong style="color:var(--text-primary);">${catObj.icon} ${catObj.name}</strong></span>
          <span>⚡ Forma: <strong style="color:var(--text-primary);">${payName}</strong></span>
        </div>
      </div>
      <div class="pending-card-actions" style="margin-top: 0.75rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <button class="btn-pending-quick-approve btn btn-success" data-id="${t.id}" data-cat="${suggestedCatId}" data-pay="${suggestedPayId}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 8px; background-color: #10b981; color: white; border: none; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: var(--transition-fast);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px; height:12px;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Aprovar Rápido
        </button>
        <button class="btn-pending-confirm btn" data-id="${t.id}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px; margin-right: 2px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Detalhes
        </button>
        <button class="btn-pending-reject btn" data-id="${t.id}" style="padding: 0.4rem 0.6rem; font-size: 0.8rem; border-radius: 8px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px; margin-right: 2px;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Rejeitar
        </button>
      </div>
    `;
    pendingList.appendChild(li);
  });

  // Eventos nos botões das transações pendentes
  document.querySelectorAll('.btn-pending-quick-approve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const cat = btn.getAttribute('data-cat');
      const pay = btn.getAttribute('data-pay');
      await handleQuickApprovePending(id, cat, pay);
    });
  });

  document.querySelectorAll('.btn-pending-confirm').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleConfirmPending(id);
    });
  });

  document.querySelectorAll('.btn-pending-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      handleRejectPending(id);
    });
  });
}

async function handleQuickApprovePending(id, cat, pay) {
  const trans = state.transactions.find(t => t.id === id);
  if (!trans) return;

  // Atualizar a transação localmente
  trans.category = cat;
  trans.paymentMethod = pay;
  trans.status = 'confirmed';

  showToast("Confirmando despesa...");
  
  saveState();
  
  try {
    await dbUpsertTransaction(trans); // Salvar no banco Supabase
    showToast("Despesa aprovada com sucesso!");
    renderDashboard();
  } catch (err) {
    console.error("Erro ao aprovar transação rápida:", err);
    showToast("⚠️ Falha ao salvar no Supabase.", true);
  }
}

function handleConfirmPending(id) {
  const trans = state.transactions.find(t => t.id === id);
  if (!trans) return;

  // Sugestões inteligentes de carregamento
  const suggestedCatId = suggestCategory(trans.description);
  const suggestedPayId = suggestPaymentMethod(trans.description);

  // Preencher a modal de transações
  transForm.reset();
  document.getElementById('trans-id').value = trans.id;
  document.getElementById('trans-type').value = 'expense';
  
  // Formata o valor com duas casas decimais no padrão brasileiro para a máscara funcionar
  document.getElementById('trans-amount').value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(trans.amount);
  document.getElementById('trans-description').value = trans.description;
  document.getElementById('trans-date').value = trans.date;
  
  // Preencher categorias e pré-selecionar a sugerida
  populateModalCategories('expense');
  document.getElementById('trans-category').value = suggestedCatId;
  
  paymentInstallmentContainer.style.display = 'block';
  transPaymentMethod.innerHTML = '<option value="cash">💰 Saldo da Conta / Dinheiro</option>';
  state.cards.forEach(card => {
    const opt = document.createElement('option');
    opt.value = card.id;
    opt.textContent = `💳 ${card.name}`;
    transPaymentMethod.appendChild(opt);
  });
  
  // Pré-selecionar a forma de pagamento sugerida
  transPaymentMethod.value = suggestedPayId;

  const isCard = suggestedPayId !== 'cash';
  if (isCard) {
    installmentSelectGroup.style.display = 'block';
  } else {
    installmentSelectGroup.style.display = 'none';
  }
  transInstallments.value = '1';

  modalTitle.textContent = 'Confirmar Lançamento';
  document.getElementById('btn-save-transaction').className = 'btn btn-expense';
  document.getElementById('btn-save-transaction').textContent = 'Confirmar Lançamento';

  transactionModal.classList.add('active');
}

async function handleRejectPending(id) {
  if (confirm("Deseja realmente rejeitar e excluir esta transação pendente?")) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    await dbDeleteTransaction(id);
    renderDashboard();
    showToast("Transação pendente rejeitada!");
  }
}


function renderRecentTransactions() {
  const listContainer = document.getElementById('recent-transactions-list');
  const emptyState = document.getElementById('recent-empty-state');
  
  // Limpar lista
  listContainer.innerHTML = '';
  
  // Ordenar transações confirmadas por data (mais recentes primeiro)
  const confirmedTransactions = state.transactions.filter(t => t.status !== 'pending');
  const sortedTransactions = [...confirmedTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Pegar as 5 últimas
  const recent = sortedTransactions.slice(0, 5);
  
  if (recent.length === 0) {
    emptyState.style.display = 'flex';
    listContainer.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    listContainer.style.display = 'flex';
    
    recent.forEach(t => {
      const category = getCategoryById(t.category);
      
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-category-icon" style="border-left: 3px solid ${category.color || '#e2e8f0'}">
            ${category.icon || '💰'}
          </div>
          <div class="transaction-meta">
            <span class="transaction-desc">${t.description}</span>
            <span class="transaction-date">${formatDate(t.date)} • ${category.name}</span>
          </div>
        </div>
        <div class="transaction-value-action">
          <span class="transaction-value ${t.type}">
            ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
          </span>
          <button class="btn-delete-trans" data-id="${t.id}" title="Excluir transação">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      listContainer.appendChild(li);
    });
    
    // Evento de deletar transações
    document.querySelectorAll('.btn-delete-trans').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const transId = btn.getAttribute('data-id');
        deleteTransaction(transId);
      });
    });
  }
}


// 8. Renderizar Gráficos (Chart.js)
function renderCharts() {
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);
  const currentMonthTransactions = state.transactions.filter(t => t.date.startsWith(currentMonthStr) && t.status !== 'pending');
  
  // --- A. GRÁFICO DE CATEGORIAS (DESPESAS) ---
  const expensesByCategory = {};
  
  // Inicializar com zeros apenas para categorias que possuem gastos
  currentMonthTransactions.forEach(t => {
    if (t.type === 'expense') {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    }
  });
  
  const categoryLabels = [];
  const categoryValues = [];
  const categoryColors = [];
  
  Object.keys(expensesByCategory).forEach(catId => {
    const category = getCategoryById(catId);
    categoryLabels.push(category.name);
    categoryValues.push(expensesByCategory[catId]);
    categoryColors.push(category.color || '#94a3b8');
  });
  
  const ctxCategory = document.getElementById('category-chart').getContext('2d');
  
  // Destruir gráfico anterior para não causar flicker/bug visual
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  
  if (categoryValues.length === 0) {
    // Renderizar gráfico de pizza de "Sem gastos" fictício para estética
    categoryChartInstance = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: ['Sem despesas cadastradas'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e2e8f0'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Outfit' } } },
          tooltip: { enabled: false }
        },
        cutout: '70%'
      }
    });
  } else {
    categoryChartInstance = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: categoryLabels,
        datasets: [{
          data: categoryValues,
          backgroundColor: categoryColors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Outfit', weight: '500' }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return ` ${context.label}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
  }
  
  // --- B. GRÁFICO DE FLUXO DE CAIXA MENSAL (ENTRADAS VS SAÍDAS) ---
  // Vamos agrupar dados dos últimos 4 meses
  const monthsData = {};
  
  for (let i = 3; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mStr = d.toISOString().substring(0, 7); // YYYY-MM
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    monthsData[mStr] = {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      income: 0,
      expense: 0
    };
  }
  
  state.transactions.filter(t => t.status !== 'pending').forEach(t => {
    const mStr = t.date.substring(0, 7);
    if (monthsData[mStr]) {
      if (t.type === 'income') {
        monthsData[mStr].income += t.amount;
      } else {
        monthsData[mStr].expense += t.amount;
      }
    }
  });
  
  const flowLabels = [];
  const flowIncomes = [];
  const flowExpenses = [];
  
  Object.keys(monthsData).sort().forEach(mStr => {
    flowLabels.push(monthsData[mStr].label);
    flowIncomes.push(monthsData[mStr].income);
    flowExpenses.push(monthsData[mStr].expense);
  });
  
  const ctxFlow = document.getElementById('flow-chart').getContext('2d');
  
  if (flowChartInstance) {
    flowChartInstance.destroy();
  }
  
  flowChartInstance = new Chart(ctxFlow, {
    type: 'bar',
    data: {
      labels: flowLabels,
      datasets: [
        {
          label: 'Receitas',
          data: flowIncomes,
          backgroundColor: '#059669',
          borderRadius: 6
        },
        {
          label: 'Despesas',
          data: flowExpenses,
          backgroundColor: '#ef4444',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { family: 'Outfit' } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        y: {
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Outfit' } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Outfit' } }
        }
      }
    }
  });
}

// Função auxiliar unificada para deletar transações (com suporte a parcelamento)
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
        
        // Excluir todas do Supabase de forma assíncrona
        showToast("Excluindo todas as parcelas...");
        for (const t of installmentsToDelete) {
          await dbDeleteTransaction(t.id);
        }
        
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


// Deletar transação
function deleteTransaction(id) {
  deleteTransactionHandler(id, () => {
    renderDashboard();
  });
}

// 9. Aba de Histórico de Transações (Filtros e Tabela)
const filterSearch = document.getElementById('filter-search');
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');

// Preencher Dropdown de Filtro de Categoria
function populateFilterCategories() {
  filterCategory.innerHTML = '<option value="all">Todas as Categorias</option>';
  
  const allCats = [...state.categories.expense, ...state.categories.income];
  
  // Evitar duplicidade de nomes
  const seen = new Set();
  allCats.forEach(c => {
    if (!seen.has(c.name)) {
      seen.add(c.name);
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.icon} ${c.name}`;
      filterCategory.appendChild(opt);
    }
  });
}

// Adicionar ouvintes para filtros
[filterSearch, filterType, filterCategory].forEach(el => {
  el.addEventListener('input', renderTransactionsTable);
});

function renderTransactionsTable() {
  const tableList = document.getElementById('full-transactions-list');
  const tableContainer = document.getElementById('full-transactions-table');
  const emptyState = document.getElementById('full-empty-state');
  
  tableList.innerHTML = '';
  
  const q = filterSearch.value.toLowerCase().trim();
  const type = filterType.value;
  const cat = filterCategory.value;
  
  const filtered = state.transactions.filter(t => {
    if (t.status === 'pending') return false;
    const matchesSearch = t.description.toLowerCase().includes(q);
    const matchesType = type === 'all' || t.type === type;
    const matchesCategory = cat === 'all' || t.category === cat;
    
    return matchesSearch && matchesType && matchesCategory;
  });
  
  // Ordenar por data mais recente
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    tableContainer.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    tableContainer.style.display = 'table';
    
    filtered.forEach(t => {
      const category = getCategoryById(t.category);
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td style="font-weight: 600;">${t.description}</td>
        <td>
          <span class="badge-category">
            <span>${category.icon}</span>
            <span>${category.name}</span>
          </span>
        </td>
        <td class="transaction-value ${t.type}" style="font-weight: 700;">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.amount)}
        </td>
        <td style="text-align: center;">
          <button class="btn-delete-trans table-delete-btn" data-id="${t.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      `;
      tableList.appendChild(tr);
    });
    
    // Evento excluir da tabela
    document.querySelectorAll('.table-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteTransactionFromTable(id);
      });
    });
  }
}

function deleteTransactionFromTable(id) {
  deleteTransactionHandler(id, () => {
    renderTransactionsTable();
  });
}

// 10. Aba de Planejamento (Orçamentos por Categoria)
function renderBudgets() {
  const grid = document.getElementById('budgets-grid');
  grid.innerHTML = '';
  
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);
  
  // Pegar gastos por categoria deste mês
  const monthlyExpenses = {};
  state.transactions.forEach(t => {
    if (t.type === 'expense' && t.status !== 'pending' && t.date.startsWith(currentMonthStr)) {
      monthlyExpenses[t.category] = (monthlyExpenses[t.category] || 0) + t.amount;
    }
  });
  
  // Renderizar cartões para todas as categorias de despesa
  state.categories.expense.forEach(c => {
    const limit = state.budgets[c.id] || 0;
    const spent = monthlyExpenses[c.id] || 0;
    
    let percentage = 0;
    if (limit > 0) {
      percentage = Math.round((spent / limit) * 100);
    }
    
    let statusClass = 'normal';
    if (percentage >= 100) {
      statusClass = 'danger';
    } else if (percentage >= 80) {
      statusClass = 'warning';
    }
    
    const card = document.createElement('div');
    card.className = 'budget-card';
    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-cat-info">
          <span class="budget-cat-icon">${c.icon}</span>
          <span class="budget-cat-name">${c.name}</span>
        </div>
        <button class="btn-edit-budget" data-id="${c.id}" title="Definir limite de gasto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </div>
      
      <div class="budget-card-values">
        <div>
          <p style="color:var(--text-muted); font-size:0.75rem; margin-bottom:0.15rem;">Gasto</p>
          <span class="budget-spent" style="color: ${spent > limit && limit > 0 ? 'var(--expense)' : 'var(--text-primary)'}">${formatCurrency(spent)}</span>
        </div>
        <div style="text-align: right;">
          <p style="color:var(--text-muted); font-size:0.75rem; margin-bottom:0.15rem;">Limite</p>
          <span class="budget-limit-label">${limit > 0 ? formatCurrency(limit) : 'Sem limite'}</span>
        </div>
      </div>
      
      ${limit > 0 ? `
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
        </div>
        <p class="budget-percentage ${statusClass}">${percentage}% do orçamento utilizado</p>
      ` : `
        <p class="budget-percentage" style="color: var(--text-muted); text-align: left;">Sem orçamento definido</p>
      `}
    `;
    grid.appendChild(card);
  });
  
  // Evento para editar orçamentos
  document.querySelectorAll('.btn-edit-budget').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-id');
      openBudgetModal(catId);
    });
  });
}

// --- Lógica de OCR (Scanner de Cupom) ---
const btnScanOcr = document.getElementById('btn-scan-ocr');
const ocrFileInput = document.getElementById('ocr-file-input');
const ocrLoader = document.getElementById('ocr-loader');
const ocrProgress = document.getElementById('ocr-progress');

if (btnScanOcr && ocrFileInput) {
  btnScanOcr.addEventListener('click', () => {
    ocrFileInput.click();
  });

  ocrFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    processOcrImage(file);
  });
}

function processOcrImage(file) {
  if (!window.Tesseract) {
    showToast("Erro: Tesseract.js não foi carregado corretamente.", true);
    return;
  }

  // Exibir loader
  ocrLoader.style.display = 'flex';
  ocrProgress.textContent = '0%';

  Tesseract.recognize(
    file,
    'por', // Idioma português
    {
      logger: m => {
        if (m.status === 'recognizing text') {
          ocrProgress.textContent = Math.round(m.progress * 100) + '%';
        }
      }
    }
  ).then(({ data: { text } }) => {
    console.log("Texto OCR extraído:", text);
    parseCupomText(text);
  }).catch(err => {
    console.error("Erro no OCR:", err);
    showToast("Não foi possível ler o cupom. Tente novamente.", true);
  }).finally(() => {
    ocrLoader.style.display = 'none';
    ocrFileInput.value = ''; // Limpa input para permitir reenviar mesma imagem
  });
}

function parseCupomText(text) {
  let amount = 0;
  const lines = text.split('\n');
  const totalKeywords = /(total|valor|pagar|recebido|dinheiro|debito|credito|subtotal)/i;
  
  let foundValues = [];
  
  lines.forEach(line => {
    // Regex para capturar valores formatados como moeda pt-BR ou en-US
    const moneyRegex = /(?:R\$)?\s*(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+\.\d{2})/g;
    let match;
    while ((match = moneyRegex.exec(line)) !== null) {
      const valStr = match[1] || match[2];
      const val = parseMaskedValue(valStr);
      if (val > 0) {
        foundValues.push({
          line: line,
          val: val,
          hasKeyword: totalKeywords.test(line)
        });
      }
    }
  });

  const totalMatches = foundValues.filter(f => f.hasKeyword);
  if (totalMatches.length > 0) {
    amount = Math.max(...totalMatches.map(m => m.val));
  } else if (foundValues.length > 0) {
    amount = Math.max(...foundValues.map(m => m.val));
  }

  const dateRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{4}|\d{2})/;
  const dateMatch = text.match(dateRegex);
  let dateStr = new Date().toISOString().substring(0, 10);
  
  if (dateMatch) {
    let day = dateMatch[1];
    let month = dateMatch[2];
    let year = dateMatch[3];
    
    if (year.length === 2) {
      year = '20' + year;
    }
    
    const parsedDate = new Date(`${year}-${month}-${day}T12:00:00`);
    if (!isNaN(parsedDate.getTime())) {
      dateStr = `${year}-${month}-${day}`;
    }
  }

  let description = '';
  const cleanLines = lines
    .map(l => l.trim())
    .filter(l => l.length > 3 && !l.includes('CNPJ') && !l.includes('IE') && !l.includes('http') && !/^\d+$/.test(l));
  
  if (cleanLines.length > 0) {
    description = cleanLines[0].substring(0, 30);
    description = description.replace(/[^a-zA-Z0-9\sÁÉÍÓÚáéíóúÂÊÎÔÛâêîôûÃÕãõÇç\-]/g, '').trim();
  }

  if (!description) {
    description = 'Compra Scanner';
  }

  if (amount > 0) {
    document.getElementById('trans-amount').value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(amount);
  }
  document.getElementById('trans-description').value = description;
  document.getElementById('trans-date').value = dateStr;

  showToast("Dados do cupom preenchidos! Confirme e salve.");
}

// 11. Modais de Cadastro (Abrir / Fechar / Salvar)
const transactionModal = document.getElementById('transaction-modal');
const budgetModal = document.getElementById('budget-modal');

const transForm = document.getElementById('transaction-form');
const budgetForm = document.getElementById('budget-form');

const transAmount = document.getElementById('trans-amount');
const transDesc = document.getElementById('trans-description');
const transDate = document.getElementById('trans-date');
const transCategory = document.getElementById('trans-category');
const transTypeInput = document.getElementById('trans-type');
const modalTitle = document.getElementById('modal-title');

// Elementos de pagamento e parcelamento
const paymentInstallmentContainer = document.getElementById('payment-installment-container');
const transPaymentMethod = document.getElementById('trans-payment-method');
const installmentSelectGroup = document.getElementById('installment-select-group');
const transInstallments = document.getElementById('trans-installments');

if (transPaymentMethod) {
  transPaymentMethod.addEventListener('change', () => {
    const isCard = transPaymentMethod.value !== 'cash';
    if (isCard) {
      installmentSelectGroup.style.display = 'block';
    } else {
      installmentSelectGroup.style.display = 'none';
      transInstallments.value = '1';
    }
  });
}

// Algoritmo auxiliar para calcular datas de vencimento das parcelas
function calculateInstallmentDates(purchaseDateStr, closingDay, dueDay, totalInstallments) {
  const dates = [];
  const parts = purchaseDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed no JS Date
  const day = parseInt(parts[2], 10);

  let faturaMonth = month;
  let faturaYear = year;

  // Compra após o fechamento -> vai para a fatura do mês seguinte
  if (day > closingDay) {
    faturaMonth += 1;
  }
  
  for (let i = 0; i < totalInstallments; i++) {
    const targetMonth = faturaMonth + i;
    const dueDate = new Date(faturaYear, targetMonth, dueDay);
    
    const y = dueDate.getFullYear();
    const m = String(dueDate.getMonth() + 1).padStart(2, '0');
    const d = String(dueDate.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
  }

  return dates;
}

// Ouvintes para abrir modal de transações
document.getElementById('open-income-modal').addEventListener('click', () => openTransactionModal('income'));
document.getElementById('open-expense-modal').addEventListener('click', () => openTransactionModal('expense'));

// Fechar Modais
document.getElementById('btn-close-transaction-modal').addEventListener('click', closeTransactionModal);
document.getElementById('btn-cancel-transaction').addEventListener('click', closeTransactionModal);

document.getElementById('btn-close-budget-modal').addEventListener('click', closeBudgetModal);
document.getElementById('btn-cancel-budget').addEventListener('click', closeBudgetModal);

function openTransactionModal(type) {
  transForm.reset();
  transAmount.value = '0,00';
  transTypeInput.value = type;
  
  // Definir data de hoje por padrão
  const today = new Date().toISOString().substring(0, 10);
  transDate.value = today;
  
  // Configurar Forma de Pagamento e Parcelas no Modal
  if (type === 'expense') {
    paymentInstallmentContainer.style.display = 'block';
    // Limpar e repopular dropdown de formas de pagamento
    transPaymentMethod.innerHTML = '<option value="cash">💰 Saldo da Conta / Dinheiro</option>';
    state.cards.forEach(card => {
      const opt = document.createElement('option');
      opt.value = card.id;
      opt.textContent = `💳 ${card.name}`;
      transPaymentMethod.appendChild(opt);
    });
    installmentSelectGroup.style.display = 'none';
    transInstallments.value = '1';
  } else {
    paymentInstallmentContainer.style.display = 'none';
  }
  
  if (type === 'income') {
    modalTitle.textContent = 'Nova Receita';
    document.getElementById('btn-save-transaction').className = 'btn btn-income';
    document.getElementById('btn-save-transaction').textContent = 'Salvar Receita';
  } else {
    modalTitle.textContent = 'Nova Despesa';
    document.getElementById('btn-save-transaction').className = 'btn btn-expense';
    document.getElementById('btn-save-transaction').textContent = 'Salvar Despesa';
  }
  
  // Preencher categorias correspondentes
  populateModalCategories(type);
  
  transactionModal.classList.add('active');
}

function closeTransactionModal() {
  transactionModal.classList.remove('active');
}

function populateModalCategories(type) {
  transCategory.innerHTML = '';
  state.categories[type].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    transCategory.appendChild(opt);
  });
}

// Salvar Transação
transForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const amount = parseMaskedValue(transAmount.value);
  const description = transDesc.value.trim();
  const date = transDate.value;
  const category = transCategory.value;
  const type = transTypeInput.value;
  const transIdInput = document.getElementById('trans-id').value;
  
  if (!amount || amount <= 0 || !description || !date || !category) {
    showToast("Por favor, preencha todos os campos corretamente.", true);
    return;
  }
  
  const paymentMethod = type === 'expense' ? transPaymentMethod.value : 'cash';
  const installments = type === 'expense' && paymentMethod !== 'cash' ? parseInt(transInstallments.value, 10) : 1;

  // Verificar se estamos confirmando uma transação pendente do MacroDroid
  const isConfirmingPending = transIdInput && state.transactions.some(t => t.id === transIdInput && t.status === 'pending');

  if (installments > 1) {
    const card = state.cards.find(c => c.id === paymentMethod);
    if (!card) {
      showToast("Cartão não encontrado.", true);
      return;
    }

    // Se estiver confirmando uma pendente e parcelando, exclui a pendente original no banco
    if (isConfirmingPending) {
      state.transactions = state.transactions.filter(t => t.id !== transIdInput);
      await dbDeleteTransaction(transIdInput);
    }

    const installmentId = 'inst-' + Date.now();
    const dates = calculateInstallmentDates(date, card.closingDay, card.dueDay, installments);
    
    const parcelaAmount = Math.round((amount / installments) * 100) / 100;
    const lastAmount = Math.round((amount - (parcelaAmount * (installments - 1))) * 100) / 100;

    for (let i = 1; i <= installments; i++) {
      const transParcela = {
        id: `trans-${Date.now()}-${i}`,
        amount: (i === installments) ? lastAmount : parcelaAmount,
        description: `${description} (${i}/${installments})`,
        date: dates[i - 1], // Data de vencimento da fatura correspondente
        category: category,
        type: 'expense',
        paymentMethod: paymentMethod,
        installmentId: installmentId,
        installmentNumber: i,
        totalInstallments: installments,
        purchaseDate: date, // Data real da compra
        status: 'confirmed'
      };
      state.transactions.push(transParcela);
      await dbUpsertTransaction(transParcela);
    }
    showToast(`${installments} parcelas geradas com sucesso!`);
  } else {
    if (isConfirmingPending) {
      // Confirmar transação pendente existente
      const existingTrans = state.transactions.find(t => t.id === transIdInput);
      if (existingTrans) {
        existingTrans.amount = amount;
        existingTrans.description = description;
        existingTrans.date = date;
        existingTrans.category = category;
        existingTrans.type = type;
        existingTrans.paymentMethod = paymentMethod;
        existingTrans.status = 'confirmed';
        
        await dbUpsertTransaction(existingTrans);
      }
      showToast("Transação pendente confirmada!");
    } else {
      // Criar nova transação comum
      const newTransaction = {
        id: 'trans-' + Date.now(),
        amount,
        description,
        date,
        category,
        type,
        paymentMethod,
        status: 'confirmed'
      };
      state.transactions.push(newTransaction);
      await dbUpsertTransaction(newTransaction);
      showToast("Transação adicionada com sucesso!");
    }
  }
  
  saveState();
  closeTransactionModal();
  
  // Verificar se estourou orçamento ao adicionar despesa
  if (type === 'expense') {
    checkBudgetLimit(category);
  }
  
  // Atualizar visual da aba ativa
  const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');
  if (activeTab === 'dashboard') {
    renderDashboard();
  } else if (activeTab === 'transactions') {
    renderTransactionsTable();
  }
});


// Checar e avisar se estourou orçamento
function checkBudgetLimit(catId) {
  const limit = state.budgets[catId];
  if (!limit || limit <= 0) return;
  
  const today = new Date();
  const currentMonthStr = today.toISOString().substring(0, 7);
  
  let totalSpent = 0;
  state.transactions.forEach(t => {
    if (t.category === catId && t.type === 'expense' && t.date.startsWith(currentMonthStr)) {
      totalSpent += t.amount;
    }
  });
  
  const category = getCategoryById(catId);
  if (totalSpent > limit) {
    showToast(`⚠️ Alerta: Orçamento estourado para ${category.name}! (${formatCurrency(totalSpent)} de ${formatCurrency(limit)})`, true);
  } else if (totalSpent >= limit * 0.8) {
    showToast(`⚠️ Atenção: Gasto em ${category.name} atingiu 80% do limite!`, false);
  }
}

// Modal Orçamentos
function openBudgetModal(catId) {
  const category = getCategoryById(catId);
  document.getElementById('budget-category').value = catId;
  document.getElementById('budget-category-display').textContent = `${category.icon} ${category.name}`;
  
  const currentLimit = state.budgets[catId] || 0;
  document.getElementById('budget-limit').value = currentLimit > 0 ? 
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(currentLimit) : '0,00';
  
  budgetModal.classList.add('active');
}

function closeBudgetModal() {
  budgetModal.classList.remove('active');
}

budgetForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const catId = document.getElementById('budget-category').value;
  const limit = parseMaskedValue(document.getElementById('budget-limit').value);
  
  if (isNaN(limit) || limit < 0) {
    showToast("Por favor, informe um limite válido.", true);
    return;
  }
  
  if (limit === 0) {
    delete state.budgets[catId];
  } else {
    state.budgets[catId] = limit;
  }
  
  saveState();
  dbUpsertBudget(catId, limit);
  closeBudgetModal();
  renderBudgets();
  showToast("Orçamento atualizado!");
});

// 12. Aba de Configurações (Personalização de Categorias e Resetar)
const newCatName = document.getElementById('new-category-name');
const newCatType = document.getElementById('new-category-type');
const btnAddCat = document.getElementById('btn-add-category');
const categoriesList = document.getElementById('config-categories-list');

if (btnAddCat) {
  btnAddCat.addEventListener('click', () => {
    const name = newCatName.value.trim();
    const type = newCatType.value;
    
    if (!name) {
      showToast("Escreva o nome da categoria.", true);
      return;
    }
    
    const catId = 'cat-user-' + Date.now();
    const emojiMap = {
      alimentacao: '🍔', moradia: '🏠', transporte: '🚗', lazer: '🎮', saude: '❤️',
      salario: '💼', investimentos: '📈', default: '🏷️'
    };
    
    // Determinar emoji com base em palavras-chave simples ou usar default
    let emoji = emojiMap.default;
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(emojiMap)) {
      if (lowerName.includes(key)) {
        emoji = emojiMap[key];
        break;
      }
    }
    
    // Array de cores do gradiente financeiro
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const newCategoryObj = {
      id: catId,
      name,
      icon: emoji,
      color: randomColor
    };
    
    state.categories[type].push(newCategoryObj);
    saveState();
    dbUpsertCategory(newCategoryObj, type);
    
    newCatName.value = '';
    renderSettingsCategories();
    showToast(`Categoria "${name}" criada com sucesso!`);
  });
}

function renderSettingsCategories() {
  categoriesList.innerHTML = '';
  
  const allCats = [
    ...state.categories.expense.map(c => ({ ...c, type: 'Despesa', typeKey: 'expense' })),
    ...state.categories.income.map(c => ({ ...c, type: 'Receita', typeKey: 'income' }))
  ];
  
  allCats.forEach(c => {
    const li = document.createElement('li');
    li.className = 'category-config-item';
    li.innerHTML = `
      <div class="cat-config-info">
        <span>${c.icon}</span>
        <span>${c.name}</span>
        <span style="font-size:0.7rem; color:var(--text-muted);">(${c.type})</span>
      </div>
      <div class="cat-config-actions" style="display:flex; gap:0.25rem;">
        <button class="btn-edit-cat" data-id="${c.id}" data-type="${c.typeKey}" title="Editar Categoria" style="background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0.25rem; border-radius:6px; display:inline-flex; align-items:center; transition:var(--transition-fast);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-delete-cat" data-id="${c.id}" data-type="${c.typeKey}" title="Excluir Categoria">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
    categoriesList.appendChild(li);
  });
  
  // Evento deletar categoria
  document.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      deleteCategory(id, type);
    });
  });

  // Evento editar categoria
  document.querySelectorAll('.btn-edit-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const type = btn.getAttribute('data-type');
      openCategoryEditModal(id, type);
    });
  });
}

// --- Gerenciamento de Cartões de Crédito ---
const configCardsList = document.getElementById('config-cards-list');
const btnAddCard = document.getElementById('btn-add-card');
const newCardName = document.getElementById('new-card-name');
const newCardLimit = document.getElementById('new-card-limit');
const newCardClosing = document.getElementById('new-card-closing');
const newCardDue = document.getElementById('new-card-due');
const newCardColor = document.getElementById('new-card-color');

if (btnAddCard) {
  // Inicializar a máscara monetária no limite do cartão
  setupMoneyMask(newCardLimit);

  btnAddCard.addEventListener('click', () => {
    const name = newCardName.value.trim();
    const limit = parseMaskedValue(newCardLimit.value);
    const closing = parseInt(newCardClosing.value, 10);
    const due = parseInt(newCardDue.value, 10);
    const color = newCardColor.value;

    if (!name || limit <= 0 || isNaN(closing) || isNaN(due)) {
      showToast("Por favor, preencha todos os campos do cartão.", true);
      return;
    }

    if (closing < 1 || closing > 31 || due < 1 || due > 31) {
      showToast("Os dias de fechamento/vencimento devem ser entre 1 e 31.", true);
      return;
    }

    const cardId = 'card-' + Date.now();
    const newCard = {
      id: cardId,
      name,
      limit,
      closingDay: closing,
      dueDay: due,
      color
    };

    state.cards.push(newCard);
    saveState();
    dbUpsertCard(newCard);

    // Limpar formulário
    newCardName.value = '';
    newCardLimit.value = '0,00';
    newCardClosing.value = '';
    newCardDue.value = '';

    renderSettingsCards();
    showToast(`Cartão "${name}" cadastrado com sucesso!`);
  });
}

function renderSettingsCards() {
  if (!configCardsList) return;
  configCardsList.innerHTML = '';

  state.cards.forEach(card => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="credit-card" style="background: linear-gradient(135deg, ${card.color || '#4f46e5'}, ${adjustColorBrightness(card.color || '#4f46e5', -30)})">
        <div class="card-top" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="card-brand">${card.name}</span>
          <div class="card-top-actions" style="display: flex; gap: 0.35rem; align-items: center;">
            <button class="btn-edit-card" data-id="${card.id}" title="Editar Cartão" style="background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 0.2rem; display: inline-flex; align-items: center; transition: var(--transition-fast);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-delete-card" data-id="${card.id}" title="Excluir Cartão">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="card-middle">
          <div class="card-limit-info">Limite total</div>
          <div class="card-limit-val">${formatCurrency(card.limit)}</div>
        </div>
        <div class="card-bottom">
          <div>
            <div class="card-meta-label">Fechamento</div>
            <div class="card-meta-val">Dia ${card.closingDay}</div>
          </div>
          <div>
            <div class="card-meta-label">Vencimento</div>
            <div class="card-meta-val">Dia ${card.dueDay}</div>
          </div>
        </div>
      </div>
    `;
    configCardsList.appendChild(li);
  });

  // Vincular eventos de deletar cartão
  document.querySelectorAll('.btn-delete-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteCard(id);
    });
  });

  // Vincular eventos de editar cartão
  document.querySelectorAll('.btn-edit-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openCardEditModal(id);
    });
  });
}

function deleteCard(id) {
  const card = state.cards.find(c => c.id === id);
  const cardName = card ? ` "💳 ${card.name}"` : '';
  const inUse = state.transactions.some(t => t.paymentMethod === id);
  
  if (inUse) {
    showConfirmDeleteModal({
      title: 'Excluir Cartão em Uso?',
      message: `Este cartão${cardName} possui despesas vinculadas. Se você o excluir, essas despesas continuarão registradas, mas perderão a associação com o cartão (serão movidas para dinheiro/saldo). Deseja continuar?`,
      onConfirm: () => {
        // Desvincular transações (mudar paymentMethod para 'cash')
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


// --- Edição de Cartão de Crédito ---
const cardEditModal = document.getElementById('card-edit-modal');
const cardEditForm = document.getElementById('card-edit-form');
const editCardId = document.getElementById('edit-card-id');
const editCardName = document.getElementById('edit-card-name');
const editCardLimit = document.getElementById('edit-card-limit');
const editCardClosing = document.getElementById('edit-card-closing');
const editCardDue = document.getElementById('edit-card-due');
const editCardColor = document.getElementById('edit-card-color');

if (cardEditModal) {
  document.getElementById('btn-close-card-edit-modal').addEventListener('click', closeCardEditModal);
  document.getElementById('btn-cancel-card-edit').addEventListener('click', closeCardEditModal);
  setupMoneyMask(editCardLimit); // Configura máscara no campo de edição
}

function openCardEditModal(id) {
  const card = state.cards.find(c => c.id === id);
  if (!card) return;

  editCardId.value = id;
  editCardName.value = card.name;
  editCardLimit.value = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(card.limit);
  editCardClosing.value = card.closingDay;
  editCardDue.value = card.dueDay;
  editCardColor.value = card.color || '#4f46e5';

  cardEditModal.classList.add('active');
}

function closeCardEditModal() {
  cardEditModal.classList.remove('active');
}

if (cardEditForm) {
  cardEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = editCardId.value;
    const name = editCardName.value.trim();
    const limit = parseMaskedValue(editCardLimit.value);
    const closing = parseInt(editCardClosing.value, 10);
    const due = parseInt(editCardDue.value, 10);
    const color = editCardColor.value;

    if (!name || limit <= 0 || isNaN(closing) || isNaN(due)) {
      showToast("Por favor, preencha todos os campos do cartão.", true);
      return;
    }

    if (closing < 1 || closing > 31 || due < 1 || due > 31) {
      showToast("Os dias de fechamento/vencimento devem ser entre 1 e 31.", true);
      return;
    }

    // Encontrar o cartão e atualizar
    const card = state.cards.find(c => c.id === id);
    if (card) {
      card.name = name;
      card.limit = limit;
      card.closingDay = closing;
      card.dueDay = due;
      card.color = color;
      
      await dbUpsertCard(card); // Salvar no Supabase
    }

    saveState();
    closeCardEditModal();
    renderSettingsCards();
    
    // Atualizar dashboard se estiver nele
    const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');
    if (activeTab === 'dashboard') {
      renderDashboard();
    }
    
    showToast("Cartão de crédito atualizado com sucesso!");
  });
}

// Função auxiliar para escurecer a cor do degradê do cartão de crédito
function adjustColorBrightness(hex, percent) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

function deleteCategory(id, type) {
  // Evitar excluir categorias mockadas centrais se possuírem transações vinculadas
  const inUse = state.transactions.some(t => t.category === id);
  if (inUse) {
    showToast("Não é possível excluir esta categoria pois ela possui transações vinculadas.", true);
    return;
  }
  
  const cat = state.categories[type].find(c => c.id === id);
  const catName = cat ? ` "${cat.icon} ${cat.name}"` : '';

  showConfirmDeleteModal({
    title: 'Excluir Categoria?',
    message: `Tem certeza que deseja excluir a categoria${catName}? Esta ação não pode ser desfeita e removerá o limite de orçamento associado.`,
    onConfirm: () => {
      state.categories[type] = state.categories[type].filter(c => c.id !== id);
      
      // Apagar orçamento se houver
      if (state.budgets[id]) {
        delete state.budgets[id];
      }
      
      saveState();
      dbDeleteCategory(id);
      renderSettingsCategories();
      showToast("Categoria excluída com sucesso!");
    }
  });
}


// Modal Editar Categoria
const categoryEditModal = document.getElementById('category-edit-modal');
const categoryEditForm = document.getElementById('category-edit-form');
const editCatId = document.getElementById('edit-cat-id');
const editCatType = document.getElementById('edit-cat-type');
const editCatName = document.getElementById('edit-cat-name');
const editCatIconSelect = document.getElementById('edit-cat-icon-select');
const editCatIconCustom = document.getElementById('edit-cat-icon-custom');
const editCatColor = document.getElementById('edit-cat-color');

document.getElementById('btn-close-category-edit-modal').addEventListener('click', closeCategoryEditModal);
document.getElementById('btn-cancel-category-edit').addEventListener('click', closeCategoryEditModal);

function openCategoryEditModal(id, type) {
  const catList = state.categories[type];
  const category = catList.find(c => c.id === id);
  if (!category) return;
  
  editCatId.value = id;
  editCatType.value = type;
  editCatName.value = category.name;
  editCatColor.value = category.color || '#4f46e5';
  editCatIconCustom.value = '';
  
  // Selecionar o ícone no dropdown se existir na lista, senão deixar em custom
  const options = Array.from(editCatIconSelect.options);
  const match = options.find(opt => opt.value === category.icon);
  if (match) {
    editCatIconSelect.value = category.icon;
  } else {
    editCatIconSelect.value = '⚙️';
    editCatIconCustom.value = category.icon;
  }
  
  categoryEditModal.classList.add('active');
}

function closeCategoryEditModal() {
  categoryEditModal.classList.remove('active');
}

categoryEditForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = editCatId.value;
  const type = editCatType.value;
  const name = editCatName.value.trim();
  const color = editCatColor.value;
  
  let icon = editCatIconSelect.value;
  const customIcon = editCatIconCustom.value.trim();
  if (customIcon) {
    icon = customIcon;
  }
  
  if (!name || !icon) {
    showToast("Por favor, preencha o nome e o ícone.", true);
    return;
  }
  
  // Atualizar a categoria no estado
  const catList = state.categories[type];
  const category = catList.find(c => c.id === id);
  if (category) {
    category.name = name;
    category.icon = icon;
    category.color = color;
    dbUpsertCategory(category, type);
  }
  
  saveState();
  closeCategoryEditModal();
  renderSettingsCategories();
  
  // Recarregar os dados na tela atual ativa
  const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');
  if (activeTab === 'dashboard') {
    renderDashboard();
  } else if (activeTab === 'transactions') {
    renderTransactionsTable();
  } else if (activeTab === 'budgets') {
    renderBudgets();
  }
  
  showToast("Categoria editada com sucesso!");
});

// Reset de dados completo inteligente (preserva conexão Supabase)
document.getElementById('btn-reset-data').addEventListener('click', async () => {
  const isConnected = supabaseClient !== null;
  let confirmMessage = "ATENÇÃO: Isso irá apagar permanentemente todas as suas transações e configurações locais neste navegador.\n\nSua URL e Chave do Supabase serão PRESERVADAS para você não ter o trabalho de digitá-las novamente. Deseja continuar?";
  
  if (isConnected) {
    confirmMessage = "⚠️ ATENÇÃO: Você está CONECTADO ao seu banco de dados Supabase!\n\n" +
                     "Para iniciar do zero de verdade (tanto para você quanto para a Ana), é necessário apagar os dados salvos no banco de dados do Supabase também, senão os dados antigos voltarão automaticamente.\n\n" +
                     "Deseja apagar permanentemente todas as transações, orçamentos e cartões salvos localmente E no banco de dados do Supabase?";
  }

  if (confirm(confirmMessage)) {
    try {
      if (isConnected) {
        showToast("Limpando registros no banco Supabase...", false);
        
        // Deletar transações, orçamentos e cartões do Supabase de forma limpa e síncrona
        // Usamos um filtro geral seguro (ID diferente de '0') para contornar restrições de delete em massa
        const { error: errorTrans } = await supabaseClient.from('transactions').delete().neq('id', '0');
        const { error: errorBudgets } = await supabaseClient.from('budgets').delete().neq('category_id', '0');
        const { error: errorCards } = await supabaseClient.from('cards').delete().neq('id', '0');
        
        if (errorTrans || errorBudgets || errorCards) {
          console.error("Erro ao limpar dados no Supabase:", { errorTrans, errorBudgets, errorCards });
          showToast("⚠️ Falha ao limpar algumas tabelas no Supabase. O cache local foi resetado.", true);
        } else {
          showToast("Banco de dados do Supabase limpo com sucesso!");
        }
      }
      
      // Limpar cache de dados locais
      localStorage.removeItem('moneyacker_data');
      localStorage.removeItem('moneyacker_data_backup');
      localStorage.removeItem('moneyacker_data_migrated_backup');
      
      // Garantir que os inputs continuem preenchidos com os valores ativos do localStorage ou padrões de fábrica
      const inputUrl = document.getElementById('supabase-url');
      const inputKey = document.getElementById('supabase-key');
      if (inputUrl && !inputUrl.value) inputUrl.value = localStorage.getItem('moneyacker_supabase_url') || DEFAULT_SUPABASE_URL;
      if (inputKey && !inputKey.value) inputKey.value = localStorage.getItem('moneyacker_supabase_key') || DEFAULT_SUPABASE_KEY;

      // Recarregar o estado padrão local
      loadState();
      
      // Se estiver conectado, recarrega o estado limpo sincronizado do banco
      if (isConnected) {
        await loadStateFromSupabase();
      }
      
      renderDashboard();
      refreshActiveView();
      showToast("Todos os dados foram resetados para o zero com sucesso!", false);
    } catch (err) {
      console.error("Erro no reset de dados:", err);
      showToast("⚠️ Ocorreu um erro ao resetar os dados.", true);
    }
  }
});

// 13. Inicialização de Primeira Execução
window.addEventListener('DOMContentLoaded', async () => {
  loadState();
  renderHeaderDate();
  renderDashboard();
  
  // Configurar listeners do formulário do Supabase nas Configurações
  const btnSaveSupabase = document.getElementById('btn-save-supabase');
  const btnDisconnectSupabase = document.getElementById('btn-disconnect-supabase');

  if (btnSaveSupabase) {
    btnSaveSupabase.addEventListener('click', async () => {
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-key').value.trim();

      if (!url || !key) {
        showToast("Por favor, preencha todos os campos da conexão.", true);
        return;
      }

      localStorage.removeItem('moneyacker_supabase_disabled'); // Reativa Supabase
      supabaseUrl = url;
      supabaseKey = key;
      localStorage.setItem('moneyacker_supabase_url', url);
      localStorage.setItem('moneyacker_supabase_key', key);

      await initSupabase();
    });
  }

  if (btnDisconnectSupabase) {
    btnDisconnectSupabase.addEventListener('click', () => {
      if (confirm("Deseja realmente desconectar do Supabase? Seus dados serão mantidos no banco de dados do Supabase, mas este navegador voltará ao Modo Local Offline.")) {
        localStorage.removeItem('moneyacker_supabase_url');
        localStorage.removeItem('moneyacker_supabase_key');
        localStorage.setItem('moneyacker_supabase_disabled', 'true'); // Desativa conexão automática
        supabaseUrl = '';
        supabaseKey = '';
        supabaseClient = null;

        // Visualmente voltar para as credenciais padrão de fábrica
        document.getElementById('supabase-url').value = DEFAULT_SUPABASE_URL;
        document.getElementById('supabase-key').value = DEFAULT_SUPABASE_KEY;

        updateConnectionStatus('disconnected', 'Desconectado (Modo Local Offline)');
        btnDisconnectSupabase.style.display = 'none';
        
        const toolsSection = document.getElementById('supabase-tools-section');
        if (toolsSection) toolsSection.style.display = 'none';
        
        document.getElementById('btn-save-supabase').textContent = 'Conectar Banco';

        loadState();
        refreshActiveView();
        showToast("Supabase desconectado com sucesso!");
      }
    });
  }

  // Listeners para os botões de ferramentas adicionais do Supabase
  const btnMigrateLocalData = document.getElementById('btn-migrate-local-data');
  const btnLoadDemoData = document.getElementById('btn-load-demo-data');

  if (btnMigrateLocalData) {
    btnMigrateLocalData.addEventListener('click', async () => {
      await migrateLocalDataToSupabase();
    });
  }

  if (btnLoadDemoData) {
    btnLoadDemoData.addEventListener('click', async () => {
      await loadDemoDataIntoSupabase();
    });
  }

  // Inicialização das máscaras monetárias
  setupMoneyMask(document.getElementById('trans-amount'));
  setupMoneyMask(document.getElementById('budget-limit'));
  
  // Preencher inputs com valores ativos ou padrões de fábrica visualmente na inicialização
  const inputUrl = document.getElementById('supabase-url');
  const inputKey = document.getElementById('supabase-key');
  if (inputUrl) inputUrl.value = localStorage.getItem('moneyacker_supabase_url') || DEFAULT_SUPABASE_URL;
  if (inputKey) inputKey.value = localStorage.getItem('moneyacker_supabase_key') || DEFAULT_SUPABASE_KEY;

  // Tentar conectar ao Supabase (se credenciais estiverem salvas e conexão ativa)
  if (!isSupabaseDisabled) {
    await initSupabase();
  } else {
    updateConnectionStatus('disconnected', 'Desconectado (Modo Local Offline)');
  }

  // Registrar Service Worker para habilitar PWA instalável
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registrado com sucesso:', reg.scope))
        .catch(err => console.error('Erro ao registrar Service Worker:', err));
    });
});

// =============================================================
// SISTEMA PREMIUM DE JANELAS DE CONFIRMAÇÃO DE EXCLUSÃO
// =============================================================

let deleteConfirmCallback = null;
let installmentSingleCallback = null;
let installmentAllCallback = null;

function showConfirmDeleteModal({ title, message, onConfirm }) {
  const modal = document.getElementById('confirm-delete-modal');
  const titleEl = document.getElementById('confirm-delete-title');
  const messageEl = document.getElementById('confirm-delete-message');
  
  if (!modal) return;
  titleEl.textContent = title || 'Excluir Item?';
  messageEl.textContent = message || 'Tem certeza que deseja excluir este item?';
  
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

// Configurar ouvintes dos modais de confirmação
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

