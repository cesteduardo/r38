# R38tao · Páginas do Renato Trezoitão

Três páginas no mesmo sistema visual, sem build e sem dependências. Basta subir a pasta
numa hospedagem com PHP (o PHP só é preciso para a metade servidor do rastreio).

```
index.html        página de links (no lugar do linktr.ee/38.honra)
style.css         sistema visual compartilhado pelas três páginas
script.js         cotação BTC, copiar, modais, animação e rastreio
tracking.js       Meta Pixel + envio ao servidor
capi.php          recebe o evento e repassa à Meta
capi-config.php   pixel e access token: só no servidor
.htaccess         bloqueia o capi-config.php na web, cache e compressão
assets/           foto do Renato e favicon (fundo preto, "38" laranja)

eventos/          próximos encontros (no lugar do linktr.ee/meetups.38)
  eventos.css / eventos.js
  bandeiras/      flag-icons (MIT): PY, PT, US, UY, BR
  favicon.svg     o mesmo do site com uma faixa laranja no topo (calendário)

curso/            refeito de renato38.com.br
  curso.css / curso.js
  assets/         foto do hero (recortada, sem o letreiro) e banner da Missão Bitcoin
```

## Sistema visual

- **Cores:** grafite `#17171B`, cartões `#222228`, texto branco, apoio `#D0D0D6`, laranja
  Bitcoin `#F7931A` como único acento. Escolhido para leitura fácil.
- **Fonte:** só Inter.
- **Fundo:** brilho laranja que deriva devagar e grade quadriculada (`.bg`).
- **Contornos e vidro:** 1.1px em `--line`, receita do site da GR Brands.
- **Ícones:** Phosphor Icons (MIT), peso regular, embutidos no HTML sem CDN.
- **Animação:** cada bloco é uma `.cena`; cada peça dentro dela, um `.a`. Quando a cena
  aparece na tela, as peças sobem em cascata. Sem JS ou com "reduzir movimento", tudo nasce
  visível. Também há o anel girando na foto, o brilho no card do e-book e as respostas de
  hover e toque.

Regra da casa, depois da revisão de 01/10/2026: **menos é mais.** Uma linha por link
(ícone, nome, seta). Nada de numeração, contadores ou subtítulos em toda linha.

## Página de links (`index.html`)

- **Mobile:** perfil centralizado (foto, nome, @, bio, redes, cotação BTC, e-book em
  laranja), depois Aprenda, Eventos, Comunidade e Comprar e sacar.
- **Desktop:** **uma tela só, sem rolagem.** Perfil à esquerda, links em duas colunas à
  direita, rodapé numa linha.

Copiar com um toque: o ícone do Nostr copia a npub, e a etiqueta `38tao · 15%` copia o
cupom da Stackbit. "Próximos encontros" abre `eventos/`.

## Eventos (`eventos/`)

- **Galeria infinita de países**, começando pelo Paraguai: cada país é um **ingresso**
  (cabeça com a bandeira, picote com recortes laterais, corpo com as cidades, canhoto com
  código). Anda sozinha, pausa no mouse e no toque, aceita arrastar e tem botões ← → no
  canto superior direito.
- **Brasil:** 28 cidades numa lista, com filtro por região e busca (sem acento).
- **Calendário em pop-up** (botão no topo, à direita no desktop). Mostra o mês, os dias com
  encontro e a lista do mês. As datas ficam na lista `AGENDA`, na seção 4b do `eventos.js`:

  ```js
  { data: '2026-11-21', cidade: 'São Paulo', pais: 'Brasil', local: 'Nome do lugar', link: 'https://t.me/...' }
  ```

  **Hoje está vazia: o Linktree não informa data de nenhum encontro.** Cidade sem data
  aparece em "Datas a confirmar".

Para acrescentar uma cidade do Brasil, copie uma `<a class="item">` da lista e troque UF,
nome, `data-regiao`, `data-busca` (minúsculo, sem acento) e o link.

Atenção: o Linktree tem **duas entradas de Vitória e Vila Velha/ES** com links diferentes.
As duas foram mantidas; a segunda aparece como "(2)". Confirme com o cliente.

## Curso (`curso/`)

Refeito de `renato38.com.br`. Direção: **"a Apple do segmento"**, com muito respiro,
tipografia grande e cursos apresentados como produto, sobre a linguagem do portfólio da Bruna.

**A copy é a original do site.** Só a ordem e a disposição mudaram, e as quatro frases
que tinham travessão foram reescritas sem ele (regra da casa: sem travessões). As únicas
frases novas são as respostas da verificação de número e a confirmação do formulário.

- **Header na receita da GR Brands:** barra da largura da tela no topo; ao rolar, vira
  pílula flutuante com contorno e sombra. O link da seção atual ganha o fio laranja. No
  mobile, o hambúrguer abre um menu numerado em tela cheia.
- **Hero** centrado com o Renato recortado e um halo laranja que respira.
- **Fita de fotos** dos eventos, em loop.
- **Treinamentos em vitrine com seletor:** no desktop, a lista dos 4 à esquerda (número
  em Jersey 10, nome e preço) e o painel do curso escolhido à direita; troca no clique, no
  mouse e pelas setas do teclado. No celular, a lista vira abas deslizáveis. Abre no
  Multisig (pré-venda); para mudar, troque `INICIAL` no gerador ou o `aria-selected` no HTML.
  Sem JS, os quatro painéis aparecem em sequência.
- **R38 do rodapé** em fonte pixel, com máquina de escrever: abre em "Renato 38tão" e
  fecha de volta em "R38", com a barra laranja piscando no fim. Só roda com o rodapé na tela.
- **Mentoria** com foto (original de 946×808), **banner da Missão Bitcoin**, **e-book** no
  bloco laranja, **manifesto** com as palavras acendendo na rolagem, **verificação de
  número** e **FAQ**.

Fotos em `curso/assets/` e `curso/assets/fotos/`, todas de `missaobitcoin.com.br`.

O carrinho e o checkout continuam no site atual:

| Curso | Botão leva a |
|---|---|
| Multisig na Prática | `renato38.com.br/curso/multisig-na-pratica/` |
| Operando Derivativos | `renato38.com.br/curso/derivativos/` |
| Autocustódia e Lex BTC | `renato38.com.br/#products` (não têm página própria) |
| Mentoria | `renato38.com.br/mentoria/` |

Pendências do curso, nas seções 2 e 3 do `curso.js`:

- `ENVIO_EBOOK`: endereço que recebe o cadastro do e-book. **Vazio, o formulário valida e
  confirma, mas não envia nada.**
- `OFICIAIS`: números oficiais da equipe. **Vazio, todo número dá "não é oficial".**

## Rastreio · Meta Pixel + API de Conversões

**Ainda sem pixel.** Com `pixel: ''`, o `tracking.js` nem é carregado. Para ligar, preencha
o ID no `window.LN_TRACK` das três páginas e acrescente `'ID' => 'ACCESS_TOKEN'` em
`pixels` no `capi-config.php`.

| Momento | Evento |
|---|---|
| Carregamento | `PageView` |
| E-book, Treinamento, Missão Bitcoin, grupo de cidade, cadastro do e-book | `Lead` |
| Clique em curso ou mentoria (página do curso) | `InitiateCheckout` |
| Demais links | `ViewContent` |

Teste: `?capi_test=CODIGO` com o código também em `url_test_codes`. Esvazie ao terminar.

## Política de Privacidade e Termos de Uso

Abrem em modal nas três páginas. Os Termos avisam que **não é recomendação de
investimento** e que há **links de afiliado**. Placeholders a preencher (destacados nos
modais; `grep -n marcador index.html */index.html`):

`[INSERIR DATA]` · `[RAZÃO SOCIAL]` · `[CNPJ]` · `[ENDEREÇO COMPLETO]` ·
`[PROVEDOR DE HOSPEDAGEM]` · `[E-MAIL DE CONTATO]` · `[NOME DO ENCARREGADO / "não designado"]` ·
`[CIDADE/UF]`

Com o formulário do e-book no curso, a Política precisa ganhar um item sobre nome, e-mail
e WhatsApp coletados ali.

## Rodapé

Privacidade e Termos (pílulas), aviso de investimento e **Desenvolvido por GR Brands.**,
que leva a `https://grbrands.com.br`.
