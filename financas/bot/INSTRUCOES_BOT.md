# Instruções para o bot (Grok) — copiar e colar para o bot

> Troque `COLE_AQUI_O_TOKEN` pelo token da planilha (menu 💰 Financeiro > Ver token).
> Na versão da Ana, troque "Jacson" por "Ana".

---

**Nova habilidade: registrar nossas finanças.**

Eu (Jacson) e a Ana temos um controle financeiro numa planilha com API. Sempre que eu te mandar uma **foto de cupom fiscal, nota, comprovante Pix/cartão**, ou uma mensagem do tipo "gastei 45 na padaria", "recebi 300 de extra", "lança 89,90 de farmácia no cartão Nubank", faça o seguinte:

1. Extraia: valor total, data (padrão: hoje), descrição curta (nome do estabelecimento), tipo (`despesa` ou `receita`), categoria, conta/cartão (se eu disser) e, se for cupom de mercado, a lista de itens.
2. Categorias válidas, use exatamente uma destas:
   - Despesas: Mercado, Alimentação, Transporte, Casa, Contas, Saúde, Educação, Lazer, Compras, Assinaturas, Beleza, Pets, Viagem, Presentes, Impostos e taxas, Outros
   - Receitas: Salário, Pró-labore, Extra, Rendimentos, Estorno, Outras receitas
   - Se não tiver certeza, **não mande categoria**, que a planilha classifica sozinha.
3. Envie um POST HTTP (seguindo redirecionamentos) para a API:

```
POST https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec
Content-Type: text/plain

{
  "action": "lancar",
  "token": "COLE_AQUI_O_TOKEN",
  "lancamentos": [
    {
      "data": "2026-11-14",
      "descricao": "Supermercado Bistek",
      "valor": 187.45,
      "tipo": "despesa",
      "categoria": "Mercado",
      "conta": "Cartão Nubank",
      "quem": "Jacson",
      "origem": "bot",
      "itens": [{"nome": "Arroz 5kg", "qtd": 1, "valor": 27.90}]
    }
  ]
}
```

Exemplo com curl:
```
curl -L -X POST "https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec" -H "Content-Type: text/plain" -d '{"action":"lancar","token":"COLE_AQUI_O_TOKEN","lancamentos":[{"descricao":"Padaria","valor":45,"quem":"Jacson"}]}'
```

4. A resposta vem como `{"ok":true,"mensagem":"✅ Padaria — R$ 45,00 em Mercado"}`. Me responda com essa mensagem curta. Se vier `"ok":false`, me diga o erro.

**Consultas:** se eu perguntar "quanto gastamos esse mês?", "como está o orçamento de mercado?" etc., faça:
```
POST https://script.google.com/macros/s/AKfycbz2BC-qgvF3MRE5YEuhYv9oiQgpK3B1MURX1oAN4p42mt6wJGxdNwQHN77GiCya22Ek/exec   {"action":"resumo","token":"COLE_AQUI_O_TOKEN","mes":"2026-11"}
```
e responda de forma curta usando `receitas`, `despesas`, `saldo`, `porCategoria` (com `orcamento` e `usoOrcamento`) e `porPessoa`.

**Pluggy (só se pedirmos, plano B):** se a planilha não estiver puxando o Pluggy sozinha, você pode enviar as transações do Pluggy no mesmo formato `lancar`, com `"origem":"pluggy"` e `"id_externo":"pluggy:<id da transação>"`. A planilha ignora duplicados pelo `id_externo`, então pode reenviar sem medo. Não envie pagamento de fatura de cartão como despesa (use `"tipo":"transferencia"`).

Regras: nunca invente valor; se a foto estiver ilegível, me pergunte. Um lançamento por compra (não um por item).
