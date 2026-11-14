# Finanças Acker: estado do projeto (leia primeiro)

> Documento para qualquer IA ou pessoa que for mexer no projeto. Atualizado em **14/11/2026**.
> Dono: Jacson (não é programador, quer tudo pronto e custo zero). Usuários: Jacson e Ana (casal).
> **Nunca grave aqui** token, chave do Gemini ou credenciais do Pluggy. Eles ficam só nas Propriedades do script.

## 1. O que é
Controle financeiro do casal, no estilo Mobills, com o mínimo de digitação. Os lançamentos chegam por 4 caminhos:
1. **Pluggy** (bancos e cartões), puxado sozinho pelo Apps Script a cada 8h.
2. **Foto** no app (cupom, nota, comprovante), lida pelo Gemini.
3. **Bot Grok** pessoal de cada um, que faz POST na API (`bot/INSTRUCOES_BOT.md`).
4. **Manual** no app.

## 2. Onde está cada coisa
| Item | Onde |
|---|---|
| Pasta do projeto no PC | `C:\Users\User\Meu Drive\ANTIGRAVITY\Controle Financeiro Acker` |
| Planilha (banco de dados) | "Finanças Acker": https://docs.google.com/spreadsheets/d/1GZ-PFMY2LCF40LgvhFDGuzEjgrPDwiv9lBHOzVaGQlk/edit |
| Script (backend) | "Finanças Acker API", vinculado à planilha. Código em `backend/Code.gs`. Configurações: https://script.google.com/home/projects/1d6eElR-sYnexSMlrlWawzdhNnK2tTtxMNGgXS7_1cqk1pqyojnZNWQbV/settings |
| URL da API (App da Web, implantação "v1 app financas") | `https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec` |
| App (PWA) | https://moneyacker.vercel.app/financas/ |
| Código do app | Repo GitHub `Ackerss/moneyacker`, pasta `financas/`. O Vercel publica sozinho a cada push na `main`. Cópia local em `app/` |
| Endereço principal | https://moneyacker.vercel.app/ redireciona para `/financas/`. O app antigo (Supabase + MacroDroid) foi arquivado em `antigo/` no repo em 14/11/2026, e a pasta MONEYACKER do PC foi esvaziada a pedido do Jacson. |

## 3. O que já está funcionando (testado em 14/11/2026)
- ✅ Planilha criada com as abas e 23 categorias padrão.
- ✅ Script autorizado e publicado. Ping responde, token errado é bloqueado.
- ✅ App no ar e conectado no Chrome do PC do Jacson (token salvo). Salvar, ler e excluir lançamento pelo app funcionam.
- ✅ Instalação no celular: ícone próprio (carteira branca com moeda verde em fundo roxo; arquivos `icon*.png`, `icon-maskable-*.png`, `apple-touch-icon.png`, `icon.svg`), aviso "Instalar" no painel do celular e cartão "Instalar no celular" em Ajustes (botão direto no Android, passo a passo no iPhone).
- ✅ Gemini configurado (chave nas Propriedades) e testado com `gemini-3.1-flash-lite`: categorizou corretamente no "Testar Gemini".

## 4. O que falta (com o Jacson)
- ⏳ **Pluggy:** colar Client ID, Client Secret e Item IDs pelo menu 💰 Financeiro → Definir credenciais Pluggy (3º campo no formato `item1=Jacson, item2=Ana`), depois "Sincronizar bancos agora" e "Ativar sincronização automática".
- ⏳ **Celulares:** colar o token no app (Ajustes) no celular do Jacson e no da Ana, e instalar na tela inicial.
- ⏳ **Bots Grok:** mandar o texto de `bot/INSTRUCOES_BOT.md` com o token para o bot de cada um.
- Sugestão depois do primeiro sync do Pluggy: conferir se pagamentos de fatura viraram "transferencia" e se as categorias ficaram boas.

## 4b. Segurança (verificado em 14/11/2026)
- Planilha: privada, só o Jacson tem acesso no Google Drive.
- API: sem o token responde "Token inválido" (testado com GET e POST). O endereço da API sozinho não abre nada.
- App: sem token mostra só **dados de exemplo** (gerados no próprio app, não são reais).
- GitHub `Ackerss/moneyacker`: público, mas só tem código. Nenhum token, chave ou dado real.
- Quem tem o token: os aparelhos do Jacson e da Ana (salvo no navegador) e os bots Grok. Se vazar, gerar um novo `APP_TOKEN` e colar de novo nos aparelhos e bots.

## 4c. Contas e categorias cadastradas
- Contas: **Santander Elite** (padrão do app, cartão do Jacson, usado online pelos dois), **Nubank Gold** (Jacson), **Itaú Ana**, **Dinheiro / Pix**. Quando o Pluggy for ligado, ele pode criar contas com os nomes do banco; juntar com estas se duplicar.
- Categoria extra: **Filha** (despesa).

## 5. Como o backend funciona
**Abas da planilha**
- `Lancamentos`: id, data, descricao, valor, tipo (despesa/receita/transferencia), categoria, conta, quem, origem (manual/foto/bot/pluggy), id_externo, parcela, obs, itens (JSON), criado_em, atualizado_em, excluido (exclusão é lógica, TRUE).
- `Categorias`: nome, tipo, icone, cor, orcamento.
- `Contas`: nome, tipo, cor, id_externo, saldo, limite, atualizado.
- `Regras`: contem → categoria (aprende sozinho quando alguém muda a categoria de um lançamento).
- `Log`: registro de erros e sincronizações.

**Propriedades do script** (Configurações do projeto → Propriedades do script): `APP_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `PESSOAS` (Jacson,Ana) e, depois do Pluggy, `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEMS`.

**API** (toda chamada leva `token`; POST com `Content-Type: text/plain` para evitar CORS)
- GET: `ping`, `dados`, `resumo`.
- POST `action`: `salvar` (app), `lancar` (bots, ignora duplicado por `id_externo`), `excluir`, `lerFoto` (Gemini), `orcamentos`, `syncPluggy`, `resumo`, `dados`.

**Categorização:** regras aprendidas → nome exato da categoria → Gemini → "Outros".

**Pluggy:** ignora transações PENDING, pagamento de fatura vira `transferencia`, parcelas ficam em `parcela`, `id_externo = pluggy:<id>`.

## 6. Como atualizar
- **Script:** colar o novo `Code.gs` no editor → Salvar → Implantar → Gerenciar implantações → ✏️ → Versão: **Nova versão** → Implantar. A URL não muda. Sem a "Nova versão", o app continua usando o código antigo.
- **Trocar o modelo do Gemini:** só mudar a propriedade `GEMINI_MODEL` nas Configurações do projeto e rodar 💰 Financeiro → Testar Gemini. Não precisa de nova versão.
- **App:** editar os arquivos em `financas/` do repo e dar push na `main` (o Vercel publica em ~1 min). Ao mudar arquivos do app, suba a versão do cache em `sw.js`.
- Regras de arquitetura: a planilha continua sendo a fonte dos dados. O app continua HTML/CSS/JS puro, sem build.

## 7. Modelo de IA (Gemini): decisão de 14/11/2026
**Em uso: `gemini-3.1-flash-lite`** (estável). Serve para ler a foto do cupom e categorizar o que as regras não reconhecem. Não depende de nenhum apelido "latest".

Por quê: é o modelo estável mais barato com preço confirmado na página oficial, tem nível gratuito, e ler cupom e escolher categoria é tarefa simples de extração, que não precisa de modelo de raciocínio pesado. O uso do casal (poucas fotos por dia) deve custar centavos por mês, ou nada dentro do nível gratuito.

Preços oficiais em 14/11/2026 (USD por 1 milhão de tokens, nível pago padrão):

| Modelo | Situação | Entrada (texto/imagem) | Saída | Gratuito? |
|---|---|---|---|---|
| **gemini-3.1-flash-lite** ✅ em uso | Estável | **$0.25** | **$1.50** | Sim |
| gemini-3.5-flash-lite | Estável (jul/2026), feito para leitura de documentos | não publicado | não publicado | não informado |
| gemini-3-flash-preview | Preview | $0.50 | $3.00 | Sim |
| gemini-3.8-flash (usado antes) | Estável | não publicado | não publicado | não informado |
| gemini-3.5-flash | não informado | $1.50 | $9.00 | Sim |
| Gemini 4 Hydrogen (`gemini-4-hydrogen`, lançado 12/11) | Novo | $1.50 | $7.50 | não informado |
| Gemini 4 Argon (`gemini-4-argon`) | Estável | $2.00 (promocional) | $10.00 | Só pago |
| Gemini 4 Carbon (`gemini-4-carbon`, lançado 10/11) | Novo, topo de linha | $2.00 até 30/11, depois $4.00 | $10.00, depois $20.00 | Só pago |
| gemini-2.5-flash-lite | Só para quem já usava | $0.10 | $0.40 | Sim |

Os modelos Gemini 4 (Hydrogen, Argon, Carbon) são de raciocínio, 6 a 16 vezes mais caros e exagerados para cupom. Não existe "Gemini 4 Lite" até esta data.

**Plano B:** se alguma foto vier mal lida, trocar `GEMINI_MODEL` para `gemini-3.5-flash-lite` (mais novo e feito para documentos) e testar. Se ainda falhar, voltar para `gemini-3.8-flash`, que já foi testado e funcionou.

**Revisar a cada 2 ou 3 meses:** abrir https://ai.google.dev/gemini-api/docs/pricing e https://ai.google.dev/gemini-api/docs/models e ver se saiu um "Flash-Lite" estável mais novo com preço igual ou menor. Se sair, trocar a propriedade `GEMINI_MODEL`, testar e atualizar esta tabela.

Fontes: ai.google.dev/gemini-api/docs/pricing, ai.google.dev/gemini-api/docs/models, ai.google.dev/gemini-api/docs/models/gemini-3.8-flash, aistudio.google.com/docs/models/gemini-3.5-flash-lite, blog.google (posts de lançamento do Gemini 4 Hydrogen e do Gemini 4 Carbon).

## 8. Arquivos desta pasta
- `LEIA_PRIMEIRO_IA.md`: este documento.
- `PLANO.md`: o plano e por que Google Sheets foi escolhido.
- `COMO_INSTALAR.md`: passo a passo para o Jacson.
- `backend/Code.gs`: código do script.
- `app/` (na pasta do PC) ou a própria pasta `financas/` (no repo): código do app.
- `bot/INSTRUCOES_BOT.md`: texto para os bots Grok.
- `previa/`: capturas de tela do app.

## 9. Histórico
- **14/11/2026:** projeto criado. Planilha, script, app no Vercel e Gemini funcionando. Modelo trocado de `gemini-3.8-flash` para `gemini-3.1-flash-lite` depois de comparar os lançamentos da semana. Pendentes: Pluggy, celulares e bots.
- **14/11/2026 (manhã):** endereço principal abre o app novo; app antigo arquivado em `antigo/`; contas reais (Santander Elite padrão, Nubank Gold, Itaú Ana) e categoria Filha.
- **14/11/2026 (noite):** ícone novo do app e opção de instalar no celular (app v1.1.0, cache `financas-acker-v3`).
