/**
 * FINANÇAS ACKER — Backend (Google Apps Script colado dentro da planilha)
 *
 * O que este script faz:
 *  - Cria as abas da planilha (Lancamentos, Categorias, Contas, Regras, Log)
 *  - Serve uma API (App da Web) que o app do celular e os bots usam
 *  - Sincroniza transações dos bancos/cartões via Pluggy (opcional)
 *  - Usa o Gemini para ler foto de cupom e categorizar sozinho (opcional)
 *
 * Instalação: veja COMO_INSTALAR.md
 */

const ABA = { L: 'Lancamentos', C: 'Categorias', CT: 'Contas', R: 'Regras', LOG: 'Log' };
const COLS_L = ['id', 'data', 'descricao', 'valor', 'tipo', 'categoria', 'conta', 'quem', 'origem',
  'id_externo', 'parcela', 'obs', 'itens', 'criado_em', 'atualizado_em', 'excluido'];
const COLS_C = ['nome', 'tipo', 'icone', 'cor', 'orcamento'];
const COLS_CT = ['nome', 'tipo', 'cor', 'id_externo', 'saldo', 'limite', 'atualizado'];
const COLS_R = ['contem', 'categoria', 'criado_em'];

const CATEGORIAS_PADRAO = [
  ['Mercado', 'despesa', 'cart', '#22c55e', 2000],
  ['Alimentação', 'despesa', 'restaurant', '#f97316', 800],
  ['Transporte', 'despesa', 'car', '#3b82f6', 800],
  ['Casa', 'despesa', 'home', '#8b5cf6', ''],
  ['Contas', 'despesa', 'flash', '#eab308', ''],
  ['Saúde', 'despesa', 'medkit', '#ef4444', ''],
  ['Educação', 'despesa', 'school', '#06b6d4', ''],
  ['Lazer', 'despesa', 'game-controller', '#ec4899', 500],
  ['Compras', 'despesa', 'bag-handle', '#f43f5e', 600],
  ['Assinaturas', 'despesa', 'repeat', '#6366f1', ''],
  ['Beleza', 'despesa', 'sparkles', '#fb7185', ''],
  ['Pets', 'despesa', 'paw', '#b45309', ''],
  ['Viagem', 'despesa', 'airplane', '#0ea5e9', ''],
  ['Presentes', 'despesa', 'gift', '#d946ef', ''],
  ['Impostos e taxas', 'despesa', 'receipt', '#64748b', ''],
  ['Filha', 'despesa', 'heart', '#ec4899', ''],
  ['Outros', 'despesa', 'ellipsis-horizontal', '#94a3b8', ''],
  ['Salário', 'receita', 'wallet', '#16a34a', ''],
  ['Pró-labore', 'receita', 'storefront', '#0d9488', ''],
  ['Extra', 'receita', 'cash', '#65a30d', ''],
  ['Rendimentos', 'receita', 'trending-up', '#0891b2', ''],
  ['Estorno', 'receita', 'arrow-undo', '#84cc16', ''],
  ['Outras receitas', 'receita', 'add-circle', '#4ade80', ''],
  ['Transferência', 'transferencia', 'swap-horizontal', '#94a3b8', '']
];

/* ============================== MENU ============================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('💰 Financeiro')
    .addItem('1) Configurar planilha', 'configurar')
    .addItem('Ver token de acesso', 'mostrarToken')
    .addSeparator()
    .addItem('Definir chave do Gemini', 'definirGemini')
    .addItem('Testar Gemini', 'testarGemini')
    .addSeparator()
    .addItem('Definir credenciais Pluggy', 'definirPluggy')
    .addItem('Sincronizar bancos agora (Pluggy)', 'sincronizarPluggyMenu')
    .addItem('Ativar sincronização automática (3x/dia)', 'ativarAutomacao')
    .addItem('Remover sincronização automática', 'removerAutomacao')
    .addToUi();
}

function configurar() {
  const ss = SpreadsheetApp.getActive();
  criarAba_(ss, ABA.L, COLS_L);
  const shC = criarAba_(ss, ABA.C, COLS_C);
  const shCT = criarAba_(ss, ABA.CT, COLS_CT);
  criarAba_(ss, ABA.R, COLS_R);
  criarAba_(ss, ABA.LOG, ['quando', 'evento', 'detalhe']);
  if (shC.getLastRow() < 2) shC.getRange(2, 1, CATEGORIAS_PADRAO.length, 5).setValues(CATEGORIAS_PADRAO);
  if (shCT.getLastRow() < 2) {
    shCT.getRange(2, 1, 4, 3).setValues([
      ['Santander Elite', 'cartao', '#ec0000'],
      ['Nubank Gold', 'cartao', '#820ad1'],
      ['Itaú Ana', 'banco', '#ec7000'],
      ['Dinheiro / Pix', 'dinheiro', '#22c55e']
    ]);
  }
  const shL = ss.getSheetByName(ABA.L);
  shL.getRange('B:B').setNumberFormat('dd/mm/yyyy');
  shL.getRange('D:D').setNumberFormat('R$ #,##0.00');
  const p = props_();
  if (!p.getProperty('APP_TOKEN')) p.setProperty('APP_TOKEN', gerarToken_());
  if (!p.getProperty('PESSOAS')) p.setProperty('PESSOAS', 'Jacson,Ana');
  const padrao = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
  if (padrao && padrao.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(padrao);
  log_('configurar', 'ok');
  aviso_('✅ Planilha configurada!\n\nSeu TOKEN de acesso (copie):\n\n' + p.getProperty('APP_TOKEN') +
    '\n\nPróximo passo: Implantar > Nova implantação > App da Web\n(Executar como: Eu | Quem pode acessar: Qualquer pessoa).');
}

function mostrarToken() {
  aviso_('Token de acesso:\n\n' + (props_().getProperty('APP_TOKEN') || '(rode "Configurar planilha" primeiro)'));
}

function definirGemini() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Chave do Gemini', 'Cole a chave da API (aistudio.google.com/apikey):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  props_().setProperty('GEMINI_API_KEY', r.getResponseText().trim());
  ui.alert('Chave salva. Use "Testar Gemini" para conferir.');
}

function testarGemini() {
  try {
    const r = categorizarLote_(['SUPERMERCADO BISTEK', 'POSTO SHELL', 'IFOOD *PIZZARIA']);
    SpreadsheetApp.getUi().alert('Gemini OK ✅\n\n' + JSON.stringify(r));
  } catch (e) { SpreadsheetApp.getUi().alert('Erro no Gemini: ' + e.message); }
}

function definirPluggy() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('Pluggy (1/3)', 'Client ID:', ui.ButtonSet.OK_CANCEL); if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('Pluggy (2/3)', 'Client Secret:', ui.ButtonSet.OK_CANCEL); if (b.getSelectedButton() !== ui.Button.OK) return;
  const c = ui.prompt('Pluggy (3/3)', 'Item IDs e dono, separados por vírgula.\nEx: 1234-abcd=Jacson, 5678-efgh=Ana', ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK) return;
  const p = props_();
  p.setProperty('PLUGGY_CLIENT_ID', a.getResponseText().trim());
  p.setProperty('PLUGGY_CLIENT_SECRET', b.getResponseText().trim());
  p.setProperty('PLUGGY_ITEMS', c.getResponseText().trim());
  ui.alert('Credenciais salvas. Rode "Sincronizar bancos agora".');
}

function sincronizarPluggyMenu() {
  try { const r = sincronizarPluggy(60); SpreadsheetApp.getUi().alert('Sincronização concluída ✅\n\n' + JSON.stringify(r, null, 1)); }
  catch (e) { SpreadsheetApp.getUi().alert('Erro: ' + e.message); }
}

function ativarAutomacao() {
  removerAutomacao(true);
  ScriptApp.newTrigger('sincronizarPluggyAuto').timeBased().everyHours(8).create();
  SpreadsheetApp.getUi().alert('Sincronização automática ativada (a cada 8 horas).');
}

function removerAutomacao(silencioso) {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'sincronizarPluggyAuto').forEach(t => ScriptApp.deleteTrigger(t));
  if (silencioso !== true) SpreadsheetApp.getUi().alert('Automação removida.');
}

function sincronizarPluggyAuto() {
  try { sincronizarPluggy(); } catch (e) { log_('pluggy_erro', e.message); }
}

/* ============================== API ============================== */

function doGet(e) {
  return responder_(() => {
    const p = (e && e.parameter) || {};
    if (p.action === 'ping') return { ok: true, app: 'financas-acker' };
    auth_(p.token);
    if (p.action === 'dados') return dados_();
    if (p.action === 'resumo') return { ok: true, resumo: resumoMes_(p.mes) };
    throw new Error('Ação desconhecida: ' + p.action);
  });
}

function doPost(e) {
  return responder_(() => {
    const b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    auth_(b.token);
    switch (b.action) {
      case 'salvar': return { ok: true, lancamento: comLock_(() => salvar_(b.lancamento)) };
      case 'lancar': return lancarBot_(b);
      case 'excluir': return { ok: true, lancamento: comLock_(() => salvar_({ id: b.id, excluido: true })) };
      case 'lerFoto': return { ok: true, resultado: lerFoto_(b.imagem, b.mime) };
      case 'orcamentos': return { ok: true, categorias: comLock_(() => salvarOrcamentos_(b.orcamentos || {})) };
      case 'syncPluggy': return { ok: true, resumo: sincronizarPluggy(b.dias) };
      case 'resumo': return { ok: true, resumo: resumoMes_(b.mes) };
      case 'dados': return dados_();
      default: throw new Error('Ação desconhecida: ' + b.action);
    }
  });
}

function responder_(fn) {
  let out;
  try { out = fn(); } catch (err) { out = { ok: false, erro: String((err && err.message) || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function auth_(t) {
  const tk = props_().getProperty('APP_TOKEN');
  if (!tk || String(t || '') !== tk) throw new Error('Token inválido');
}

function dados_() {
  return {
    ok: true,
    pessoas: (props_().getProperty('PESSOAS') || 'Jacson,Ana').split(',').map(s => s.trim()).filter(String),
    lancamentos: lerLancamentos_().filter(l => !l.excluido).map(limpar_),
    categorias: lerTabela_(ABA.C).map(c => ({ nome: c.nome, tipo: c.tipo, icone: c.icone, cor: c.cor, orcamento: Number(c.orcamento) || 0 })),
    contas: lerTabela_(ABA.CT).map(c => ({
      nome: c.nome, tipo: c.tipo, cor: c.cor,
      saldo: c.saldo === '' ? null : Number(c.saldo), limite: c.limite === '' ? null : Number(c.limite),
      atualizado: c.atualizado ? fmtData_(c.atualizado, 'yyyy-MM-dd HH:mm') : ''
    })),
    gemini: !!props_().getProperty('GEMINI_API_KEY'),
    pluggy: !!props_().getProperty('PLUGGY_CLIENT_ID'),
    agora: fmtData_(new Date(), 'yyyy-MM-dd HH:mm')
  };
}

/* ============================== LANÇAMENTOS ============================== */

function salvar_(entrada) {
  if (!entrada) throw new Error('Lançamento vazio');
  const sh = aba_(ABA.L);
  const n = normalizar_(entrada);
  const agora = new Date();
  const last = sh.getLastRow();
  const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
  const idx = n.id ? ids.indexOf(String(n.id)) : -1;

  if (idx >= 0) {
    const row = idx + 2;
    const atual = linhaParaObj_(sh.getRange(row, 1, 1, COLS_L.length).getValues()[0]);
    if (n.categoria && atual.categoria && n.categoria !== atual.categoria && (n.descricao || atual.descricao)) {
      aprenderRegra_(n.descricao || atual.descricao, n.categoria);
    }
    const m = Object.assign({}, atual, n, { atualizado_em: agora });
    sh.getRange(row, 1, 1, COLS_L.length).setValues([objParaLinha_(m)]);
    return limpar_(m);
  }

  if (entrada.excluido && !entrada.valor) throw new Error('Lançamento não encontrado');
  if (!n.valor) throw new Error('Informe o valor');
  if (!n.id) n.id = novoId_();
  if (!n.data) n.data = hoje_();
  if (!n.tipo) n.tipo = 'despesa';
  if (!n.categoria) n.categoria = categorizar_(n.descricao, n.tipo);
  n.criado_em = agora; n.atualizado_em = agora; n.excluido = false;
  sh.appendRow(objParaLinha_(n));
  return limpar_(n);
}

/** Usado pelos bots (Grok etc). Aceita 1 lançamento ou uma lista em "lancamentos". */
function lancarBot_(b) {
  const lista = Array.isArray(b.lancamentos) ? b.lancamentos : [b.lancamento || b];
  const feitos = comLock_(() => {
    const existentes = mapaExternos_();
    return lista.map(item => {
      const l = Object.assign({}, item);
      delete l.token; delete l.action;
      if (!l.origem) l.origem = 'bot';
      if (l.id_externo && existentes[String(l.id_externo)]) return Object.assign({ duplicado: true }, existentes[String(l.id_externo)]);
      return salvar_(l);
    });
  });
  return { ok: true, lancamentos: feitos, mensagem: feitos.map(f => (f.duplicado ? '(já existia) ' : '✅ ') +
    f.descricao + ' — ' + brl_(f.valor) + ' em ' + f.categoria).join('\n') };
}

function normalizar_(l) {
  const n = {};
  COLS_L.forEach(k => { if (l[k] !== undefined && l[k] !== null && l[k] !== '') n[k] = l[k]; });
  if (l.excluido !== undefined) n.excluido = l.excluido === true || String(l.excluido).toUpperCase() === 'TRUE';
  if (n.valor !== undefined) n.valor = Math.abs(parseValor_(n.valor));
  if (n.data !== undefined) n.data = parseData_(n.data);
  if (n.tipo) {
    const t = semAcento_(n.tipo).toLowerCase();
    n.tipo = t.indexOf('rec') === 0 || t === 'entrada' ? 'receita' : t.indexOf('transf') === 0 ? 'transferencia' : 'despesa';
  }
  if (n.categoria) n.categoria = casarCategoria_(n.categoria) || n.categoria;
  if (n.itens && typeof n.itens !== 'string') n.itens = JSON.stringify(n.itens);
  if (n.descricao) n.descricao = String(n.descricao).trim();
  return n;
}

function lerLancamentos_() {
  const sh = aba_(ABA.L);
  const v = sh.getDataRange().getValues();
  v.shift();
  return v.filter(r => r[0] !== '').map(linhaParaObj_);
}

function linhaParaObj_(r) {
  const o = {};
  COLS_L.forEach((k, i) => o[k] = r[i]);
  o.excluido = o.excluido === true || String(o.excluido).toUpperCase() === 'TRUE';
  return o;
}

function objParaLinha_(o) {
  return COLS_L.map(k => {
    const v = o[k];
    if (v === undefined || v === null) return '';
    if (k === 'data' && !(v instanceof Date)) return parseData_(v);
    return v;
  });
}

function limpar_(o) {
  const out = {};
  COLS_L.forEach(k => {
    let v = o[k];
    if (v instanceof Date) v = fmtData_(v, k === 'data' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
    out[k] = v === undefined ? '' : v;
  });
  out.valor = Number(out.valor) || 0;
  if (out.duplicado) out.duplicado = true;
  return out;
}

function mapaExternos_() {
  const m = {};
  lerLancamentos_().forEach(l => { if (l.id_externo) m[String(l.id_externo)] = limpar_(l); });
  return m;
}

/* ============================== CATEGORIAS / REGRAS ============================== */

function casarCategoria_(nome) {
  const alvo = semAcento_(String(nome)).toLowerCase().trim();
  const cats = lerTabela_(ABA.C);
  const c = cats.find(c => semAcento_(c.nome).toLowerCase() === alvo) ||
    cats.find(c => semAcento_(c.nome).toLowerCase().indexOf(alvo) === 0 || alvo.indexOf(semAcento_(c.nome).toLowerCase()) === 0);
  return c ? c.nome : null;
}

function chaveDesc_(d) {
  return semAcento_(String(d || '')).toLowerCase().replace(/[0-9*#\-_/.:]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
}

function aprenderRegra_(desc, categoria) {
  const k = chaveDesc_(desc);
  if (k.length < 3) return;
  const sh = aba_(ABA.R);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]) === k) { sh.getRange(i + 1, 2).setValue(categoria); return; }
  }
  sh.appendRow([k, categoria, new Date()]);
}

function porRegra_(desc) {
  const d = chaveDesc_(desc);
  if (!d) return null;
  const regras = aba_(ABA.R).getDataRange().getValues().slice(1).filter(r => r[0]);
  regras.sort((a, b) => String(b[0]).length - String(a[0]).length);
  const r = regras.find(r => d.indexOf(String(r[0])) >= 0);
  return r ? String(r[1]) : null;
}

function categorizar_(desc, tipo) {
  const regra = porRegra_(desc);
  if (regra) return regra;
  const igual = lerTabela_(ABA.C).find(c => c.tipo === (tipo || 'despesa') && semAcento_(c.nome).toLowerCase() === semAcento_(desc).toLowerCase().trim());
  if (igual) return igual.nome;
  if (desc && props_().getProperty('GEMINI_API_KEY')) {
    try { const r = categorizarLote_([desc], tipo); if (r[0]) return r[0]; } catch (e) { log_('gemini_erro', e.message); }
  }
  return tipo === 'receita' ? 'Outras receitas' : tipo === 'transferencia' ? 'Transferência' : 'Outros';
}

function categorizarLote_(descs, tipo) {
  const cats = lerTabela_(ABA.C).filter(c => !tipo || c.tipo === tipo || (tipo !== 'receita' && c.tipo === 'despesa')).map(c => c.nome);
  const prompt = 'Você classifica lançamentos financeiros pessoais de um casal no Brasil (Itajaí-SC).\n' +
    'Categorias permitidas: ' + cats.join(', ') + '.\n' +
    'Para cada descrição abaixo, responda SOMENTE um JSON {"categorias": ["...", ...]} na mesma ordem, usando exatamente um nome da lista.\n' +
    'Supermercado, atacado, hortifruti, padaria do dia a dia = Mercado. Restaurante, lanche, iFood, café = Alimentação. ' +
    'Combustível, Uber, pedágio, estacionamento, mecânico = Transporte. Luz, água, internet, celular, gás = Contas. ' +
    'Netflix, Spotify, apps mensais = Assinaturas. Farmácia, médico, academia = Saúde.\n\n' +
    descs.map((d, i) => (i + 1) + '. ' + d).join('\n');
  const r = gemini_([{ text: prompt }]);
  const lista = (r && r.categorias) || [];
  return descs.map((_, i) => casarCategoria_(lista[i] || '') || null);
}

function salvarOrcamentos_(orc) {
  const sh = aba_(ABA.C);
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (Object.prototype.hasOwnProperty.call(orc, v[i][0])) sh.getRange(i + 1, 5).setValue(Number(orc[v[i][0]]) || '');
  }
  return lerTabela_(ABA.C);
}

/* ============================== GEMINI ============================== */

function gemini_(parts) {
  const key = props_().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('Chave do Gemini não configurada (menu 💰 Financeiro > Definir chave do Gemini)');
  const model = props_().getProperty('GEMINI_MODEL') || 'gemini-3.1-flash-lite';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + encodeURIComponent(key);
  const payload = { contents: [{ parts: parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } };
  const resp = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  const j = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() !== 200) throw new Error('Gemini: ' + ((j.error && j.error.message) || resp.getResponseCode()));
  const txt = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('');
  return JSON.parse(txt.replace(/^\s*\x60{3}(json)?/i, '').replace(/\x60{3}\s*$/, ''));
}

function lerFoto_(base64, mime) {
  if (!base64) throw new Error('Imagem vazia');
  const cats = lerTabela_(ABA.C).map(c => c.nome + ' (' + c.tipo + ')');
  const prompt = 'Leia esta foto (cupom fiscal, nota, comprovante Pix/cartão ou boleto) e extraia o lançamento financeiro.\n' +
    'Responda SOMENTE JSON: {"tipo":"despesa|receita","valor":number,"data":"YYYY-MM-DD","descricao":"nome curto do estabelecimento",' +
    '"categoria":"uma da lista","forma_pagamento":"credito|debito|pix|dinheiro|boleto|", "itens":[{"nome":"...","qtd":number,"valor":number}]}.\n' +
    'Use o VALOR TOTAL pago. Se não houver data legível use null. Itens: no máximo 40, valor total de cada item.\n' +
    'Categorias: ' + cats.join(', ') + '. Hoje é ' + hoje_() + '.';
  const r = gemini_([{ inline_data: { mime_type: mime || 'image/jpeg', data: base64 } }, { text: prompt }]);
  if (r.categoria) r.categoria = casarCategoria_(r.categoria) || r.categoria;
  log_('lerFoto', (r.descricao || '') + ' ' + (r.valor || ''));
  return r;
}

/* ============================== PLUGGY ============================== */

function sincronizarPluggy(dias) {
  const p = props_();
  const cid = p.getProperty('PLUGGY_CLIENT_ID'), sec = p.getProperty('PLUGGY_CLIENT_SECRET');
  if (!cid || !sec) throw new Error('Pluggy não configurado (menu 💰 Financeiro > Definir credenciais Pluggy)');
  const itens = (p.getProperty('PLUGGY_ITEMS') || '').split(',').map(s => s.trim()).filter(String).map(s => {
    const [id, quem] = s.split('='); return { id: id.trim(), quem: (quem || '').trim() };
  });
  if (!itens.length) throw new Error('Nenhum Item ID do Pluggy informado');
  const nDias = Number(dias) || Number(p.getProperty('PLUGGY_DIAS')) || 15;

  const auth = pluggy_('post', '/auth', null, { clientId: cid, clientSecret: sec });
  const key = auth.apiKey;
  const de = fmtData_(new Date(Date.now() - nDias * 864e5), 'yyyy-MM-dd');
  const ate = fmtData_(new Date(Date.now() + 864e5), 'yyyy-MM-dd');

  const novos = [];
  const resumo = { contas: 0, lidas: 0, novas: 0, ignoradas: 0 };
  const contasInfo = [];

  return comLock_(() => {
    const existentes = mapaExternos_();
    itens.forEach(item => {
      const accs = pluggy_('get', '/accounts?itemId=' + encodeURIComponent(item.id), key).results || [];
      accs.forEach(acc => {
        resumo.contas++;
        const cartao = acc.type === 'CREDIT';
        const final = acc.number ? ' •' + String(acc.number).slice(-4) : '';
        const nomeConta = (acc.marketingName || acc.name || (cartao ? 'Cartão' : 'Conta')) + final;
        contasInfo.push({
          nome: nomeConta, tipo: cartao ? 'cartao' : 'banco', id_externo: 'pluggy:' + acc.id,
          saldo: acc.balance, limite: cartao && acc.creditData ? acc.creditData.creditLimit : ''
        });
        let page = 1, total = 1;
        do {
          const r = pluggy_('get', '/transactions?accountId=' + acc.id + '&from=' + de + '&to=' + ate + '&pageSize=500&page=' + page, key);
          total = r.totalPages || 1;
          (r.results || []).forEach(t => {
            resumo.lidas++;
            const ext = 'pluggy:' + t.id;
            if (existentes[ext] || t.status === 'PENDING') { resumo.ignoradas++; return; }
            novos.push(converterPluggy_(t, cartao, nomeConta, item.quem, ext));
          });
          page++;
        } while (page <= total);
      });
    });

    // categoriza o que ficou sem categoria com 1 chamada ao Gemini (barato)
    const sem = novos.filter(n => !n.categoria);
    if (sem.length && p.getProperty('GEMINI_API_KEY')) {
      try {
        for (let i = 0; i < sem.length; i += 40) {
          const parte = sem.slice(i, i + 40);
          const cats = categorizarLote_(parte.map(n => n.descricao));
          parte.forEach((n, j) => { if (cats[j]) n.categoria = cats[j]; });
        }
      } catch (e) { log_('gemini_erro', e.message); }
    }
    const sh = aba_(ABA.L);
    const agora = new Date();
    const linhas = novos.map(n => {
      if (!n.categoria) n.categoria = n.tipo === 'receita' ? 'Outras receitas' : n.tipo === 'transferencia' ? 'Transferência' : 'Outros';
      n.id = novoId_(); n.criado_em = agora; n.atualizado_em = agora; n.excluido = false;
      return objParaLinha_(n);
    });
    if (linhas.length) sh.getRange(sh.getLastRow() + 1, 1, linhas.length, COLS_L.length).setValues(linhas);
    resumo.novas = linhas.length;
    atualizarContas_(contasInfo);
    log_('pluggy', JSON.stringify(resumo));
    return resumo;
  });
}

function converterPluggy_(t, cartao, conta, quem, ext) {
  const desc = (t.merchant && (t.merchant.businessName || t.merchant.name)) || t.descriptionRaw || t.description || 'Transação';
  const valor = Math.abs(Number(t.amount) || 0);
  let saida;
  if (t.type === 'DEBIT' || t.type === 'CREDIT') saida = t.type === 'DEBIT';
  else saida = cartao ? Number(t.amount) > 0 : Number(t.amount) < 0;
  const catP = String(t.category || '').toLowerCase();
  const d = semAcento_(String(t.description || '') + ' ' + desc).toLowerCase();
  const pagFatura = catP.indexOf('credit card payment') >= 0 || /pag(amento|to)?\.? ?(de )?fatura|pagamento cartao|pgto cartao|pag fat/.test(d);
  const mesmaPessoa = /same person|investment/.test(catP); // aplicação/resgate e transferência entre contas próprias
  let tipo = saida ? 'despesa' : 'receita';
  if (pagFatura || mesmaPessoa) tipo = 'transferencia';
  let categoria = tipo === 'transferencia' ? 'Transferência' : (porRegra_(desc) || mapaPluggy_(catP, tipo));
  if (cartao && !saida && tipo === 'receita') categoria = 'Estorno';
  const md = t.creditCardMetadata || {};
  return {
    data: parseData_(String(t.date).slice(0, 10)), descricao: String(desc).trim(), valor: valor, tipo: tipo,
    categoria: categoria, conta: conta, quem: quem, origem: 'pluggy', id_externo: ext,
    parcela: md.totalInstallments > 1 ? (md.installmentNumber + '/' + md.totalInstallments) : '',
    obs: t.category ? 'Pluggy: ' + t.category : ''
  };
}

function mapaPluggy_(c, tipo) {
  if (!c) return null;
  if (tipo === 'receita') {
    if (/salary|income|retirement/.test(c)) return 'Salário';
    if (/investment|interest|yield/.test(c)) return 'Rendimentos';
    if (/entrepreneur/.test(c)) return 'Pró-labore';
    return null;
  }
  const m = [
    [/groceries|supermarket/, 'Mercado'],
    [/eating out|food delivery|restaurant|food and drinks|bakery/, 'Alimentação'],
    [/gas station|taxi|ride|public transport|parking|toll|automotive|vehicle|car rental|bicycle|transportation/, 'Transporte'],
    [/video streaming|music streaming|digital services|gaming|software/, 'Assinaturas'],
    [/rent|housing|mortgage|houseware|home insurance|urban land/, 'Casa'],
    [/utilities|water|electricity|^gas$|telecom|internet|mobile|\btv\b/, 'Contas'],
    [/health|pharmacy|dentist|hospital|optometry|gym|fitness|wellness/, 'Saúde'],
    [/education|course|university|school|kindergarten|bookstore/, 'Educação'],
    [/pet/, 'Pets'],
    [/travel|airport|airline|accomodation|accommodation|bus ticket|mileage/, 'Viagem'],
    [/leisure|tickets|cinema|theater|concert|stadium|landmark|sports|lottery|bet|gambling/, 'Lazer'],
    [/clothing|shopping|electronics|kids|toys|office|arts/, 'Compras'],
    [/donation/, 'Presentes'],
    [/tax|fee|legal obligation|insurance/, 'Impostos e taxas']
  ];
  const f = m.find(x => x[0].test(c));
  return f ? f[1] : null;
}

function pluggy_(metodo, caminho, key, corpo) {
  const opt = { method: metodo, muteHttpExceptions: true, contentType: 'application/json', headers: {} };
  if (key) opt.headers['X-API-KEY'] = key;
  if (corpo) opt.payload = JSON.stringify(corpo);
  const r = UrlFetchApp.fetch('https://api.pluggy.ai' + caminho, opt);
  const txt = r.getContentText();
  if (r.getResponseCode() >= 300) throw new Error('Pluggy ' + r.getResponseCode() + ': ' + txt.slice(0, 200));
  return JSON.parse(txt);
}

function atualizarContas_(lista) {
  if (!lista.length) return;
  const sh = aba_(ABA.CT);
  const v = sh.getDataRange().getValues();
  const agora = new Date();
  lista.forEach(c => {
    let row = -1;
    for (let i = 1; i < v.length; i++) if (String(v[i][3]) === c.id_externo) { row = i + 1; break; }
    const linha = [c.nome, c.tipo, c.tipo === 'cartao' ? '#8b5cf6' : '#3b82f6', c.id_externo,
      c.saldo === undefined || c.saldo === null ? '' : c.saldo, c.limite === undefined || c.limite === null ? '' : c.limite, agora];
    if (row > 0) { linha[2] = v[row - 1][2] || linha[2]; sh.getRange(row, 1, 1, 7).setValues([linha]); }
    else { sh.appendRow(linha); v.push(linha); }
  });
}

/* ============================== RESUMO (para bots) ============================== */

function resumoMes_(mes) {
  const m = mes || fmtData_(new Date(), 'yyyy-MM');
  const ls = lerLancamentos_().filter(l => !l.excluido).map(limpar_).filter(l => String(l.data).slice(0, 7) === m);
  const cats = lerTabela_(ABA.C);
  let rec = 0, desp = 0; const porCat = {}, porQuem = {};
  ls.forEach(l => {
    if (l.tipo === 'receita') rec += l.valor;
    else if (l.tipo === 'despesa') {
      desp += l.valor; porCat[l.categoria] = (porCat[l.categoria] || 0) + l.valor;
      porQuem[l.quem || '—'] = (porQuem[l.quem || '—'] || 0) + l.valor;
    }
  });
  const r2 = x => Math.round(x * 100) / 100;
  return {
    mes: m, receitas: r2(rec), despesas: r2(desp), saldo: r2(rec - desp), lancamentos: ls.length,
    porCategoria: Object.keys(porCat).sort((a, b) => porCat[b] - porCat[a]).map(k => {
      const c = cats.find(c => c.nome === k); const orc = c ? Number(c.orcamento) || 0 : 0;
      return { categoria: k, total: r2(porCat[k]), orcamento: orc || null, usoOrcamento: orc ? Math.round(porCat[k] / orc * 100) + '%' : null };
    }),
    porPessoa: Object.keys(porQuem).map(k => ({ quem: k, total: r2(porQuem[k]) }))
  };
}

/* ============================== UTIL ============================== */

function brl_(v) {
  const [i, d] = Math.abs(Number(v) || 0).toFixed(2).split('.');
  return 'R$ ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d;
}
function aviso_(m) { try { SpreadsheetApp.getUi().alert(m); } catch (e) { Logger.log(m); } }
function props_() { return PropertiesService.getScriptProperties(); }
function aba_(n) { const s = SpreadsheetApp.getActive().getSheetByName(n); if (!s) throw new Error('Aba "' + n + '" não existe. Rode "Configurar planilha".'); return s; }
function tz_() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'America/Sao_Paulo'; }
function fmtData_(d, f) { return Utilities.formatDate(d instanceof Date ? d : new Date(d), tz_(), f); }
function hoje_() { return fmtData_(new Date(), 'yyyy-MM-dd'); }
function novoId_() { return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function gerarToken_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 20); }
function semAcento_(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function comLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function criarAba_(ss, nome, cols) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#eef2ff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function lerTabela_(nome) {
  const v = aba_(nome).getDataRange().getValues();
  const h = v.shift() || [];
  return v.filter(r => r[0] !== '').map(r => { const o = {}; h.forEach((k, i) => o[k] = r[i]); return o; });
}

function parseValor_(v) {
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[R$\s]/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseData_(v) {
  if (v instanceof Date) return v;
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], 12);
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date().getFullYear(); return new Date(y, +m[2] - 1, +m[1], 12); }
  if (/^hoje$/i.test(s) || !s) return parseData_(hoje_());
  if (/^ontem$/i.test(s)) return new Date(Date.now() - 864e5);
  const d = new Date(s);
  return isNaN(d) ? parseData_(hoje_()) : d;
}

function log_(evento, detalhe) {
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(ABA.LOG);
    if (!sh) return;
    sh.appendRow([new Date(), evento, String(detalhe || '').slice(0, 500)]);
    if (sh.getLastRow() > 300) sh.deleteRows(2, sh.getLastRow() - 300);
  } catch (e) { /* ignora */ }
}
