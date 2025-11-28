import { auth, db } from "./auth.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Verificação de Admin com Correção de ID
onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login-nexa.html";

    // 1. Tenta buscar pelo ID padrão (UID do Auth)
    let docRef = doc(db, "users", user.uid);
    let snap = await getDoc(docRef);

    // 2. CORREÇÃO: Se não achou, tenta pelo ID manual (Seu caso específico)
    if (!snap.exists()) {
        const idManual = "ZgPorQd4vYfnzt5Mu8cg"; // Seu ID no banco
        docRef = doc(db, "users", idManual);
        snap = await getDoc(docRef);
    }
    
    // 3. Verifica permissão
    if (!snap.exists() || snap.data().tipoUsuario !== "administrador") {
        alert("Acesso restrito. Você não é administrador.");
        window.location.href = "index.html";
    } else {
        // Se passou, carrega a lista
        carregarCategorias();
    }
});

// Criar Categoria
document.getElementById("formCategoria").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("catNome").value;
    const icone = document.getElementById("catIcone").value || "";

    try {
        // Salva na coleção 'categoria' (Singular)
        await addDoc(collection(db, "categoria"), {
            nome: nome,
            iconeUrl: icone, 
            ativa: true,
            dataCriacao: new Date()
        });
        alert("Categoria criada!");
        document.getElementById("formCategoria").reset();
        carregarCategorias();
    } catch (error) {
        alert("Erro: " + error.message);
    }
});

// Listar Categorias
async function carregarCategorias() {
    const divLista = document.getElementById("listaCategorias");
    divLista.innerHTML = "Carregando...";
    
    // Busca na coleção 'categoria'
    const snaps = await getDocs(collection(db, "categoria"));
    divLista.innerHTML = "";

    if (snaps.empty) {
        divLista.innerHTML = "<p>Nenhuma categoria cadastrada.</p>";
        return;
    }

    snaps.forEach(docSnap => {
        const cat = docSnap.data();
        
        let iconDisplay = '';
        // Verifica se é classe FontAwesome ou URL de imagem
        if(cat.iconeUrl && cat.iconeUrl.includes('fa-')) {
             iconDisplay = `<i class="${cat.iconeUrl}"></i>`;
        } else if (cat.iconeUrl) {
             iconDisplay = `<img src="${cat.iconeUrl}" width="20">`;
        } else {
             iconDisplay = `<i class="fas fa-tag"></i>`;
        }

        const card = document.createElement("div");
        card.className = "loja-card";
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3>${iconDisplay} ${cat.nome}</h3>
                    <p style="font-size: 12px; color: #777;">ID: ${docSnap.id}</p>
                </div>
                <button onclick="excluirCat('${docSnap.id}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        divLista.appendChild(card);
    });
}

// Tornar a função global para o HTML acessar
window.excluirCat = async (id) => {
    if(confirm("Excluir esta categoria?")) {
        await deleteDoc(doc(db, "categoria", id));
        carregarCategorias();
    }
};