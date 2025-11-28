import { auth, db } from "./auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const closeMenu = document.getElementById("closeMenu");
const overlay = document.getElementById("overlay");

// --- VARIÁVEIS GLOBAIS ---
let todosProdutos = []; // Lista mestre de produtos
let categoriaAtual = "Todas"; // Controle de filtro
const gridProdutos = document.querySelector(".grid-produtos");

// Menu Toggle
if(menuBtn) {
    menuBtn.onclick = () => { sideMenu.classList.add("open"); overlay.classList.add("show"); };
}
if(closeMenu) {
    closeMenu.onclick = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };
}
if(overlay) {
    overlay.onclick = () => { sideMenu.classList.remove("open"); overlay.classList.remove("show"); };
}

// Submenu Categorias
const catBtn = document.getElementById("catBtn");
const catSubMenu = document.getElementById("catSubMenu");
const catIcon = document.getElementById("catIcon");
let catOpen = false;

if(catBtn) {
    catBtn.onclick = () => {
        catOpen = !catOpen;
        if (catOpen) {
            catSubMenu.style.maxHeight = catSubMenu.scrollHeight + "px";
            catIcon.style.transform = "rotate(180deg)";
        } else {
            catSubMenu.style.maxHeight = "0px";
            catIcon.style.transform = "rotate(0deg)";
        }
    };
}

// --- 1. LÓGICA DO CARRINHO ---
function atualizarBadgeCarrinho() {
    const carrinho = JSON.parse(localStorage.getItem('nexaCarrinho') || '[]');
    const qtd = carrinho.length;

    const cartIcon = document.querySelector('.fa-cart-shopping');
    
    if (cartIcon) {
        if (cartIcon.parentElement.tagName !== 'A') {
            const link = document.createElement('a');
            link.href = 'carrinho.html';
            link.style.color = 'inherit';
            link.style.textDecoration = 'none';
            link.style.position = 'relative';
            cartIcon.parentNode.insertBefore(link, cartIcon);
            link.appendChild(cartIcon);
        }

        let badge = cartIcon.parentElement.querySelector('.cart-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            badge.style.cssText = `
                position: absolute; top: -8px; right: -10px;
                background-color: #ff329d; color: white;
                font-size: 10px; font-weight: bold;
                padding: 2px 6px; border-radius: 50%;
                display: none;
            `;
            cartIcon.parentElement.appendChild(badge);
        }

        badge.innerText = qtd;
        badge.style.display = qtd > 0 ? 'inline-block' : 'none';
    }
}

window.adicionarAoCarrinho = (id) => {
    if (!auth.currentUser) {
        alert("Você precisa fazer login para comprar!");
        window.location.href = "login-nexa.html";
        return;
    }

    const produto = todosProdutos.find(p => p.id === id);
    if (!produto) return;

    const carrinho = JSON.parse(localStorage.getItem('nexaCarrinho') || '[]');
    carrinho.push(produto);
    localStorage.setItem('nexaCarrinho', JSON.stringify(carrinho));
    
    atualizarBadgeCarrinho();
    
    const btn = event.target;
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
    btn.style.background = '#27ae60';
    setTimeout(() => {
        btn.innerHTML = textoOriginal;
        btn.style.background = '#0077A3';
    }, 1500);
};

// --- 2. CARREGAR CATEGORIAS DO BANCO ---
async function carregarCategoriasDisplay() {
    const container = document.getElementById("containerCategorias");
    const subMenu = document.getElementById("catSubMenu");
    if(!container) return;

    try {
        const snaps = await getDocs(collection(db, "categoria")); // Sua coleção singular
        container.innerHTML = "";
        if(subMenu) subMenu.innerHTML = "";

        // Botão "Todas"
        const btnTodas = criarBotaoCategoria("Todas", "fas fa-th-large", true);
        container.appendChild(btnTodas);

        snaps.forEach(docSnap => {
            const cat = docSnap.data();
            
            // Adiciona na barra horizontal
            const btn = criarBotaoCategoria(cat.nome, cat.iconeUrl);
            container.appendChild(btn);

            // Adiciona no menu lateral também
            if(subMenu) {
                const link = document.createElement("a");
                link.href = "#";
                link.innerText = cat.nome;
                link.onclick = (e) => {
                    e.preventDefault();
                    filtrarPorCategoria(cat.nome);
                    sideMenu.classList.remove("open"); // Fecha menu ao clicar
                    overlay.classList.remove("show");
                };
                subMenu.appendChild(link);
            }
        });

    } catch (e) {
        console.error("Erro categorias:", e);
        container.innerHTML = "<p>Categorias indisponíveis.</p>";
    }
}

function criarBotaoCategoria(nome, icone, ativo = false) {
    const btn = document.createElement("button");
    btn.className = `cat-btn ${ativo ? 'active' : ''}`;
    
    let iconHTML = '';
    if (icone && icone.includes('fa-')) {
        iconHTML = `<i class="${icone}"></i>`;
    } else if (icone) {
        iconHTML = `<img src="${icone}" style="width:20px; height:20px; object-fit:contain;">`;
    }

    btn.innerHTML = `${iconHTML} ${nome}`;
    btn.onclick = () => filtrarPorCategoria(nome, btn);
    return btn;
}

// --- 3. FILTRAR PRODUTOS ---
window.filtrarPorCategoria = (categoria, btnClicado = null) => {
    categoriaAtual = categoria;
    
    // Atualiza visual dos botões
    if(btnClicado) {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btnClicado.classList.add('active');
    }

    // Atualiza Título
    const tituloEl = document.getElementById("tituloSecaoProdutos");
    if(tituloEl) tituloEl.innerText = categoria === "Todas" ? "Todos os Produtos" : categoria;

    // Filtra a lista
    if (categoria === "Todas") {
        renderizarProdutos(todosProdutos);
    } else {
        const filtrados = todosProdutos.filter(p => p.categoria === categoria);
        renderizarProdutos(filtrados);
    }
};

// --- 4. CARREGAR PRODUTOS ---
async function carregarProdutos() {
    if(!gridProdutos) return;
    gridProdutos.innerHTML = '<p style="text-align:center; width:100%;">Carregando ofertas...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        todosProdutos = []; 

        querySnapshot.forEach((doc) => {
            todosProdutos.push({ id: doc.id, ...doc.data() });
        });

        renderizarProdutos(todosProdutos);
        atualizarBadgeCarrinho(); 

    } catch (error) {
        console.error(error);
        gridProdutos.innerHTML = '<p>Erro ao carregar produtos.</p>';
    }
}

function renderizarProdutos(lista) {
    if(!gridProdutos) return;
    gridProdutos.innerHTML = "";

    if (lista.length === 0) {
        gridProdutos.innerHTML = '<p style="text-align:center; width:100%; color:#777; margin-top:20px;">Nenhum produto encontrado nesta categoria.</p>';
        return;
    }

    lista.forEach(produto => {
        const div = document.createElement("div");
        div.classList.add("produto");
        
        const imgUrl = produto.imagem ? produto.imagem : "https://via.placeholder.com/150?text=Sem+Imagem";
        
        let precoHTML = `<p style="font-weight:bold; font-size:1.1rem;">R$ ${Number(produto.preco).toFixed(2)}</p>`;
        
        if(produto.promoAtiva) {
            const precoFinal = Number(produto.preco) - (Number(produto.preco) * (produto.promoPercent / 100));
            precoHTML = `
                <p style="color: #ccc; text-decoration: line-through; font-size: 0.9rem; margin-bottom:0;">R$ ${Number(produto.preco).toFixed(2)}</p>
                <p style="color: #ff329d; font-weight:bold; font-size:1.2rem;">R$ ${precoFinal.toFixed(2)}</p>
            `;
        }

        div.innerHTML = `
            <img src="${imgUrl}" alt="${produto.titulo}" style="width: 100%; height: 200px; object-fit: contain;">
            <h3 style="font-size: 1rem; margin: 10px 0; height: 40px; overflow: hidden;">${produto.titulo}</h3>
            ${precoHTML}
            <button onclick="adicionarAoCarrinho('${produto.id}')" 
                style="width:100%; padding:10px; background:#0077A3; color:white; border:none; border-radius:5px; cursor:pointer; margin-top:5px; font-weight:bold; transition: 0.2s;">
                <i class="fas fa-cart-plus"></i> Adicionar
            </button>
        `;
        gridProdutos.appendChild(div);
    });
}

// Busca
const searchInput = document.getElementById("searchInput");
if(searchInput) {
    searchInput.addEventListener("input", (e) => {
        const termo = e.target.value.toLowerCase();
        // Filtra considerando a categoria atual também (opcional, mas bom para UX)
        // Se quiser buscar na loja toda independente da categoria, use todosProdutos direto
        let base = todosProdutos;
        if(categoriaAtual !== "Todas") {
            base = todosProdutos.filter(p => p.categoria === categoriaAtual);
        }

        const filtrados = base.filter(prod => 
            prod.titulo.toLowerCase().includes(termo) || 
            (prod.categoria && prod.categoria.toLowerCase().includes(termo))
        );
        renderizarProdutos(filtrados);
    });
}

// Inicialização
carregarCategoriasDisplay();
carregarProdutos();

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    const loginLink = document.querySelector('a[href="login-nexa.html"]'); 
    const lojaMenu = document.getElementById("menuLoja");

    if (!user) {
        if (loginLink) loginLink.href = "login-nexa.html"; 
        if (lojaMenu) {
            lojaMenu.textContent = "SEJA UM VENDEDOR";
            lojaMenu.href = "cadastro-vendedor.html";
        }
        return;
    }

    if (loginLink) {
        loginLink.href = "meu-perfil.html";
        const icon = loginLink.querySelector("i");
        if(icon) {
            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");
        }
    }

    if (!lojaMenu) return;

    try {
        let docSnap = await getDoc(doc(db, "users", user.uid));
        if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, "usuarios", user.uid));
        }
        if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, "users", "ZgPorQd4vYfnzt5Mu8cg"));
        }

        if (docSnap.exists()) {
            const dados = docSnap.data();
            const tipo = dados.tipoUsuario || dados.tipo; 
            
            if (tipo === "administrador") {
                lojaMenu.innerHTML = '<i class="fas fa-cogs"></i> PAINEL ADMIN';
                lojaMenu.href = "admin-lojas.html";
                lojaMenu.style.color = "#0077A3"; 
                lojaMenu.style.fontWeight = "bold";
            } 
            else if (tipo === "vendedor") {
                lojaMenu.innerHTML = '<i class="fas fa-store"></i> MINHA LOJA';
                lojaMenu.href = "dashboard-loja.html";
            } 
            else {
                lojaMenu.textContent = "SEJA UM VENDEDOR";
                lojaMenu.href = "cadastro-vendedor.html";
            }
        } else {
            lojaMenu.textContent = "SEJA UM VENDEDOR";
            lojaMenu.href = "cadastro-vendedor.html";
        }
    } catch (error) {
        console.error("Erro crítico ao verificar usuário:", error);
    }
});