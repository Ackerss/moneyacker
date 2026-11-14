# Finanças Acker — Plano decidido

**Para:** Jacson e Ana · **Data:** 14/11/2026 · **Custo mensal:** R$ 0 (Gemini sai dos créditos Google, centavos por mês)

## A decisão em uma frase

Os dados ficam numa **Planilha Google** (que vocês conseguem abrir e conferir quando quiserem), um **script dentro da planilha** faz o papel de servidor, e vocês usam um **app de celular próprio** (site instalável, com cara de app) com dashboard no estilo Mobills. Os lançamentos chegam por **4 caminhos**, do mais automático ao manual:

| # | Caminho | Esforço de vocês | Custo |
|---|---------|------------------|-------|
| 1 | **Pluggy → planilha, sozinho, 3× por dia** (cartões e contas) | Zero. Só revisar a categoria se quiser | Grátis |
| 2 | **Foto no próprio app** (cupom, nota, comprovante) → Gemini lê e preenche | Tirar a foto e tocar em Salvar | Centavos (créditos Google) |
| 3 | **Mandar para o bot Grok** (foto ou texto: "gastei 45 na padaria") | Mandar a mensagem | Já incluso no que vocês pagam |
| 4 | **Manual no app** (botão + grande, 3 toques) | Digitar valor e escolher categoria | Grátis |

**Por que isso resolve o que deu errado antes:** no Mobills e no projeto com o Codex, o problema era *ter que preencher tudo*. Agora o grosso (cartão de crédito) entra sozinho pelo Pluggy, já categorizado. Vocês só lançam à mão o que não passa no cartão (dinheiro, Pix avulso), e mesmo isso pode ser só uma foto.

## Por que cada escolha

**Banco de dados: Google Sheets + Apps Script**
- Grátis para sempre, sem servidor para manter e sem "pausar por inatividade" (o Supabase grátis pausa).
- Vocês já usam esse modelo no catálogo da NatuBrava, então não é novidade.
- Dá para abrir a planilha, corrigir ou filtrar à mão, e exportar quando quiser.
- Aguenta tranquilamente dezenas de milhares de lançamentos (10 anos de uso).

**Front-end: app web instalável (PWA) no Vercel**
- Abre como app pela tela inicial do celular (Android e iPhone), e no PC é só abrir o link.
- No celular é uma coluna com seções recolhíveis; no PC vira um painel em duas colunas.
- Modo claro e escuro, funciona offline (o que for lançado sem internet é enviado depois).
- Hospedado grátis no Vercel que você já usava no MoneyAcker: **https://moneyacker.vercel.app/financas/**. Cada atualização no GitHub entra no ar sozinha.

**IA: Gemini (créditos Google) no servidor, não no celular**
- A chave fica escondida dentro da planilha, nunca no app.
- É usado só para ler foto e categorizar o que as regras não reconhecem. Leitura de cupom no Gemini Flash custa frações de centavo. Com os créditos de vocês, isso dura anos.
- **O app aprende:** quando vocês mudam a categoria de "POSTO TIO JOCA" para Transporte, ele cria uma regra e nas próximas vezes nem chama a IA.

**Pluggy direto da planilha (e não pelo bot)**
- O script puxa as transações com as mesmas credenciais Pluggy que o bot usa, sem gastar o limite semanal do Grok e sem depender do bot lembrar.
- Ele evita duplicados (cada transação tem um id único), ignora as pendentes, marca **pagamento de fatura como transferência** (para não contar a compra duas vezes) e pega parcelas ("3/10").
- Também puxa **saldo das contas e fatura atual dos cartões** para o painel.
- Se não der para usar as credenciais direto, o plano B é o bot mandar as transações do Pluggy para o mesmo endereço (já está suportado, com proteção contra duplicados).

## Reavaliação: por que Google Sheets e não outro banco

| Opção | Custo | Velocidade | Manutenção | Ver/corrigir dados à mão | Veredito |
|---|---|---|---|---|---|
| **Google Sheets + Apps Script** | Grátis | 1 a 3 s por chamada (o app esconde isso com cache) | Nenhuma | Sim, é uma planilha | **Escolhido** |
| Supabase (o que o MoneyAcker usava) | Grátis | Rápido, tempo real | O plano grátis **pausa após 7 dias sem uso** e exige reativar à mão | Painel técnico | Foi justamente o que travou antes |
| Firebase | Grátis até certo uso, mas as funções de servidor exigem cartão (plano Blaze) | Rápido, tempo real | Deploy por linha de comando | Painel técnico | Complexo demais para o ganho |
| Planilha só no celular (sem app) | Grátis | — | — | Sim | Feio e cansativo, é o que vocês não querem |

Para 2 pessoas e algumas centenas de lançamentos por mês, a velocidade do Sheets não faz diferença na prática. O que pesa é: **custo zero, nada para manter e dados sempre à vista.**

## O que o painel mostra (seções recolhíveis)

1. **Cartão principal:** saldo do mês, receitas, despesas, projeção de gasto até o fim do mês, % do orçamento usado e comparação com o mês anterior.
2. **Despesas por categoria:** gráfico de rosca e lista com barras. Tocar numa categoria mostra os lançamentos dela.
3. **Orçamentos:** limite por categoria com barra verde, amarela ou vermelha e "resta R$ X".
4. **Contas e cartões:** saldo de cada conta, fatura e limite de cada cartão, e quanto foi gasto no mês em cada um.
5. **Evolução de 6 meses:** receitas x despesas x saldo, mais médias.
6. **Quem gastou:** Jacson x Ana, com as principais categorias de cada um.
7. **Onde mais gastamos:** ranking de estabelecimentos (mercado, posto, iFood…).
8. **Últimos lançamentos**, e uma aba completa com busca, filtros e agrupamento por dia.

Filtro no topo: **Todos / Jacson / Ana**. No celular, arrastar para o lado troca o mês.

## Estrutura da pasta

```
Controle Financeiro Acker/
├── PLANO.md              ← este documento
├── COMO_INSTALAR.md      ← passo a passo (uns 15 minutos, uma vez só)
├── backend/Code.gs       ← script para colar na planilha
├── app/                  ← o app (sobe inteiro no Netlify)
└── bot/INSTRUCOES_BOT.md ← texto para colar no bot Grok de cada um
```

## Próximas melhorias (fase 2, quando quiserem)

- Contas fixas e recorrentes com aviso de vencimento.
- Metas de economia ("viagem", "reserva") com barra de progresso.
- Resumo semanal automático enviado pelo bot ("essa semana vocês gastaram R$ X, Y% acima da média em Alimentação").
- Detalhe do mercado por item (os itens do cupom já são guardados em cada lançamento).
