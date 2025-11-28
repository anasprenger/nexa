import { auth, db } from "./auth.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const lojaID = params.get("id");

// 1. AUTH & INIT
auth.onAuthStateChanged(async (user) => {
    if (!user) return window.location.href = "login-nexa.html";

    // Busca usuário na coleção 'users'
    let userDoc = await getDoc(doc(db, "users", user.uid));

    // Removido o fallback inseguro que usava o ID do admin (ZgPor...) se não encontrasse o usuário

    if (!userDoc.exists() || userDoc.data().tipoUsuario !== "administrador") {
        alert("Acesso negado."); // Adicionado alerta para feedback
        return window.location.href = "index.html";
    }

    if (!lojaID) {
        alert("ID da loja não especificado.");
        window.location.href = "admin-lojas.html";
        return;
    }

    carregarDadosLoja();
});

// 2. CARREGAR DADOS DA LOJA
async function carregarDadosLoja() {
    const lojaRef = doc(db, "lojas", lojaID);
    const lojaSnap = await getDoc(lojaRef);

    if (!lojaSnap.exists()) {
        alert("Loja não encontrada!");
        return;
    }

    const lojaData = lojaSnap.data();
    document.getElementById("nomeLoja").innerText = "Loja: " + lojaData.nome;

    // Configurar botão de Novo Produto
    const btnAdd = document.getElementById("btnAddProduto");
    if (btnAdd) {
        btnAdd.onclick = () => {
            window.location.href = `cadastro-produto.html?lojaID=${lojaID}`;
        };
    }

    // Se já tiver desconto, preencher modal
    if (lojaData.desconto && lojaData.desconto.ativo) {
        document.getElementById("descontoPercentual").value = lojaData.desconto.percentual;
        document.getElementById("descontoInicio").value = lojaData.desconto.inicio;
        document.getElementById("descontoFim").value = lojaData.desconto.fim;
    }

    carregarProdutos();
}

// 3. CARREGAR PRODUTOS NA TABELA
async function carregarProdutos() {
    const tbody = document.getElementById("produtosList");
    tbody.innerHTML = "<tr><td colspan='4'>Carregando produtos...</td></tr>";

    const produtosRef = collection(db, "produtos");
    const querySnapshot = await getDocs(produtosRef);

    tbody.innerHTML = "";
    let encontrou = false;

    querySnapshot.forEach((docSnap) => {
        const produto = docSnap.data();

        // Filtra visualmente (idealmente seria no backend com "where")
        if (produto.lojaID === lojaID) {
            encontrou = true;
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${produto.titulo}</td>
                <td>R$ ${Number(produto.preco).toFixed(2)}</td>
                <td>${produto.categoria || '-'}</td>
                <td>
                    <button class="action-btn" style="background:#3498db" onclick="editarProduto('${docSnap.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn" style="background:#e74c3c" onclick="excluirProduto('${docSnap.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    if (!encontrou) {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding: 20px;'>Nenhum produto encontrado nesta loja.</td></tr>";
    }
}

// 4. AÇÕES (EDITAR E EXCLUIR)
window.editarProduto = async function (id) {
    const produtoRef = doc(db, "produtos", id);
    const snap = await getDoc(produtoRef);
    if (!snap.exists()) return;

    const dados = snap.data();

    // Edição simples via Prompt
    const novoTitulo = prompt("Novo título:", dados.titulo);
    if (novoTitulo === null) return;

    const novoPreco = prompt("Novo preço (ex: 49.90):", dados.preco);
    if (novoPreco === null) return;

    await updateDoc(produtoRef, {
        titulo: novoTitulo,
        preco: Number(novoPreco.replace(',', '.'))
    });

    alert("Produto atualizado!");
    carregarProdutos();
};

window.excluirProduto = async function (id) {
    if (!confirm("Tem certeza que deseja excluir permanentemente?")) return;

    await deleteDoc(doc(db, "produtos", id));
    carregarProdutos();
};

// 5. MODAL LOGIC
const modal = document.getElementById("modalDesconto");
const btnDesconto = document.getElementById("descontoBtn");
const btnCancelar = document.getElementById("cancelarModal");

if (btnDesconto) btnDesconto.onclick = () => { modal.style.display = "flex"; };
if (btnCancelar) btnCancelar.onclick = () => { modal.style.display = "none"; };

// 6. SALVAR DESCONTO
const formDesconto = document.getElementById("formDesconto");
if (formDesconto) {
    formDesconto.addEventListener("submit", async (e) => {
        e.preventDefault();

        const percentual = Number(document.getElementById("descontoPercentual").value);
        const inicio = document.getElementById("descontoInicio").value;
        const fim = document.getElementById("descontoFim").value;

        await updateDoc(doc(db, "lojas", lojaID), {
            desconto: {
                ativo: true,
                percentual,
                inicio,
                fim
            }
        });

        alert("Desconto aplicado!");
        modal.style.display = "none";
    });
}

// 7. REMOVER DESCONTO
const btnRemover = document.getElementById("removerDesconto");
if (btnRemover) {
    btnRemover.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!confirm("Remover o desconto?")) return;

        await updateDoc(doc(db, "lojas", lojaID), {
            "desconto.ativo": false
        });

        alert("Desconto removido.");
        document.getElementById("formDesconto").reset();
        modal.style.display = "none";
    });
}

// LOGOUT
const btnLogout = document.getElementById("logoutBtn");
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        signOut(auth).then(() => window.location.href = "login-nexa.html");
    });
}