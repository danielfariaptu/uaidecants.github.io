let produtos = [];
let carrinho = [];

// Carrega lista do JSON
fetch('produtos.json')
    .then(res => res.json())
    .then(data => {
        produtos = data;
        mostrarProdutos();
    });

function mostrarProdutos() {
    const lista = document.getElementById('lista-produtos');
    lista.innerHTML = '';
    produtos.forEach((produto, index) => {
        let volumes = Object.keys(produto.precos)
            .map(v => `<option value="${v}">${v} - R$ ${produto.precos[v].toFixed(2)}</option>`)
            .join('');

        lista.innerHTML += `
            <div style="border:1px solid #ccc;margin:10px;padding:10px;">
                <h3>${produto.nome}</h3>
                <label>Volume:
                    <select id="volume-${index}">
                        ${volumes}
                    </select>
                </label>
                <button onclick="adicionarAoCarrinho(${index})">Adicionar ao Carrinho</button>
            </div>
        `;
    });
}

function adicionarAoCarrinho(index) {
    const volume = document.getElementById(`volume-${index}`).value;
    const preco = produtos[index].precos[volume];

    let itemExistente = carrinho.find(item => item.nome === produtos[index].nome && item.volume === volume);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            nome: produtos[index].nome,
            volume: volume,
            preco: preco,
            quantidade: 1
        });
    }

    atualizarCarrinho();
}

function atualizarCarrinho() {
    const listaCarrinho = document.getElementById('itensCarrinho');
    listaCarrinho.innerHTML = '';
    let total = 0;

    carrinho.forEach((item, i) => {
        total += item.preco * item.quantidade;
        listaCarrinho.innerHTML += `
            <li>
                ${item.nome} (${item.volume}) - R$ ${item.preco.toFixed(2)} x ${item.quantidade}
                <button onclick="removerItem(${i})">❌</button>
            </li>
        `;
    });

    document.getElementById('totalCarrinho').innerText = total.toFixed(2);
}

function removerItem(i) {
    carrinho.splice(i, 1);
    atualizarCarrinho();
}

// Abrir/fechar carrinho
document.getElementById('abrirCarrinho').addEventListener('click', () => {
    const carrinhoDiv = document.getElementById('carrinho');
    carrinhoDiv.style.display = carrinhoDiv.style.display === 'none' ? 'block' : 'none';
});

// Fechar pedido
document.getElementById('fecharPedido').addEventListener('click', () => {
    let resumo = carrinho.map(item => `${item.nome} (${item.volume}) x${item.quantidade}`).join('\n');
    let total = document.getElementById('totalCarrinho').innerText;
    alert(`Resumo do Pedido:\n${resumo}\n\nTotal: R$ ${total}`);
});