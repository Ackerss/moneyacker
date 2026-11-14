'use strict';
/* Finanças Acker — app (PWA). Lê/grava na planilha via Google Apps Script. */

const VERSAO = '1.1.0';
const API_PADRAO = 'https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec';
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem storage */ } }
};

const CATS_PADRAO = [
  ['Mercado', 'despesa', 'cart', '#22c55e', 2000], ['Alimentação', 'despesa', 'restaurant', '#f97316', 800],
  ['Transporte', 'despesa', 'car', '#3b82f6', 800], ['Casa', 'despesa', 'home', '#8b5cf6', 0],
  ['Contas', 'despesa', 'flash', '#eab308', 0], ['Saúde', 'despesa', 'medkit', '#ef4444', 0],
  ['Educação', 'despesa', 'school', '#06b6d4', 0], ['Lazer', 'despesa', 'game-controller', '#ec4899', 500],
  ['Compras', 'despesa', 'bag-handle', '#f43f5e', 600], ['Assinaturas', 'despesa', 'repeat', '#6366f1', 0],
  ['Beleza', 'despesa', 'sparkles', '#fb7185', 0], ['Pets', 'despesa', 'paw', '#b45309', 0],
  ['Viagem', 'despesa', 'airplane', '#0ea5e9', 0], ['Presentes', 'despesa', 'gift', '#d946ef', 0],
  ['Impostos e taxas', 'despesa', 'receipt', '#64748b', 0], ['Outros', 'despesa', 'ellipsis-horizontal', '#94a3b8', 0],
  ['Salário', 'receita', 'wallet', '#16a34a', 0], ['Pró-labore', 'receita', 'storefront', '#0d9488', 0],
  ['Extra', 'receita', 'cash', '#65a30d', 0], ['Rendimentos', 'receita', 'trending-up', '#0891b2', 0],
  ['Estorno', 'receita', 'arrow-undo', '#84cc16', 0], ['Outras receitas', 'receita', 'add-circle', '#4ade80', 0],
  ['Transferência', 'transferencia', 'swap-horizontal', '#94a3b8', 0]
].map(([nome, tipo, icone, cor, orcamento]) => ({ nome, tipo, icone, cor, orcamento }));

const SECOES_PADRAO = { cat: true, orc: true, contas: true, evo: true, quem: false, top: false, ult: true };

const S = {
  cfg: Object.assign({ url: '', token: '', quem: '' }, LS.get('fa_cfg', {})),
  tema: LS.get('fa_tema', 'auto'),
  abertas: Object.assign({}, SECOES_PADRAO, LS.get('fa_secoes', {})),
  d: { lancamentos: [], categorias: [], contas: [], pessoas: ['Jacson', 'Ana'] },
  demo: false,
  mes: ym(new Date()),
  pessoa: 'Todos',
  tab: 'painel',
  busca: '', filtroCat: '', filtroTipo: 'todos',
  charts: {},
  form: null
};

if (!S.cfg.url) S.cfg.url = API_PADRAO;

/* ============================== util ============================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const R = v => brl.format(v || 0);
const Rk = v => Math.abs(v) >= 10000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : R(v);
function ym(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function ymd(d) { return ym(d) + '-' + String(d.getDate()).padStart(2, '0'); }
function parseD(s) { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
function addMes(m, n) { const d = parseD(m + '-01'); d.setMonth(d.getMonth() + n); return ym(d); }
function nomeMes(m, curto) {
  const s = parseD(m + '-01').toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' });
  return curto ? s.replace('.', '') : s.replace(' de ', ' ');
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function parseValor(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
}
function novoId() { return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function cat(nome) {
  return S.d.categorias.find(c => c.nome === nome) || { nome: nome || 'Outros', icone: 'ellipsis-horizontal', cor: '#94a3b8', tipo: 'despesa', orcamento: 0 };
}
function icCat(c, sz) { return `<span class="cat-ic" style="background:${esc(c.cor)}${sz ? ';width:' + sz + 'px;height:' + sz + 'px' : ''}"><ion-icon name="${esc(c.icone)}"></ion-icon></span>`; }
function toast(msg, ms = 2600) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms);
}
function loading(on, txt) { $('#loading').classList.toggle('hidden', !on); if (txt) $('#loadingTxt').textContent = txt; }

/* ============================== API ============================== */
async function apiGet(params) {
  const u = new URL(S.cfg.url);
  Object.entries(Object.assign({}, params, { token: S.cfg.token, _: Date.now() })).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u.toString(), { redirect: 'follow' });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'Erro na API');
  return j;
}
async function apiPost(action, body) {
  const r = await fetch(S.cfg.url, {
    method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({ action, token: S.cfg.token }, body))
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'Erro na API');
  return j;
}
const conectado = () => !!(S.cfg.url && S.cfg.token);

/* fila offline: o que não conseguiu enviar fica guardado e reenviado depois */
function fila() { return LS.get('fa_fila', []); }
async function enviarFila() {
  if (!conectado()) return;
  const f = fila(); if (!f.length) return;
  const resto = [];
  for (const it of f) {
    try { await apiPost(it.action, it.body); } catch (e) { resto.push(it); }
  }
  LS.set('fa_fila', resto);
  if (f.length !== resto.length) toast(`${f.length - resto.length} lançamento(s) pendente(s) enviado(s)`);
}

async function carregar(silencioso) {
  if (!conectado()) { usarDemo(); return; }
  const btn = $('#btnRecarregar'); btn.classList.add('spin');
  try {
    await enviarFila();
    const j = await apiGet({ action: 'dados' });
    S.demo = false;
    S.d = { lancamentos: j.lancamentos || [], categorias: (j.categorias && j.categorias.length ? j.categorias : CATS_PADRAO), contas: j.contas || [], pessoas: j.pessoas || ['Jacson', 'Ana'], gemini: j.gemini, pluggy: j.pluggy };
    aplicarFilaLocal();
    LS.set('fa_cache', { d: S.d, em: Date.now() });
    status(`atualizado ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
  } catch (e) {
    const c = LS.get('fa_cache', null);
    if (c) { S.d = c.d; aplicarFilaLocal(); }
    status('offline · mostrando última cópia');
    if (!silencioso) toast('Não consegui conectar: ' + e.message, 4000);
  } finally { btn.classList.remove('spin'); }
  $('#demoBanner').classList.toggle('hidden', !S.demo);
  render();
}
function aplicarFilaLocal() {
  fila().forEach(it => {
    if (it.action === 'salvar') upsertLocal(it.body.lancamento);
    if (it.action === 'excluir') S.d.lancamentos = S.d.lancamentos.filter(l => l.id !== it.body.id);
  });
}
function status(t) { $('#statusLinha').textContent = (S.demo ? 'modo demonstração' : t); }

function usarDemo() {
  S.demo = true;
  S.d = gerarDemo();
  $('#demoBanner').classList.remove('hidden');
  status('');
  render();
}

/* ============================== cálculos ============================== */
function doMes(m, pessoa = S.pessoa) {
  return S.d.lancamentos.filter(l => String(l.data).slice(0, 7) === m && (pessoa === 'Todos' || l.quem === pessoa));
}
function totais(ls) {
  let rec = 0, desp = 0;
  ls.forEach(l => { if (l.tipo === 'receita') rec += +l.valor; else if (l.tipo === 'despesa') desp += +l.valor; });
  return { rec, desp, saldo: rec - desp };
}
function agrupar(ls, chave) {
  const m = {};
  ls.forEach(l => { const k = typeof chave === 'function' ? chave(l) : (l[chave] || '—'); if (!m[k]) m[k] = { k, total: 0, n: 0 }; m[k].total += +l.valor; m[k].n++; });
  return Object.values(m).sort((a, b) => b.total - a.total);
}
function chaveLoja(d) { return String(d || '').toUpperCase().replace(/[0-9*#\-_/.]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' '); }

/* ============================== render geral ============================== */
function render() {
  $('#mesLabel').textContent = nomeMes(S.mes);
  renderSegPessoa();
  if (S.tab === 'painel') renderPainel();
  if (S.tab === 'lanc') renderLanc();
  if (S.tab === 'ajustes') renderAjustes();
}

function renderSegPessoa() {
  const ops = ['Todos', ...S.d.pessoas];
  $('#segPessoa').innerHTML = ops.map(p => `<button data-v="${esc(p)}" class="${p === S.pessoa ? 'active' : ''}">${esc(p)}</button>`).join('');
}

function trocarTab(t) {
  S.tab = t;
  ['painel', 'lanc', 'ajustes'].forEach(x => $('#tab-' + x).classList.toggle('hidden', x !== t));
  $$('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  render();
  window.scrollTo({ top: 0 });
}

/* ============================== painel ============================== */
function renderPainel() {
  const ls = doMes(S.mes);
  const t = totais(ls);
  const ant = totais(doMes(addMes(S.mes, -1)));
  const desp = ls.filter(l => l.tipo === 'despesa');
  const hoje = new Date();
  const atual = S.mes === ym(hoje);
  const diasMes = new Date(+S.mes.slice(0, 4), +S.mes.slice(5, 7), 0).getDate();
  const proj = atual ? t.desp / Math.max(1, hoje.getDate()) * diasMes : t.desp;
  const orcTotal = S.d.categorias.filter(c => c.tipo === 'despesa' && +c.orcamento > 0).reduce((s, c) => s + +c.orcamento, 0);
  const orcUsado = S.d.categorias.filter(c => c.tipo === 'despesa' && +c.orcamento > 0)
    .reduce((s, c) => s + desp.filter(l => l.categoria === c.nome).reduce((a, l) => a + +l.valor, 0), 0);
  const varDesp = ant.desp ? (proj - ant.desp) / ant.desp * 100 : null;

  $('#hero').innerHTML = `
    <div class="hero">
      <div class="hero-label">Saldo do mês${S.pessoa !== 'Todos' ? ' · ' + esc(S.pessoa) : ''}</div>
      <div class="hero-valor num">${R(t.saldo)}</div>
      <div class="hero-grid">
        <div class="hero-box"><small><ion-icon name="arrow-up-circle"></ion-icon>Receitas</small><b class="num">${R(t.rec)}</b></div>
        <div class="hero-box"><small><ion-icon name="arrow-down-circle"></ion-icon>Despesas</small><b class="num">${R(t.desp)}</b></div>
        <div class="hero-box"><small><ion-icon name="speedometer"></ion-icon>${atual ? 'Projeção do mês' : 'Total gasto'}</small><b class="num">${R(proj)}</b></div>
        <div class="hero-box"><small><ion-icon name="flag"></ion-icon>Orçamento usado</small><b class="num">${orcTotal ? Math.round(orcUsado / orcTotal * 100) + '%' : '—'}</b></div>
      </div>
      <div class="hero-foot">
        ${varDesp == null ? '' : `<span class="pill"><ion-icon name="${varDesp > 0 ? 'trending-up' : 'trending-down'}"></ion-icon>${atual ? 'Projeção' : 'Despesas'} ${varDesp > 0 ? '+' : ''}${varDesp.toFixed(0)}% vs ${nomeMes(addMes(S.mes, -1), true)}</span>`}
        <span class="pill"><ion-icon name="receipt"></ion-icon>${desp.length} despesa${desp.length === 1 ? '' : 's'}</span>
        ${atual && t.desp ? `<span class="pill"><ion-icon name="calendar"></ion-icon>${R(t.desp / Math.max(1, hoje.getDate()))}/dia</span>` : ''}
      </div>
    </div>`;

  const secoes = [secCategorias(desp, t), secOrcamentos(desp), secContas(ls), secEvolucao(), secQuem(), secTop(desp), secUltimos(ls)];
  $('#secoes').innerHTML = secoes.join('');
  desenharGraficos(desp);
}

function secao(id, icone, titulo, resumo, corpo, cor) {
  return `<details class="card" data-sec="${id}" ${S.abertas[id] ? 'open' : ''}>
    <summary><span class="sec-ic" ${cor ? `style="background:${cor}22;color:${cor}"` : ''}><ion-icon name="${icone}"></ion-icon></span>
      <span class="sec-tit"><b>${titulo}</b><small>${resumo}</small></span><ion-icon class="chev" name="chevron-down"></ion-icon></summary>
    <div class="sec-body">${corpo}</div></details>`;
}

function secCategorias(desp, t) {
  const g = agrupar(desp, 'categoria');
  if (!g.length) return secao('cat', 'pie-chart', 'Despesas por categoria', 'Nada lançado neste mês', `<div class="vazio">Sem despesas em ${nomeMes(S.mes)}.</div>`);
  const max = g[0].total;
  const linhas = g.map(x => {
    const c = cat(x.k);
    return `<button class="row" data-filtra-cat="${esc(x.k)}">${icCat(c)}<div class="row-main">
      <div class="row-top"><span class="nome">${esc(x.k)}</span><span class="val num">${R(x.total)}</span></div>
      <div class="row-sub"><span>${x.n} lançamento${x.n > 1 ? 's' : ''}</span><span>${(x.total / t.desp * 100).toFixed(1)}%</span></div>
      <div class="bar"><i style="width:${x.total / max * 100}%;background:${esc(c.cor)}"></i></div></div></button>`;
  }).join('');
  return secao('cat', 'pie-chart', 'Despesas por categoria', `${g.length} categorias · maior: ${esc(g[0].k)}`,
    `<div class="donut-wrap"><canvas id="chDonut"></canvas><div class="donut-center"><small>Total</small><b class="num">${R(t.desp)}</b></div></div><div class="rows">${linhas}</div>`);
}

function secOrcamentos(desp) {
  const cats = S.d.categorias.filter(c => c.tipo === 'despesa' && +c.orcamento > 0);
  if (!cats.length) return secao('orc', 'flag', 'Orçamentos', 'Nenhum definido', `<div class="vazio">Defina limites por categoria em <button class="link" data-go="ajustes">Ajustes</button>.</div>`, '#d98a06');
  const hoje = new Date();
  const diasMes = new Date(+S.mes.slice(0, 4), +S.mes.slice(5, 7), 0).getDate();
  const frac = S.mes === ym(hoje) ? hoje.getDate() / diasMes : 1;
  let tg = 0, to = 0, estouro = 0;
  const linhas = cats.map(c => {
    const g = desp.filter(l => l.categoria === c.nome).reduce((s, l) => s + +l.valor, 0);
    const p = g / c.orcamento; tg += g; to += +c.orcamento; if (p > 1) estouro++;
    const cor = p > 1 ? cssVar('--red') : p > Math.max(.8, frac + .1) ? cssVar('--amber') : cssVar('--green');
    const resta = c.orcamento - g;
    return `<div class="row">${icCat(c)}<div class="row-main">
      <div class="row-top"><span class="nome">${esc(c.nome)}</span><span class="val num">${R(g)} <span class="muted" style="font-weight:500">/ ${Rk(+c.orcamento)}</span></span></div>
      <div class="bar big"><i style="width:${Math.min(100, p * 100)}%;background:${cor}"></i></div>
      <div class="row-sub"><span>${Math.round(p * 100)}% usado</span><span class="${resta < 0 ? 'neg' : ''}">${resta < 0 ? 'estourou ' + R(-resta) : 'resta ' + R(resta)}</span></div></div></div>`;
  }).join('');
  return secao('orc', 'flag', 'Orçamentos', `${R(tg)} de ${R(to)}${estouro ? ` · <span class="neg">${estouro} estourado${estouro > 1 ? 's' : ''}</span>` : ''}`, `<div class="rows">${linhas}</div>`, '#d98a06');
}

function secContas(ls) {
  const desp = ls.filter(l => l.tipo === 'despesa');
  const porConta = agrupar(desp, 'conta');
  const contas = S.d.contas || [];
  const nomes = Array.from(new Set([...contas.map(c => c.nome), ...porConta.map(x => x.k)])).filter(n => n && n !== '—');
  if (!nomes.length) return secao('contas', 'card', 'Contas e cartões', 'Sem contas', `<div class="vazio">Nenhuma conta ainda.</div>`, '#3b82f6');
  const linhas = nomes.map(n => {
    const c = contas.find(x => x.nome === n) || { nome: n, tipo: /cart/i.test(n) ? 'cartao' : 'banco', cor: '#64748b' };
    const g = (porConta.find(x => x.k === n) || { total: 0, n: 0 });
    const ic = c.tipo === 'cartao' ? 'card' : c.tipo === 'dinheiro' ? 'cash' : 'business';
    let sub = `${g.n} despesa${g.n === 1 ? '' : 's'} no mês`;
    if (c.saldo != null && c.saldo !== '') sub = c.tipo === 'cartao' ? `Fatura ${R(c.saldo)}${c.limite ? ' de ' + Rk(c.limite) : ''}` : `Saldo ${R(c.saldo)}`;
    const usoLim = c.tipo === 'cartao' && c.limite ? Math.min(100, (+c.saldo || 0) / c.limite * 100) : null;
    return `<div class="row"><span class="cat-ic" style="background:${esc(c.cor || '#64748b')}"><ion-icon name="${ic}"></ion-icon></span><div class="row-main">
      <div class="row-top"><span class="nome">${esc(n)}</span><span class="val num">${R(g.total)}</span></div>
      <div class="row-sub"><span>${sub}</span><span>no mês</span></div>
      ${usoLim != null ? `<div class="bar"><i style="width:${usoLim}%;background:${esc(c.cor || '#8b5cf6')}"></i></div>` : ''}</div></div>`;
  }).join('');
  const saldoTotal = contas.filter(c => c.tipo !== 'cartao' && c.saldo != null && c.saldo !== '').reduce((s, c) => s + +c.saldo, 0);
  const fatTotal = contas.filter(c => c.tipo === 'cartao' && c.saldo != null && c.saldo !== '').reduce((s, c) => s + +c.saldo, 0);
  const resumo = (saldoTotal || fatTotal) ? `Saldo ${R(saldoTotal)} · faturas ${R(fatTotal)}` : `${nomes.length} conta${nomes.length > 1 ? 's' : ''}`;
  return secao('contas', 'card', 'Contas e cartões', resumo, `<div class="rows">${linhas}</div>`, '#3b82f6');
}

function secEvolucao() {
  const meses = Array.from({ length: 6 }, (_, i) => addMes(S.mes, i - 5));
  const ts = meses.map(m => totais(doMes(m)));
  const comDados = ts.filter(t => t.desp > 0);
  const media = comDados.length ? comDados.reduce((s, t) => s + t.desp, 0) / comDados.length : 0;
  const medRec = ts.filter(t => t.rec > 0).length ? ts.reduce((s, t) => s + t.rec, 0) / ts.filter(t => t.rec > 0).length : 0;
  const saldoAcum = ts.reduce((s, t) => s + t.saldo, 0);
  return secao('evo', 'stats-chart', 'Evolução (6 meses)', `Média de gastos ${R(media)}/mês`,
    `<div class="kpis"><div class="kpi"><small>Média receitas</small><b class="num pos">${Rk(medRec)}</b></div>
     <div class="kpi"><small>Média despesas</small><b class="num neg">${Rk(media)}</b></div>
     <div class="kpi"><small>Sobra 6 meses</small><b class="num ${saldoAcum >= 0 ? 'pos' : 'neg'}">${Rk(saldoAcum)}</b></div></div>
     <div class="chart-box"><canvas id="chEvo"></canvas></div>`, '#0891b2');
}

function secQuem() {
  const desp = doMes(S.mes, 'Todos').filter(l => l.tipo === 'despesa');
  const g = agrupar(desp, l => l.quem || 'Sem dono');
  const tot = g.reduce((s, x) => s + x.total, 0);
  const cores = ['#5b4cf0', '#ec4899', '#14b8a6', '#f59e0b'];
  if (!tot) return secao('quem', 'people', 'Quem gastou', 'Sem despesas', `<div class="vazio">Sem despesas no mês.</div>`, '#ec4899');
  const barra = g.map((x, i) => `<i style="width:${x.total / tot * 100}%;background:${cores[i % 4]}"></i>`).join('');
  const linhas = g.map((x, i) => {
    const top = agrupar(desp.filter(l => (l.quem || 'Sem dono') === x.k), 'categoria').slice(0, 3).map(c => c.k).join(', ');
    return `<div class="row"><span class="cat-ic" style="background:${cores[i % 4]}"><ion-icon name="person"></ion-icon></span><div class="row-main">
      <div class="row-top"><span class="nome">${esc(x.k)}</span><span class="val num">${R(x.total)}</span></div>
      <div class="row-sub"><span>${esc(top)}</span><span>${(x.total / tot * 100).toFixed(0)}%</span></div></div></div>`;
  }).join('');
  return secao('quem', 'people', 'Quem gastou', g.map(x => `${esc(x.k)} ${(x.total / tot * 100).toFixed(0)}%`).join(' · '),
    `<div class="split">${barra}</div><div class="rows">${linhas}</div>`, '#ec4899');
}

function secTop(desp) {
  const g = agrupar(desp, l => chaveLoja(l.descricao)).slice(0, 8);
  if (!g.length) return secao('top', 'storefront', 'Onde mais gastamos', '—', `<div class="vazio">Sem despesas no mês.</div>`, '#f97316');
  const max = g[0].total;
  const linhas = g.map((x, i) => {
    const ex = desp.find(l => chaveLoja(l.descricao) === x.k);
    const c = cat(ex && ex.categoria);
    return `<div class="row">${icCat(c)}<div class="row-main">
      <div class="row-top"><span class="nome">${i + 1}. ${esc(ex ? ex.descricao : x.k)}</span><span class="val num">${R(x.total)}</span></div>
      <div class="row-sub"><span>${x.n}× · média ${R(x.total / x.n)}</span><span>${esc(c.nome)}</span></div>
      <div class="bar"><i style="width:${x.total / max * 100}%;background:${esc(c.cor)}"></i></div></div></div>`;
  }).join('');
  return secao('top', 'storefront', 'Onde mais gastamos', `Top: ${esc((desp.find(l => chaveLoja(l.descricao) === g[0].k) || {}).descricao || g[0].k)} (${R(g[0].total)})`, `<div class="rows">${linhas}</div>`, '#f97316');
}

function secUltimos(ls) {
  const u = ls.slice().sort(ordenar).slice(0, 6);
  const corpo = u.length ? `<div class="rows">${u.map(linhaLanc).join('')}</div><button class="ver-mais" data-go="lanc">Ver todos os lançamentos</button>`
    : `<div class="vazio">Nenhum lançamento. Toque no <b>+</b> para começar.</div>`;
  return secao('ult', 'time', 'Últimos lançamentos', `${ls.length} no mês`, corpo, '#64748b');
}

function ordenar(a, b) { return String(b.data).localeCompare(String(a.data)) || String(b.criado_em || '').localeCompare(String(a.criado_em || '')); }

function linhaLanc(l) {
  const c = cat(l.categoria);
  const sinal = l.tipo === 'receita' ? '+' : l.tipo === 'transferencia' ? '' : '−';
  const cls = l.tipo === 'receita' ? 'pos' : l.tipo === 'transferencia' ? 'muted' : '';
  const extra = [esc(l.categoria), esc(l.conta), esc(l.quem)].filter(Boolean).join(' · ');
  const tags = [l.parcela ? `<span class="tag">${esc(l.parcela)}</span>` : '', l.origem && l.origem !== 'manual' ? `<span class="tag">${esc(l.origem)}</span>` : ''].join(' ');
  return `<div class="row" data-edit="${esc(l.id)}" style="cursor:pointer">${icCat(c)}<div class="row-main">
    <div class="row-top"><span class="nome">${esc(l.descricao || l.categoria)}</span><span class="val num ${cls}">${sinal} ${R(l.valor)}</span></div>
    <div class="row-sub"><span>${extra}</span><span>${tags}</span></div></div></div>`;
}

/* ---------- gráficos ---------- */
function desenharGraficos(desp) {
  if (!window.Chart) { setTimeout(() => S.tab === 'painel' && desenharGraficos(desp), 300); return; }
  Object.values(S.charts).forEach(c => c.destroy()); S.charts = {};
  const txt = cssVar('--muted'), grid = cssVar('--line'), card = cssVar('--card');
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = txt;
  const el = $('#chDonut');
  if (el) {
    const g = agrupar(desp, 'categoria');
    S.charts.donut = new Chart(el, {
      type: 'doughnut',
      data: { labels: g.map(x => x.k), datasets: [{ data: g.map(x => +x.total.toFixed(2)), backgroundColor: g.map(x => cat(x.k).cor), borderColor: card, borderWidth: 3, hoverOffset: 6 }] },
      options: { cutout: '72%', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${R(c.parsed)}` } } } }
    });
  }
  const ev = $('#chEvo');
  if (ev) {
    const meses = Array.from({ length: 6 }, (_, i) => addMes(S.mes, i - 5));
    const ts = meses.map(m => totais(doMes(m)));
    S.charts.evo = new Chart(ev, {
      type: 'bar',
      data: {
        labels: meses.map(m => nomeMes(m, true)),
        datasets: [
          { label: 'Receitas', data: ts.map(t => +t.rec.toFixed(2)), backgroundColor: cssVar('--green'), borderRadius: 6, maxBarThickness: 22 },
          { label: 'Despesas', data: ts.map(t => +t.desp.toFixed(2)), backgroundColor: cssVar('--red'), borderRadius: 6, maxBarThickness: 22 },
          { type: 'line', label: 'Saldo', data: ts.map(t => +t.saldo.toFixed(2)), borderColor: cssVar('--primary'), backgroundColor: cssVar('--primary'), tension: .35, pointRadius: 3, borderWidth: 2 }
        ]
      },
      options: {
        maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14 } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${R(c.parsed.y)}` } } },
        scales: { x: { grid: { display: false } }, y: { grid: { color: grid }, border: { display: false }, ticks: { callback: v => Math.abs(v) >= 1000 ? (v / 1000).toLocaleString('pt-BR') + 'k' : v } } }
      }
    });
  }
}

/* ============================== lançamentos ============================== */
function renderLanc() {
  $('#segTipo').innerHTML = [['todos', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas']]
    .map(([v, t]) => `<button data-v="${v}" class="${S.filtroTipo === v ? 'active' : ''}">${t}</button>`).join('');
  const cats = S.d.categorias;
  $('#filtroCat').innerHTML = `<option value="">Todas as categorias</option>` + cats.map(c => `<option ${S.filtroCat === c.nome ? 'selected' : ''}>${esc(c.nome)}</option>`).join('');
  $('#busca').value = S.busca;
  const q = S.busca.trim().toLowerCase();
  let ls = (q ? S.d.lancamentos.filter(l => S.pessoa === 'Todos' || l.quem === S.pessoa) : doMes(S.mes))
    .filter(l => (S.filtroTipo === 'todos' || l.tipo === S.filtroTipo) && (!S.filtroCat || l.categoria === S.filtroCat))
    .filter(l => !q || [l.descricao, l.categoria, l.conta, l.obs, l.quem, String(l.valor).replace('.', ',')].join(' ').toLowerCase().includes(q))
    .sort(ordenar);
  const t = totais(ls);
  $('#lancResumo').innerHTML = `<div class="kpi"><small>${q ? 'Resultados' : 'Lançamentos'}</small><b>${ls.length}</b></div>
    <div class="kpi"><small>Despesas</small><b class="num neg">${Rk(t.desp)}</b></div><div class="kpi"><small>Receitas</small><b class="num pos">${Rk(t.rec)}</b></div>`;
  if (!ls.length) { $('#lancLista').innerHTML = `<div class="vazio">Nada encontrado${q ? '' : ' em ' + nomeMes(S.mes)}.</div>`; return; }
  const dias = {};
  ls.forEach(l => { (dias[l.data] = dias[l.data] || []).push(l); });
  const hoje = ymd(new Date()), ontem = ymd(new Date(Date.now() - 864e5));
  $('#lancLista').innerHTML = Object.keys(dias).sort().reverse().map(d => {
    const lst = dias[d];
    const td = totais(lst);
    const rot = d === hoje ? 'Hoje' : d === ontem ? 'Ontem' : parseD(d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', ...(q ? { year: 'numeric' } : {}) });
    return `<div class="dia"><div class="dia-head"><span>${rot}</span><span class="num">${td.desp ? '−' + R(td.desp) : ''}${td.rec ? ' +' + R(td.rec) : ''}</span></div>
      <div class="card rows">${lst.map(linhaLanc).join('')}</div></div>`;
  }).join('');
}

/* ============================== formulário ============================== */
function abrirForm(l, tipoInicial) {
  const novo = !l;
  S.form = l ? Object.assign({}, l) : { id: novoId(), tipo: tipoInicial || 'despesa', data: ymd(new Date()), quem: S.cfg.quem || (S.pessoa !== 'Todos' ? S.pessoa : S.d.pessoas[0]), origem: 'manual', categoria: '', conta: LS.get('fa_ultConta', '') };
  const f = S.form;
  $('#fTitulo').textContent = novo ? 'Novo lançamento' : 'Editar lançamento';
  $('#fValor').value = f.valor ? String(Number(f.valor).toFixed(2)).replace('.', ',') : '';
  $('#fDesc').value = f.descricao || '';
  $('#fData').value = String(f.data).slice(0, 10);
  $('#fObs').value = f.obs || '';
  $('#fExcluir').classList.toggle('hidden', novo);
  $('#btnFoto').classList.toggle('hidden', !novo);
  $('#fMeta').textContent = novo ? '' : [f.origem && 'origem: ' + f.origem, f.parcela && 'parcela ' + f.parcela, f.criado_em && 'criado ' + f.criado_em].filter(Boolean).join(' · ');
  renderItens(f.itens);
  renderFormTipo();
  $('#sheet').classList.add('open'); $('#sheet').setAttribute('aria-hidden', 'false');
  $('#backdrop').classList.remove('hidden');
  if (novo && window.matchMedia('(min-width: 960px)').matches) setTimeout(() => $('#fValor').focus(), 150);
}
function renderFormTipo() {
  const f = S.form;
  const tipos = [['despesa', 'Despesa'], ['receita', 'Receita']];
  if (f.tipo === 'transferencia') tipos.push(['transferencia', 'Transferência']);
  $('#fTipo').innerHTML = tipos.map(([v, t]) => `<button data-v="${v}" class="${f.tipo === v ? 'active' : ''}">${t}</button>`).join('');
  $('#valorBox').classList.toggle('receita', f.tipo === 'receita');
  const cats = S.d.categorias.filter(c => c.tipo === f.tipo);
  if (!cats.find(c => c.nome === f.categoria) && f.categoria && f.tipo !== 'transferencia') cats.push(cat(f.categoria));
  $('#fCats').innerHTML = cats.map(c => `<button class="cat-op ${c.nome === f.categoria ? 'active' : ''}" data-cat="${esc(c.nome)}">${icCat(c)}<span>${esc(c.nome)}</span></button>`).join('');
  const contas = Array.from(new Set([...(S.d.contas || []).map(c => c.nome), ...S.d.lancamentos.map(l => l.conta)].filter(Boolean)));
  if (f.conta && !contas.includes(f.conta)) contas.unshift(f.conta);
  $('#fConta').innerHTML = `<option value="">—</option>` + contas.map(c => `<option ${c === f.conta ? 'selected' : ''}>${esc(c)}</option>`).join('') + `<option value="__nova">+ Nova conta…</option>`;
  $('#fQuem').innerHTML = S.d.pessoas.map(p => `<button data-v="${esc(p)}" class="${p === f.quem ? 'active' : ''}">${esc(p)}</button>`).join('');
}
function renderItens(itens) {
  let arr = itens;
  if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (e) { arr = null; } }
  const box = $('#fItensBox');
  if (!Array.isArray(arr) || !arr.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.querySelector('summary').textContent = `Itens do cupom (${arr.length})`;
  $('#fItens').innerHTML = arr.map(i => `<div class="item-l"><span>${esc(i.qtd && i.qtd !== 1 ? i.qtd + '× ' : '')}${esc(i.nome)}</span><b class="num">${R(i.valor)}</b></div>`).join('');
}
function fecharForm() {
  $('#sheet').classList.remove('open'); $('#sheet').setAttribute('aria-hidden', 'true');
  $('#backdrop').classList.add('hidden'); S.form = null;
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
}
function upsertLocal(l) {
  const i = S.d.lancamentos.findIndex(x => x.id === l.id);
  if (i >= 0) S.d.lancamentos[i] = Object.assign({}, S.d.lancamentos[i], l); else S.d.lancamentos.push(l);
}
async function salvarForm() {
  const f = S.form;
  f.valor = parseValor($('#fValor').value);
  f.descricao = $('#fDesc').value.trim();
  f.data = $('#fData').value || ymd(new Date());
  f.obs = $('#fObs').value.trim();
  if (!f.valor) { toast('Informe o valor'); $('#fValor').focus(); return; }
  if (!f.categoria) f.categoria = f.tipo === 'receita' ? '' : '';
  if (!f.descricao && f.categoria) f.descricao = f.categoria;
  if (!f.descricao && !f.categoria) { toast('Escolha uma categoria ou escreva a descrição'); return; }
  if (f.conta) LS.set('fa_ultConta', f.conta);
  const l = Object.assign({}, f);
  if (!l.criado_em) l.criado_em = new Date().toISOString().slice(0, 16).replace('T', ' ');
  upsertLocal(l);
  fecharForm();
  S.mes = String(l.data).slice(0, 7);
  render();
  if (S.demo) { toast('Salvo (modo demonstração)'); return; }
  try {
    const r = await apiPost('salvar', { lancamento: l });
    upsertLocal(r.lancamento);
    LS.set('fa_cache', { d: S.d, em: Date.now() });
    render();
    toast('✅ Lançamento salvo');
  } catch (e) {
    LS.set('fa_fila', [...fila(), { action: 'salvar', body: { lancamento: l } }]);
    toast('Sem conexão: salvo no aparelho e envio depois', 3500);
  }
}
async function excluirForm() {
  const f = S.form;
  if (!confirmarExclusao()) return;
  S.d.lancamentos = S.d.lancamentos.filter(l => l.id !== f.id);
  fecharForm(); render();
  if (S.demo) return;
  try { await apiPost('excluir', { id: f.id }); toast('Lançamento excluído'); }
  catch (e) { LS.set('fa_fila', [...fila(), { action: 'excluir', body: { id: f.id } }]); toast('Excluído no aparelho; sincroniza depois'); }
}
function confirmarExclusao() {
  const b = $('#fExcluir');
  if (b.dataset.confirma === '1') { b.dataset.confirma = ''; b.innerHTML = '<ion-icon name="trash"></ion-icon>'; return true; }
  b.dataset.confirma = '1'; b.textContent = 'Confirmar?';
  setTimeout(() => { b.dataset.confirma = ''; b.innerHTML = '<ion-icon name="trash"></ion-icon>'; }, 3000);
  return false;
}

/* ---------- foto do cupom (Gemini no backend) ---------- */
async function lerFoto(file) {
  if (!file) return;
  if (S.demo || !conectado()) { toast('Conecte a planilha (Ajustes) para ler fotos', 3500); return; }
  loading(true, 'Lendo foto com IA…');
  try {
    const b64 = await comprimir(file, 1400, .8);
    const r = await apiPost('lerFoto', { imagem: b64, mime: 'image/jpeg' });
    const x = r.resultado || {};
    if (!S.form) abrirForm(null);
    const f = S.form;
    if (x.tipo) f.tipo = x.tipo === 'receita' ? 'receita' : 'despesa';
    if (x.valor) $('#fValor').value = String(Number(x.valor).toFixed(2)).replace('.', ',');
    if (x.descricao) $('#fDesc').value = x.descricao;
    if (x.data) $('#fData').value = String(x.data).slice(0, 10);
    if (x.categoria) f.categoria = x.categoria;
    if (x.forma_pagamento) $('#fObs').value = 'Pagamento: ' + x.forma_pagamento;
    if (x.itens && x.itens.length) f.itens = x.itens;
    f.origem = 'foto';
    renderFormTipo(); renderItens(f.itens);
    toast('Confira os dados e toque em Salvar');
  } catch (e) { toast('Não consegui ler a foto: ' + e.message, 4000); }
  finally { loading(false); $('#fFoto').value = ''; }
}
function comprimir(file, max, q) {
  return new Promise((ok, erro) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', q).split(',')[1]);
    };
    img.onerror = () => erro(new Error('imagem inválida'));
    img.src = url;
  });
}

/* ============================== instalar ============================== */
let pedidoInstalar = null;
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); pedidoInstalar = e; atualizarInstalar(); });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; toast('✅ App instalado na tela inicial', 3500); atualizarInstalar(); });
function atualizarInstalar() {
  const off = instalado() || LS.get('fa_inst_off', false) || (!pedidoInstalar && !matchMedia('(pointer: coarse)').matches);
  $('#instBanner').classList.toggle('hidden', off);
  if (S.tab === 'ajustes') renderAjustes();
}
function cardInstalar() {
  if (instalado()) return `<div class="aj-card inst-card"><img src="icon.svg" alt=""><div><h4>App instalado ✅</h4><p>Você está usando o app pela tela inicial.</p></div></div>`;
  const passos = ehIOS()
    ? `<ol class="inst-passos"><li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> <ion-icon name="share-outline"></ion-icon> (embaixo da tela).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li></ol>`
    : `<ol class="inst-passos"><li>Abra no <b>Chrome</b> do celular.</li><li>Toque no menu <b>⋮</b> (canto de cima).</li><li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li></ol>`;
  return `<div class="aj-card">
    <div class="inst-card"><img src="icon.svg" alt=""><div><h4>Instalar no celular</h4><p>Coloca o ícone do Finanças na tela inicial. Abre em tela cheia, como um app normal.</p></div></div>
    ${pedidoInstalar ? '<button class="btn primary full" id="ajInstalar"><ion-icon name="download"></ion-icon> Instalar app</button>' : passos}
  </div>`;
}
async function instalarApp() {
  if (!pedidoInstalar) { trocarTab('ajustes'); return; }
  pedidoInstalar.prompt();
  const r = await pedidoInstalar.userChoice.catch(() => ({}));
  if (r && r.outcome === 'accepted') pedidoInstalar = null;
  atualizarInstalar();
}

/* ============================== ajustes ============================== */
function renderAjustes() {
  const c = S.cfg;
  const desp = S.d.categorias.filter(x => x.tipo === 'despesa');
  $('#ajustes').innerHTML = cardInstalar() + `
  <div class="aj-card">
    <h4>Conexão com a planilha</h4>
    <p>Cole o <b>token</b> (na planilha: menu 💰 Financeiro → Ver token de acesso). O endereço já vem preenchido. Fica salvo só neste aparelho.</p>
    <label class="field"><span>Endereço do App da Web</span><input id="ajUrl" value="${esc(c.url)}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off"></label>
    <label class="field"><span>Token</span><input id="ajToken" value="${esc(c.token)}" placeholder="token mostrado na planilha" autocomplete="off"></label>
    <div class="field"><span>Quem usa este aparelho</span><div class="seg full" id="ajQuem">${S.d.pessoas.map(p => `<button data-v="${esc(p)}" class="${p === c.quem ? 'active' : ''}">${esc(p)}</button>`).join('')}</div></div>
    <div class="btn-row"><button class="btn primary grow" id="ajSalvar">Salvar e testar</button>${conectado() ? '<button class="btn ghost" id="ajDemo">Ver demonstração</button>' : ''}</div>
    <div class="ok-msg" id="ajMsg">${conectado() ? (S.demo ? '' : '✅ Conectado' + (S.d.gemini ? ' · IA (Gemini) ativa' : ' · IA desligada') + (S.d.pluggy ? ' · Pluggy ativo' : '')) : ''}</div>
  </div>
  <div class="aj-card">
    <h4>Orçamento mensal por categoria</h4>
    <p>Deixe vazio para não acompanhar. Aparece na seção “Orçamentos” do painel.</p>
    ${desp.map(x => `<div class="orc-row">${icCat(x, 32)}<span class="nome">${esc(x.nome)}</span><input inputmode="decimal" data-orc="${esc(x.nome)}" value="${+x.orcamento ? String(x.orcamento).replace('.', ',') : ''}" placeholder="R$ 0"></div>`).join('')}
    <button class="btn primary full" id="ajOrc" style="margin-top:12px">Salvar orçamentos</button>
  </div>
  <div class="aj-card">
    <h4>Bancos e cartões (Pluggy)</h4>
    <p>Importa automaticamente as compras do cartão e da conta. Roda sozinho 3× por dia depois de configurado na planilha.</p>
    <button class="btn ghost full" id="ajPluggy"><ion-icon name="sync"></ion-icon> Sincronizar agora</button>
  </div>
  <div class="aj-card">
    <h4>Aparência</h4>
    <div class="seg full" id="ajTema">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v, t]) => `<button data-v="${v}" class="${S.tema === v ? 'active' : ''}">${t}</button>`).join('')}</div>
  </div>
  <div class="aj-card">
    <h4>Dados</h4>
    <div class="btn-row"><button class="btn ghost grow" id="ajCsv"><ion-icon name="download"></ion-icon> Exportar mês (CSV)</button>
    <button class="btn ghost grow" id="ajCache">Limpar cache</button></div>
    <p style="margin:12px 0 0">Pendentes de envio: ${fila().length} · versão ${VERSAO}</p>
  </div>`;
}

async function salvarConexao() {
  S.cfg.url = $('#ajUrl').value.trim();
  S.cfg.token = $('#ajToken').value.trim();
  const q = $('#ajQuem .active'); if (q) S.cfg.quem = q.dataset.v;
  LS.set('fa_cfg', S.cfg);
  if (!conectado()) { $('#ajMsg').textContent = 'Preencha endereço e token.'; return; }
  $('#ajMsg').textContent = 'Testando…';
  await carregar();
  $('#ajMsg').textContent = S.demo ? '' : '✅ Conectado! ' + S.d.lancamentos.length + ' lançamentos carregados.';
}
async function salvarOrc() {
  const orc = {};
  $$('[data-orc]').forEach(i => { orc[i.dataset.orc] = parseValor(i.value); });
  S.d.categorias.forEach(c => { if (c.nome in orc) c.orcamento = orc[c.nome]; });
  if (S.demo) { toast('Salvo (modo demonstração)'); return; }
  try { await apiPost('orcamentos', { orcamentos: orc }); toast('✅ Orçamentos salvos'); LS.set('fa_cache', { d: S.d, em: Date.now() }); }
  catch (e) { toast('Erro: ' + e.message); }
}
async function syncPluggy() {
  if (S.demo || !conectado()) { toast('Conecte a planilha primeiro'); return; }
  loading(true, 'Buscando transações dos bancos…');
  try { const r = await apiPost('syncPluggy', {}); toast(`✅ ${r.resumo.novas} novas transações`, 3500); await carregar(true); }
  catch (e) { toast('Pluggy: ' + e.message, 5000); }
  finally { loading(false); }
}
function exportarCsv() {
  const ls = doMes(S.mes).sort(ordenar);
  const cols = ['data', 'descricao', 'valor', 'tipo', 'categoria', 'conta', 'quem', 'origem', 'parcela', 'obs'];
  const csv = [cols.join(';'), ...ls.map(l => cols.map(k => k === 'valor' ? String(l.valor).replace('.', ',') : '"' + String(l[k] || '').replace(/"/g, '""') + '"').join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `financas-${S.mes}.csv`; a.click();
}
function aplicarTema() {
  if (S.tema === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', S.tema);
}

/* ============================== eventos ============================== */
function ligarEventos() {
  document.addEventListener('click', e => {
    const t = e.target.closest('button, [data-edit], [data-go]');
    if (!t) return;
    if (t.dataset.tab) return trocarTab(t.dataset.tab);
    if (t.dataset.go) return trocarTab(t.dataset.go);
    if (t.dataset.filtraCat) { S.filtroCat = t.dataset.filtraCat; S.filtroTipo = 'despesa'; S.busca = ''; return trocarTab('lanc'); }
    if (t.dataset.edit) { const l = S.d.lancamentos.find(x => x.id === t.dataset.edit); if (l) abrirForm(l); return; }
    if (t.closest('#segPessoa')) { S.pessoa = t.dataset.v; return render(); }
    if (t.closest('#segTipo')) { S.filtroTipo = t.dataset.v; return renderLanc(); }
    if (t.closest('#fTipo')) { S.form.tipo = t.dataset.v; S.form.categoria = ''; return renderFormTipo(); }
    if (t.closest('#fQuem')) { S.form.quem = t.dataset.v; return renderFormTipo(); }
    if (t.dataset.cat) { S.form.categoria = t.dataset.cat; $$('.cat-op').forEach(b => b.classList.toggle('active', b === t)); return; }
    if (t.closest('#ajQuem')) { $$('#ajQuem button').forEach(b => b.classList.toggle('active', b === t)); return; }
    if (t.closest('#ajTema')) { S.tema = t.dataset.v; LS.set('fa_tema', S.tema); aplicarTema(); return render(); }
    switch (t.id) {
      case 'mesPrev': S.mes = addMes(S.mes, -1); return render();
      case 'mesNext': S.mes = addMes(S.mes, 1); return render();
      case 'mesLabel': S.mes = ym(new Date()); return render();
      case 'btnRecarregar': return carregar();
      case 'fab': return abrirForm(null);
      case 'fFechar': return fecharForm();
      case 'fSalvar': return salvarForm();
      case 'fExcluir': return excluirForm();
      case 'btnFoto': return $('#fFoto').click();
      case 'btnFotoNav': if (S.demo || !conectado()) { toast('Conecte a planilha (Ajustes) para ler fotos', 3500); return; } abrirForm(null); return $('#fFoto').click();
      case 'ajSalvar': return salvarConexao();
      case 'ajDemo': return usarDemo();
      case 'ajOrc': return salvarOrc();
      case 'ajPluggy': return syncPluggy();
      case 'ajCsv': return exportarCsv();
      case 'ajInstalar': case 'instBtn': return instalarApp();
      case 'instFechar': LS.set('fa_inst_off', true); return atualizarInstalar();
      case 'ajCache': localStorage.removeItem('fa_cache'); toast('Cache limpo'); return carregar();
    }
  });
  $('#backdrop').addEventListener('click', fecharForm);
  $('#fFoto').addEventListener('change', e => lerFoto(e.target.files[0]));
  $('#fConta').addEventListener('change', e => {
    if (e.target.value === '__nova') {
      const n = (prompt('Nome da conta ou cartão (ex: Nubank Jacson):') || '').trim();
      if (n) { S.form.conta = n; } renderFormTipo();
    } else S.form.conta = e.target.value;
  });
  $('#busca').addEventListener('input', e => { S.busca = e.target.value; clearTimeout(S._b); S._b = setTimeout(renderLanc, 200); });
  $('#filtroCat').addEventListener('change', e => { S.filtroCat = e.target.value; renderLanc(); });
  $('#fValor').addEventListener('keydown', e => { if (e.key === 'Enter') $('#fDesc').focus(); });
  document.addEventListener('toggle', e => {
    const d = e.target; if (!d.dataset || !d.dataset.sec) return;
    S.abertas[d.dataset.sec] = d.open; LS.set('fa_secoes', S.abertas);
    if (d.open && (d.dataset.sec === 'cat' || d.dataset.sec === 'evo')) desenharGraficos(doMes(S.mes).filter(l => l.tipo === 'despesa'));
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.form) fecharForm(); });
  window.addEventListener('online', () => carregar(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && conectado() && Date.now() - (LS.get('fa_cache', {}).em || 0) > 60000) carregar(true); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => S.tab === 'painel' && render());
  // gesto: arrastar o painel para os lados troca o mês
  let x0 = null, y0 = null;
  $('#tab-painel').addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  $('#tab-painel').addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 80 && Math.abs(dy) < 50 && !e.target.closest('canvas')) { S.mes = addMes(S.mes, dx < 0 ? 1 : -1); render(); }
  });
}

/* ============================== demo ============================== */
function gerarDemo() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const entre = (a, b) => Math.round((a + rnd() * (b - a)) * 100) / 100;
  const hoje = new Date();
  const ls = [];
  const add = (d, descricao, valor, categoria, conta, quem, tipo = 'despesa', extra = {}) =>
    ls.push(Object.assign({ id: novoId() + ls.length, data: ymd(d), descricao, valor, tipo, categoria, conta, quem, origem: rnd() > .4 ? 'pluggy' : 'manual' }, extra));
  for (let k = 5; k >= 0; k--) {
    const base = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1);
    const ult = k === 0 ? hoje.getDate() : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const dia = n => new Date(base.getFullYear(), base.getMonth(), Math.min(n, ult));
    const ok = n => n <= ult;
    if (ok(5)) { add(dia(5), 'Salário', 6800, 'Salário', 'Itaú', 'Jacson', 'receita'); add(dia(5), 'Salário', 4900, 'Salário', 'Nubank Ana', 'Ana', 'receita'); }
    if (ok(10)) add(dia(10), 'Pró-labore NatuBrava', 2500, 'Pró-labore', 'Itaú', 'Jacson', 'receita');
    if (ok(8)) add(dia(8), 'Aluguel apartamento', 2350, 'Casa', 'Itaú', 'Jacson');
    if (ok(12)) add(dia(12), 'Celesc energia', entre(190, 290), 'Contas', 'Itaú', 'Jacson');
    if (ok(15)) add(dia(15), 'Internet Vivo Fibra', 119.9, 'Contas', 'Cartão Nubank', 'Jacson');
    if (ok(18)) add(dia(18), 'Semasa água', entre(70, 110), 'Contas', 'Itaú', 'Ana');
    if (ok(3)) { add(dia(3), 'Netflix', 55.9, 'Assinaturas', 'Cartão Nubank', 'Jacson'); add(dia(3), 'Spotify Família', 34.9, 'Assinaturas', 'Cartão Inter Ana', 'Ana'); }
    if (ok(6)) add(dia(6), 'Academia Smart Fit', 2 * 119.9, 'Saúde', 'Cartão Nubank', 'Jacson');
    const mercados = ['Supermercado Bistek', 'Angeloni Praia Brava', 'Fort Atacadista', 'Hortifruti da Brava', 'Padaria Pão & Cia'];
    for (let i = 0; i < 10; i++) { const d = 1 + Math.floor(rnd() * 28); if (!ok(d)) continue; const m = mercados[Math.floor(rnd() * mercados.length)]; add(dia(d), m, m.includes('Padaria') ? entre(18, 45) : m.includes('Fort') ? entre(280, 520) : entre(60, 260), 'Mercado', rnd() > .5 ? 'Cartão Nubank' : 'Cartão Inter Ana', rnd() > .5 ? 'Jacson' : 'Ana'); }
    const comida = [['iFood', 35, 95], ['Restaurante Brava Beach', 90, 210], ['Café Cultura', 18, 48], ['Burger King', 40, 80]];
    for (let i = 0; i < 9; i++) { const d = 1 + Math.floor(rnd() * 28); if (!ok(d)) continue; const c = comida[Math.floor(rnd() * comida.length)]; add(dia(d), c[0], entre(c[1], c[2]), 'Alimentação', rnd() > .5 ? 'Cartão Nubank' : 'Cartão Inter Ana', rnd() > .5 ? 'Jacson' : 'Ana'); }
    for (let i = 0; i < 4; i++) { const d = 2 + i * 7; if (!ok(d)) continue; add(dia(d), rnd() > .5 ? 'Posto Shell' : 'Posto Ipiranga', entre(170, 260), 'Transporte', 'Cartão Nubank', 'Jacson'); }
    for (let i = 0; i < 3; i++) { const d = 1 + Math.floor(rnd() * 28); if (ok(d)) add(dia(d), 'Uber', entre(14, 42), 'Transporte', 'Cartão Inter Ana', 'Ana'); }
    for (let i = 0; i < 2; i++) { const d = 1 + Math.floor(rnd() * 28); if (ok(d)) add(dia(d), 'Farmácia Panvel', entre(25, 140), 'Saúde', 'Cartão Inter Ana', 'Ana'); }
    if (ok(20)) add(dia(20), rnd() > .5 ? 'Renner' : 'Shopee', entre(80, 340), 'Compras', 'Cartão Inter Ana', 'Ana', 'despesa', rnd() > .5 ? { parcela: (6 - k) + '/6' } : {});
    if (ok(22)) add(dia(22), 'Cinema Balneário Shopping', entre(60, 110), 'Lazer', 'Cartão Nubank', 'Jacson');
    if (ok(25)) add(dia(25), 'Petz ração', entre(120, 190), 'Pets', 'Cartão Nubank', 'Ana');
    if (ok(14) && rnd() > .5) add(dia(14), 'Salão de beleza', entre(90, 180), 'Beleza', 'Nubank Ana', 'Ana');
    if (ok(28)) add(dia(28), 'Pagamento fatura Nubank', entre(2500, 3500), 'Transferência', 'Itaú', 'Jacson', 'transferencia');
  }
  return {
    lancamentos: ls, categorias: CATS_PADRAO.map(c => Object.assign({}, c)), pessoas: ['Jacson', 'Ana'],
    contas: [
      { nome: 'Cartão Nubank', tipo: 'cartao', cor: '#8a05be', saldo: 2874.35, limite: 12000 },
      { nome: 'Cartão Inter Ana', tipo: 'cartao', cor: '#ff7a00', saldo: 1432.1, limite: 8000 },
      { nome: 'Itaú', tipo: 'banco', cor: '#ec7000', saldo: 5620.42 },
      { nome: 'Nubank Ana', tipo: 'banco', cor: '#8a05be', saldo: 3180.0 }
    ]
  };
}

/* ============================== início ============================== */
aplicarTema();
ligarEventos();
const cache = LS.get('fa_cache', null);
if (conectado() && cache) { S.d = cache.d; render(); }
carregar(true);
atualizarInstalar();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
