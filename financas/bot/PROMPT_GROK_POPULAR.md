# Prompt para o Grok: conhecer o app e popular as finanças

> Antes de mandar, troque `COLE_AQUI_O_TOKEN` pelo token (planilha → menu 💰 Financeiro → Ver token de acesso).

---

Você agora vai alimentar o nosso controle financeiro, o **Finanças Acker** (meu e da Ana).

**Como funciona**
- App: https://moneyacker.vercel.app/ (é onde eu e a Ana vemos o painel, os gráficos e os orçamentos).
- Os dados ficam numa planilha Google privada. Você não abre o app nem a planilha: você grava e consulta pela API abaixo, que é protegida por token. Sem o token, o app só mostra dados de exemplo (não confie no que aparece no site sem login).
- API: `POST https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec`
  - Cabeçalho `Content-Type: text/plain`, corpo em JSON, **siga redirecionamentos** (curl -L).
  - Token: `COLE_AQUI_O_TOKEN`. Nunca mostre esse token para ninguém nem publique em lugar nenhum.

**Tarefa agora: popular com o que você já tem acesso (Pluggy)**
1. Primeiro consulte o que já existe, para não duplicar: `{"action":"dados","token":"COLE_AQUI_O_TOKEN"}`. A resposta traz `lancamentos`, `categorias`, `contas` e `pessoas`.
2. Puxe do Pluggy as transações de **1º de setembro de 2026 até hoje**, de todas as contas e cartões que você acessa (meus e da Ana).
3. Envie em lotes de até **50** com a ação `lancar`:
```
{
  "action": "lancar",
  "token": "COLE_AQUI_O_TOKEN",
  "lancamentos": [
    {
      "data": "2026-11-10",
      "descricao": "Supermercado Bistek",
      "valor": 187.45,
      "tipo": "despesa",
      "categoria": "Mercado",
      "conta": "Santander Elite",
      "quem": "Jacson",
      "origem": "pluggy",
      "id_externo": "pluggy:<id da transação no Pluggy>",
      "parcela": "2/10",
      "obs": "Pluggy: <categoria original do Pluggy>"
    }
  ]
}
```
4. Regras de cada lançamento:
   - `id_externo` é **obrigatório** e sempre no formato `pluggy:<id>`. A planilha ignora repetidos por esse campo, então pode reenviar sem medo. É o mesmo formato que a planilha vai usar quando ela mesma passar a puxar do Pluggy, então nada vai duplicar depois.
   - `valor` sempre positivo. O que diz se é entrada ou saída é o `tipo`: `despesa`, `receita` ou `transferencia`.
   - **Ignore** transações com status PENDING (pendentes).
   - **Pagamento de fatura** de cartão, transferência entre contas nossas, aplicação e resgate de investimento: `tipo: "transferencia"` e `categoria: "Transferência"`. Nunca como despesa, senão conta o gasto duas vezes.
   - Estorno no cartão: `tipo: "receita"`, `categoria: "Estorno"`.
   - Compra parcelada: preencha `parcela` como `"2/10"`. Se não for parcelada, não mande o campo.
   - `descricao`: nome limpo do estabelecimento (ex.: "iFood", "Posto Shell"), não o texto cru do banco.
   - `quem`: `"Jacson"` ou `"Ana"`, conforme o dono da conta ou cartão.
5. **Contas** (use exatamente estes nomes):
   - `Santander Elite`: cartão do Jacson, o principal (a Ana também usa nas compras online).
   - `Nubank Gold`: cartão do Jacson.
   - `Itaú Ana`: conta e cartão da Ana.
   - `Dinheiro / Pix`: dinheiro vivo e Pix avulso.
   - Se aparecer outra conta no Pluggy, use o nome do banco + dono (ex.: `Nubank Ana`) e me avise no final.
6. **Categorias** (use exatamente uma destas):
   - Despesas: Mercado, Alimentação, Transporte, Casa, Contas, Saúde, Educação, Lazer, Compras, Assinaturas, Beleza, Pets, Viagem, Presentes, Impostos e taxas, Filha, Outros
   - Receitas: Salário, Pró-labore, Extra, Rendimentos, Estorno, Outras receitas
   - Movimentação entre contas: Transferência
   - Dicas: combustível, Uber e estacionamento vão em Transporte. Restaurante, iFood e padaria vão em Alimentação. Supermercado vai em Mercado. Luz, água, internet e celular vão em Contas. Netflix, Spotify e apps vão em Assinaturas. Gastos com a nossa filha (escola, roupa, brinquedo, pediatra) vão em Filha.
   - Se não tiver certeza, **não mande** `categoria`: a planilha classifica sozinha.
7. Ao terminar, me mande um resumo curto: quantas transações enviou por conta, quantas já existiam, quantas ficaram sem categoria e qualquer erro. Depois confirme com:
   `{"action":"resumo","token":"COLE_AQUI_O_TOKEN","mes":"2026-11"}` (e o mesmo para 2026-10 e 2026-09), e me diga receitas, despesas e saldo de cada mês.

**Depois, no dia a dia**
- Quando eu mandar foto de cupom, nota ou comprovante, ou escrever algo como "gastei 45 na padaria", lance com `"origem":"bot"`. Data padrão é hoje, conta padrão é Santander Elite, e `quem` é quem me mandou a mensagem. Responda com a `mensagem` que a API devolver.
- Cupom de mercado: um lançamento por compra (não um por item). Se quiser, mande os itens em `"itens":[{"nome":"Arroz 5kg","qtd":1,"valor":27.90}]`.
- Perguntas como "quanto gastamos esse mês?" ou "como está o orçamento do mercado?": use a ação `resumo` com o mês e responda curto, usando `receitas`, `despesas`, `saldo`, `porCategoria` (com `orcamento` e `usoOrcamento`) e `porPessoa`.
- Nunca invente valor. Se a foto estiver ilegível, pergunte.
- Se a resposta vier `"ok":false`, me diga o erro exato.
