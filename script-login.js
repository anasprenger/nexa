import { auth, db } from "./auth.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Lógica Menu
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const closeMenu = document.getElementById("closeMenu");

if (menuButton) menuButton.onclick = () => sideMenu.classList.add("open");
if (closeMenu) closeMenu.onclick = () => sideMenu.classList.remove("open");

// Login
document.getElementById("btnLogin").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const senha = document.getElementById("loginSenha").value;

    if(!email || !senha) return alert("Preencha todos os campos");

    try {
        const cred = await signInWithEmailAndPassword(auth, email, senha);
        
        // BUSCA EM 'users'
        const ref = doc(db, "users", cred.user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
            window.location.href = "index.html"; 
            return;
        }

        // CORREÇÃO: tipoUsuario
        const tipo = snap.data().tipoUsuario;
        
        if (tipo === "administrador") {
            window.location.href = "admin-daschboard.html";
        } else {
            window.location.href = "index.html";
        }

    } catch (error) {
        alert("Erro ao entrar: " + error.message);
    }
});