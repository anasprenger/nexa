import { auth, db } from "./auth.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Nota: Importei signOut do auth no lugar errado acima, correção abaixo:
import { signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// 1. VERIFICAR SE É ADMIN
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login-nexa.html";
        return;
    }

    const docRef = doc(db, "tipoUsuario", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists() || docSnap.data().tipo !== "administrador") {
        alert("Acesso restrito.");
        window.location.href = "index.html";
        return;
    }

    carregarLojas();
});

// 2. CARREGAR LOJAS
async function carregarLojas() {
    const lista = document.getElementById("listaLojas");
    lista.innerHTML = "<p>Carregando...</p>";

    try {
        const querySnapshot = await getDocs(collection(db, "lojas"));
        lista.innerHTML = "";

        if (querySnapshot.empty) {
            lista.innerHTML = "<p>Nenhuma loja encontrada.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const loja = docSnap.data();
            const card = document.createElement("div");
            card.classList.add("loja-card");

            card.innerHTML = `
                <h3>${loja.nome || "Loja sem nome"}</h3>
                <p class="status ${loja.ativa ? "ativo" : "inativo"}">
                    Status: <strong>${loja.ativa ? "Ativa" : "Desativada"}</strong>
                </p>

                <div class="card-actions">
                    <button class="btn btn-gerenciar"
                        onclick="window.location.href='admin-loja-produtos.html?id=${docSnap.id}'">
                        <i class="fas fa-box"></i> Gerenciar Produtos
                    </button>

                    <button class="btn ${loja.ativa ? "btn-desativar" : "btn-ativar"}"
                        onclick="alternarStatus('${docSnap.id}', ${loja.ativa})">
                        ${loja.ativa ? "Desativar Loja" : "Ativar Loja"}
                    </button>
                </div>
            `;
            lista.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        lista.innerHTML = "<p>Erro ao carregar lojas.</p>";
    }
}

// 3. ALTERNAR STATUS (Função Global)
window.alternarStatus = async function (id, atual) {
    const novaAcao = atual ? "desativar" : "ativar";
    if (!confirm(`Deseja realmente ${novaAcao} esta loja?`)) return;

    try {
        await updateDoc(doc(db, "lojas", id), { ativa: !atual });
        alert("Status atualizado!");
        carregarLojas();
    } catch (error) {
        alert("Erro: " + error.message);
    }
};

// 4. LOGOUT
const btnLogout = document.getElementById("btnLogout");
if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        firebaseSignOut(auth).then(() => window.location.href = "login-nexa.html");
    });
}