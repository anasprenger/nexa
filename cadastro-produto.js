import { auth, db } from "./auth.js";
import { collection, addDoc, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Tenta pegar LojaID da URL
const urlParams = new URLSearchParams(window.location.search);
let userLojaID = urlParams.get("lojaID");

// Carregar Categorias
async function carregarCategorias() {
    const select = document.getElementById("categoria");
    if (!select) return;

    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const snaps = await getDocs(collection(db, "categoria")); // Singular
        select.innerHTML = '<option value="">Selecione...</option>';
        snaps.forEach(docSnap => {
            const cat = docSnap.data();
            const option = document.createElement("option");
            option.value = cat.nome;
            option.innerText = cat.nome;
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Erro ao carregar categorias:", e);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}
carregarCategorias();

onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "login-nexa.html";

    console.log("Usuário logado:", user.uid);

    // --- CORREÇÃO DE SEGURANÇA (ADMIN + CAMPOS) ---
    let userSnap;
    let docRef = doc(db, "users", user.uid);

    // 1. Tenta buscar pelo ID normal
    userSnap = await getDoc(docRef);

    // 2. Se não achou e for Admin, tenta ID manual
    if (!userSnap.exists()) {
        console.log("Tentando fallback de ID...");
        // Tenta o ID legado do Admin
        userSnap = await getDoc(doc(db, "users", "ZgPorQd4vYfnzt5Mu8cg"));
    }

    if (!userSnap.exists()) {
        alert("Erro: Perfil de usuário não encontrado no banco de dados.");
        window.location.href = "index.html";
        return;
    }

    const userData = userSnap.data();
    console.log("Dados do usuário:", userData);

    // 3. Lê 'tipoUsuario' OU 'tipo' (Compatibilidade)
    const userRole = userData.tipoUsuario || userData.tipo;

    const btnVoltar = document.getElementById("btnVoltar");

    if (userRole === "administrador") {
        userLojaID = "nexa_oficial";
        if (btnVoltar) btnVoltar.href = "admin-lojas.html";
    }
    else if (userRole === "vendedor") {
        if (btnVoltar) btnVoltar.href = "dashboard-loja.html";

        // Se já veio ID da URL (do dashboard), usa ele
        if (userLojaID) return;

        // Senão busca a loja
        const q = query(collection(db, "lojas"), where("donoUid", "==", user.uid));
        const snaps = await getDocs(q);

        if (!snaps.empty) {
            snaps.forEach(d => userLojaID = d.id);
        } else {
            alert("Sua conta de vendedor está ativa, mas nenhuma loja foi encontrada.");
            window.location.href = "cadastro-vendedor.html"; // Manda criar loja
        }
    }
    else {
        alert(`Acesso negado. Seu tipo de usuário é: ${userRole || "Desconhecido"}`);
        window.location.href = "index.html";
    }
});

// Processamento de Imagem
const fileInput = document.getElementById("imagemFile");
const hiddenInput = document.getElementById("imagemBase64");
const previewImg = document.getElementById("previewImg");
const previewText = document.getElementById("previewText");

if (fileInput) {
    fileInput.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                let width = img.width; let height = img.height;
                const max = 400;
                if (width > height) { if (width > max) { height *= max / width; width = max; } }
                else { if (height > max) { width *= max / height; height = max; } }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                previewImg.src = dataUrl; previewImg.style.display = "block";
                if (previewText) previewText.style.display = "none";
                hiddenInput.value = dataUrl;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Salvar Produto
const form = document.getElementById("formProduto");
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!userLojaID) return alert("Erro: Nenhuma loja vinculada para salvar o produto.");

        const imagemBase64 = document.getElementById("imagemBase64").value;
        const titulo = document.getElementById("titulo").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const categoria = document.getElementById("categoria").value;
        const btn = document.getElementById("btnSalvar");

        btn.disabled = true;
        btn.innerText = "Salvando...";

        try {
            await addDoc(collection(db, "produtos"), {
                titulo, preco, categoria, imagem: imagemBase64,
                lojaID: userLojaID,
                promoAtiva: false,
                promoPercent: 0,
                vendedorUid: auth.currentUser.uid,
                dataCriacao: new Date()
            });
            alert("Produto cadastrado com sucesso!");

            // Se veio do dashboard, volta pra lá
            if (urlParams.get("lojaID")) window.location.href = `dashboard-loja.html?id=${userLojaID}`;
            else window.location.reload();

        } catch (err) {
            console.error(err);
            alert("Erro ao salvar: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = "Cadastrar Produto";
        }
    });
}