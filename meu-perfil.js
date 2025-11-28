import { auth, db } from "./auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Verificar Login
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login-nexa.html";
        return;
    }

    // Busca dados no banco
    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            preencherDados(data, user);
        } else {
            console.warn("Perfil incompleto no banco de dados.");
            // Tenta preencher com o básico do Auth
            document.getElementById("userName").innerText = user.displayName || "Usuário";
            document.getElementById("displayEmail").innerText = user.email;
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
    }
});

function preencherDados(data, userAuth) {
    // Cabeçalho Lateral
    document.getElementById("userName").innerText = data.nome || userAuth.displayName || "Usuário";
    
    // Formatar Tipo de Usuário
    let tipoFormatado = "Cliente";
    if (data.tipoUsuario === "vendedor") tipoFormatado = "Vendedor / Cliente";
    if (data.tipoUsuario === "administrador") tipoFormatado = "Administrador";
    
    const roleEl = document.getElementById("userRole");
    roleEl.innerText = tipoFormatado;
    
    // Mudar cor da badge dependendo do nível
    if (data.tipoUsuario === "administrador") {
        roleEl.style.background = "#ffeb3b"; 
        roleEl.style.color = "#333";
    } else if (data.tipoUsuario === "vendedor") {
        roleEl.style.background = "#e0f2f1";
        roleEl.style.color = "#00695c";
    }

    // Aba Dados Pessoais
    document.getElementById("displayNome").innerText = data.nome || "-";
    document.getElementById("displayEmail").innerText = data.email || userAuth.email;
    document.getElementById("displayTipo").innerText = tipoFormatado;
    
    // Data de Criação
    if (data.criadoEm) {
        // Converte Timestamp do Firestore para Data legível
        const dataCriacao = data.criadoEm.toDate ? data.criadoEm.toDate() : new Date(data.criadoEm);
        document.getElementById("displayData").innerText = dataCriacao.toLocaleDateString('pt-BR');
    }

    // Endereço
    if (data.endereco) {
        document.getElementById("displayRua").innerText = `${data.endereco.rua || ''}, ${data.endereco.numero || ''}`;
        document.getElementById("displayBairro").innerText = data.endereco.bairro || "-";
        document.getElementById("displayCidade").innerText = `${data.endereco.cidade || ''} - ${data.endereco.estado || ''}`;
        document.getElementById("displayCep").innerText = data.endereco.cep || "-";
    }
}

// Função de Logout Global
window.logout = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};