// Carrega itens do LocalStorage
let carrinho = JSON.parse(localStorage.getItem('nexaCarrinho') || '[]');

function renderizarCarrinho() {
    const listaEl = document.getElementById('cartList');
    const containerEl = document.getElementById('cartContent');
    const emptyEl = document.getElementById('emptyCart');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');

    if (carrinho.length === 0) {
        containerEl.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    containerEl.style.display = 'grid';
    emptyEl.style.display = 'none';
    listaEl.innerHTML = '';

    // Agrupar itens por ID para mostrar quantidade
    const itensAgrupados = {};
    carrinho.forEach(item => {
        if (itensAgrupados[item.id]) {
            itensAgrupados[item.id].qtd++;
        } else {
            itensAgrupados[item.id] = { ...item, qtd: 1 };
        }
    });

    let total = 0;

    // Renderizar itens agrupados
    Object.values(itensAgrupados).forEach(item => {
        // Calcula preço unitário (com ou sem desconto)
        let precoUnitario = Number(item.preco);
        if (item.promoAtiva) {
            precoUnitario = precoUnitario - (precoUnitario * (item.promoPercent / 100));
        }
        
        const subtotalItem = precoUnitario * item.qtd;
        total += subtotalItem;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.imagem || 'https://via.placeholder.com/80'}" class="item-img">
            <div class="item-info">
                <div class="item-title">${item.titulo}</div>
                <div class="item-price">R$ ${precoUnitario.toFixed(2)}</div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; margin-right: 20px;">
                <button onclick="alterarQtd('${item.id}', -1)" style="width: 30px; height: 30px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">-</button>
                <span style="font-weight: bold;">${item.qtd}</span>
                <button onclick="alterarQtd('${item.id}', 1)" style="width: 30px; height: 30px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer;">+</button>
            </div>

            <button class="item-remove" onclick="removerTudo('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
        listaEl.appendChild(div);
    });

    subtotalEl.innerText = `R$ ${total.toFixed(2)}`;
    totalEl.innerText = `R$ ${total.toFixed(2)}`;
}

// Adiciona ou remove uma unidade
window.alterarQtd = (id, delta) => {
    if (delta > 0) {
        // Adicionar: Busca o item original no array (basta pegar o primeiro que achar com esse ID)
        const item = carrinho.find(p => p.id === id);
        if (item) carrinho.push(item);
    } else {
        // Remover: Acha o índice do primeiro item com esse ID e remove
        const index = carrinho.findIndex(p => p.id === id);
        if (index > -1) carrinho.splice(index, 1);
    }
    
    salvarERenderizar();
};

// Remove todas as unidades de um produto
window.removerTudo = (id) => {
    // Filtra o array mantendo apenas os produtos que NÃO têm esse ID
    carrinho = carrinho.filter(p => p.id !== id);
    salvarERenderizar();
};

function salvarERenderizar() {
    localStorage.setItem('nexaCarrinho', JSON.stringify(carrinho));
    renderizarCarrinho();
}

// Finalizar Compra Fake
const btnFinalizar = document.getElementById('btnFinalizar');
if(btnFinalizar) {
    btnFinalizar.addEventListener('click', () => {
        btnFinalizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
        btnFinalizar.disabled = true;

        setTimeout(() => {
            localStorage.removeItem('nexaCarrinho');
            carrinho = []; // Limpa memória local
            document.getElementById('successScreen').style.display = 'flex';
        }, 1500);
    });
}

// Inicializa
renderizarCarrinho();