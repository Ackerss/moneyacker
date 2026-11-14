# Design Spec: Novas Funcionalidades do MoneyAcker

Este documento detalha o design técnico para a implementação das novas funcionalidades solicitadas no **MoneyAcker**: máscara de valor monetário em tempo real, scanner de cupom fiscal usando a câmera com OCR local (Tesseract.js), e gerenciamento de cartões de crédito com suporte a parcelamento de despesas.

---

## 1. Máscara de Valor Monetário em Tempo Real

### Comportamento
Nos inputs de valor (como `trans-amount` no modal de transação e `budget-limit` no modal de orçamento), a máscara formatará o valor dinamicamente conforme a digitação do usuário, sem a necessidade de digitar vírgula ou ponto manualmente.

* Entrada inicial: `0,00`
* Digita `1` -> `0,01`
* Digita `2` -> `0,12`
* Digita `3` -> `1,23`
* Digita `4` -> `12,34`
* Digita `0` -> `123,40`
* Ao apagar (Backspace), o processo se inverte.

### Implementação
* Adicionaremos um event listener de `input` aos campos de valor.
* A lógica removerá todos os caracteres não numéricos, converterá para número inteiro (centavos), dividirá por 100 e formatará como valor decimal padrão com duas casas decimais no formato local (ou mantendo o valor bruto no input e aplicando a máscara visualmente, mas como os inputs atuais são `type="number"`, precisaremos alterá-los para `type="text"` com `inputmode="numeric"` para suportar a máscara de digitação fluida sem bugs nativos de validação do navegador para `type="number"`).

---

## 2. Scanner de Cupom Fiscal (Câmera com OCR Gratuito & Local)

### Tecnologia
* **Tesseract.js**: Biblioteca de OCR open-source que roda diretamente no navegador via Javascript, garantindo privacidade (a imagem não é enviada a servidores externos) e sem custos de API. Carregada via CDN no `index.html`.
* **API de Mídia Nativa**: Uso de `<input type="file" accept="image/*" capture="environment">` para abrir a câmera traseira do celular de forma nativa e limpa, funcionando também como seletor de arquivos no desktop.

### Fluxo da Interface (UI/UX)
1. No modal de **Nova Despesa**, haverá um botão com ícone de câmera e texto "Escanear Cupom".
2. Ao clicar, o navegador abre a câmera para tirar foto ou selecionar imagem.
3. Após capturar a imagem, uma área de loading sutil aparece no modal informando "Processando imagem com OCR...".
4. O Tesseract.js extrai o texto do cupom.
5. Um analisador Regex inteligente processa o texto:
   * **Valor**: Localiza padrões monetários comuns e seleciona o maior valor (geralmente o total) ou o valor associado a palavras-chave como `TOTAL`, `VALOR A PAGAR`, `VALOR RECEBIDO`, `R$`.
   * **Data**: Localiza padrões de data (`dd/mm/aaaa`, `dd-mm-aa`).
   * **Descrição**: Extrai a primeira linha válida do topo do cupom (normalmente o nome fantasia ou razão social do estabelecimento).
6. Os campos do modal são preenchidos automaticamente. Uma notificação toast avisa "Dados extraídos com sucesso! Revise os valores antes de salvar."

---

## 3. Cartões de Crédito & Parcelamento de Despesas

### Extensão do Estado (`state`)
Adicionaremos estruturas adicionais ao estado global do aplicativo:

```javascript
state = {
  ...
  cards: [
    {
      id: "card-1",
      name: "Nubank",
      limit: 5000.00,
      closingDay: 5,   // Dia de fechamento da fatura
      dueDay: 10,      // Dia de vencimento da fatura
      color: "#8a05be" // Cor temática do cartão
    }
  ],
  transactions: [
    {
      id: "trans-...",
      amount: 100.00,
      description: "Supermercado (Parcela 1/3)",
      date: "2026-05-29",
      category: "cat-alimentacao",
      type: "expense",
      paymentMethod: "card-1", // ID do cartão ou "cash" (saldo)
      installmentId: "inst-12345", // Agrupador de parcelas
      installmentNumber: 1,
      totalInstallments: 3
    }
  ]
}
```

### Alterações na UI
* **Aba de Configurações**:
  * Seção "Meus Cartões de Crédito" para listar, cadastrar e excluir cartões (Nome, Limite, Dia de Fechamento e Dia de Vencimento).
* **Modal de Transações (Apenas para Despesas)**:
  * Campo de seleção: **Forma de Pagamento** (opções: "Saldo da Conta" ou cartões cadastrados).
  * Se for selecionado um Cartão de Crédito, exibe uma opção: "Parcelar Compra?".
  * Se selecionado "Sim", exibe o campo "Número de Parcelas" (dropdown de 2x a 12x ou mais).

### Lógica de Parcelamento & Datas de Lançamento
Ao salvar uma compra parcelada de $N$ vezes no dia $D$:
1. O sistema calcula a data da primeira fatura.
   * Se o dia da compra $D$ for **menor ou igual** ao dia de fechamento do cartão, a primeira parcela cai na fatura do mês atual (vencendo no dia de vencimento do mês atual).
   * Se o dia da compra $D$ for **maior** que o dia de fechamento do cartão (fatura fechada), a primeira parcela cai na fatura do mês seguinte.
2. O sistema gera $N$ transações no array `state.transactions`.
   * Cada transação recebe uma data correspondente ao vencimento da sua fatura (para que seja computada no mês de pagamento correto).
   * A descrição é atualizada para incluir a marcação `(1/N)`, `(2/N)`, etc.
   * As transações compartilham um `installmentId` para permitir que o usuário exclua a série completa de parcelas de uma vez se desejar.

---

## 4. Plano de Verificação

### Testes Manuais
1. **Máscara**: Digitar valores nos campos de transações e orçamentos no navegador e certificar-se de que a formatação `X.XX` é gerada corretamente sem erros de NaN.
2. **Scanner**: Fazer upload/tirar foto de um cupom fiscal de teste e verificar a acurácia do OCR e preenchimento dos campos.
3. **Cartão e Parcelas**: Cadastrar um cartão com fechamento dia 5 e vencimento dia 12. 
   * Lançar despesa no dia 3 do mês atual em 3 parcelas e verificar se as datas das transações criadas correspondem ao dia 12 do mês atual, do mês subsequente e do terceiro mês.
   * Lançar despesa no dia 6 do mês atual e verificar se as parcelas pulam para o dia 12 do próximo mês.
