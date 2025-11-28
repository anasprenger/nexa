import { auth, db } from "./auth.js";
import { doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let lojaID = new URLSearchParams(window.location.search).get("id");
let percentualSelecionado = 0;

// 1. INICIALIZAÇÃO
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login-nexa.html";

    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.data();
    const userRole = userData.tipoUsuario;

    document.getElementById("badgeUser").innerText = userRole ? userRole.toUpperCase() : "USUÁRIO";

    if (userRole === "administrador") {
        document.getElementById("btnVoltar").onclick = () => window.location.href = "admin-lojas.html";
        if(!lojaID) return alert("Erro: ID da loja não fornecido.");
        carregarDashboard();
    } 
    else if (userRole === "vendedor") {
        document.getElementById("btnVoltar").onclick = () => signOut(auth).then(() => window.location.href = "login-nexa.html");
        
        const q = query(collection(db, "lojas"), where("donoUid", "==", user.uid));
        const snaps = await getDocs(q);
        
        if (snaps.empty) {
            alert("Redirecionando para criação de loja...");
            return window.location.href = "painel-vendedor.html"; 
        }
        
        snaps.forEach(d => lojaID = d.id);
        carregarDashboard();
    } 
    else {
        alert("Acesso negado.");
        window.location.href = "index.html";
    }
});

// 2. CARREGAR DADOS
async function carregarDashboard() {
    const lojaSnap = await getDoc(doc(db, "lojas", lojaID));
    const lojaData = lojaSnap.data();
    document.getElementById("headerNomeLoja").innerText = lojaData.nome;
    document.getElementById("confNome").value = lojaData.nome;
    document.getElementById("confDesc").value = lojaData.descricao || "";

    document.getElementById("btnAddProduto").onclick = () => {
        window.location.href = `cadastro-produto.html?lojaID=${lojaID}`;
    };

    carregarCategoriasSelect();
    carregarProdutos();
}

// 3. CARREGAR PRODUTOS
async function carregarProdutos() {
    const tbody = document.getElementById("listaProdutos");
    tbody.innerHTML = "<tr><td colspan='5'>Carregando...</td></tr>";

    const q = query(collection(db, "produtos"), where("lojaID", "==", lojaID));
    const snaps = await getDocs(q);
    
    tbody.innerHTML = "";
    document.getElementById("kpiTotalProdutos").innerText = snaps.size;

    snaps.forEach(docSnap => {
        const prod = docSnap.data();
        const precoOriginal = Number(prod.preco);
        
        let precoFinal = precoOriginal;
        let promoText = "-";
        
        if (prod.promoAtiva) {
            precoFinal = precoOriginal - (precoOriginal * (prod.promoPercent / 100));
            promoText = `<span style="color:#ff329d; font-weight:bold;">${prod.promoPercent}% OFF</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${prod.titulo}</td>
            <td>${prod.categoria}</td>
            <td>R$ ${precoOriginal.toFixed(2)}</td>
            <td>${prod.promoAtiva ? 'R$ ' + precoFinal.toFixed(2) + ' <br><small>'+promoText+'</small>' : '-'}</td>
            <td>
                <button onclick="editarProduto('${docSnap.id}')" class="action-btn" style="background:#3498db"><i class="fas fa-edit"></i></button>
                <button onclick="excluirProduto('${docSnap.id}')" class="action-btn" style="background:#e74c3c"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- FUNÇÃO DE EDIÇÃO (MODAL) ---
window.editarProduto = async (id) => {
    const docRef = doc(db, "produtos", id);
    const snap = await getDoc(docRef);
    if(!snap.exists()) return alert("Produto não encontrado.");
    const data = snap.data();

    document.getElementById("editId").value = id;
    document.getElementById("editNome").value = data.titulo;
    document.getElementById("editPreco").value = data.preco;
    document.getElementById("editCategoria").value = data.categoria;
    document.getElementById("editDescricao").value = data.descricao || "";

    // Lógica da Promoção no Modal
    const checkPromo = document.getElementById("editPromoAtiva");
    const divOpcoes = document.getElementById("editPromoOptions");
    const inputPercent = document.getElementById("editPromoPercent");

    checkPromo.checked = data.promoAtiva || false;
    inputPercent.value = data.promoPercent || "";
    
    // Atualiza visual inicial
    divOpcoes.style.display = checkPromo.checked ? "block" : "none";
    atualizarBotoesMiniPromo(data.promoPercent || 0);

    // Evento do Checkbox
    checkPromo.onclick = () => {
        divOpcoes.style.display = checkPromo.checked ? "block" : "none";
    };

    document.getElementById("modalEditar").style.display = "flex";
};

// Selecionar % no Modal
window.setEditPromo = (val) => {
    document.getElementById("editPromoPercent").value = val;
    atualizarBotoesMiniPromo(val);
};

function atualizarBotoesMiniPromo(val) {
    document.querySelectorAll(".promo-mini-btn").forEach(btn => {
        if(btn.innerText.includes(val + "%")) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

window.fecharModalEditar = () => {
    document.getElementById("modalEditar").style.display = "none";
};

// Salvar Edição
document.getElementById("formEditarProduto").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editId").value;
    const btn = e.target.querySelector("button[type=submit]");
    const promoAtiva = document.getElementById("editPromoAtiva").checked;
    const promoPercent = promoAtiva ? Number(document.getElementById("editPromoPercent").value) : 0;

    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
        await updateDoc(doc(db, "produtos", id), {
            titulo: document.getElementById("editNome").value,
            preco: Number(document.getElementById("editPreco").value),
            categoria: document.getElementById("editCategoria").value,
            descricao: document.getElementById("editDescricao").value,
            promoAtiva: promoAtiva,
            promoPercent: promoPercent
        });
        
        alert("Produto atualizado!");
        fecharModalEditar();
        carregarProdutos(); 
    } catch (err) {
        alert("Erro: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Salvar Alterações";
    }
});

// 4. LÓGICA DE PROMOÇÕES EM MASSA (Aba Promoções)
window.selectPromo = (percent) => {
    percentualSelecionado = percent;
    document.querySelectorAll(".promo-card").forEach(c => c.classList.remove("selected"));
    event.currentTarget.classList.add("selected");
};

document.getElementById("btnAplicarPromo").onclick = async () => {
    if(!percentualSelecionado) return alert("Selecione a porcentagem.");
    const escopo = document.getElementById("promoEscopo").value;
    
    if(!confirm(`Aplicar ${percentualSelecionado}% de desconto?`)) return;

    const batch = writeBatch(db);
    let q;
    
    if (escopo === "tudo") {
        q = query(collection(db, "produtos"), where("lojaID", "==", lojaID));
    } else {
        q = query(collection(db, "produtos"), where("lojaID", "==", lojaID), where("categoria", "==", escopo));
    }

    const snaps = await getDocs(q);
    snaps.forEach(doc => {
        batch.update(doc.ref, { promoAtiva: true, promoPercent: percentualSelecionado });
    });

    await batch.commit();
    alert("Promoção aplicada!");
    carregarProdutos();
};

document.getElementById("btnRemoverPromo").onclick = async () => {
    if(!confirm("Remover todos os descontos desta loja?")) return;
    const batch = writeBatch(db);
    const q = query(collection(db, "produtos"), where("lojaID", "==", lojaID));
    const snaps = await getDocs(q);
    snaps.forEach(doc => batch.update(doc.ref, { promoAtiva: false, promoPercent: 0 }));
    await batch.commit();
    alert("Descontos removidos.");
    carregarProdutos();
};

// 5. CARREGAR CATEGORIAS
async function carregarCategoriasSelect() {
    const optGroup = document.getElementById("optCategorias");
    const editSelect = document.getElementById("editCategoria");
    
    const snaps = await getDocs(collection(db, "categoria")); 
    
    snaps.forEach(doc => {
        const cat = doc.data();
        
        const option1 = document.createElement("option");
        option1.value = cat.nome;
        option1.innerText = cat.nome;
        optGroup.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = cat.nome;
        option2.innerText = cat.nome;
        editSelect.appendChild(option2);
    });
}

window.excluirProduto = async (id) => {
    if(confirm("Excluir?")) {
        await deleteDoc(doc(db, "produtos", id));
        carregarProdutos();
    }
};

document.getElementById("formConfigLoja").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateDoc(doc(db, "lojas", lojaID), {
        nome: document.getElementById("confNome").value,
        descricao: document.getElementById("confDesc").value
    });
    alert("Salvo!");
});