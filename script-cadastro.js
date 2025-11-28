import { auth, db } from "./auth.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Lógica Menu
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");
const closeMenu = document.getElementById("closeMenu");

if (menuButton) menuButton.onclick = () => sideMenu.classList.add("open");
if (closeMenu) closeMenu.onclick = () => sideMenu.classList.remove("open");

// Cadastro
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const email = document.getElementById("email").value;
    const senha = document.getElementById("password").value;
    const senha2 = document.getElementById("passwordConfirm").value;

    if (senha !== senha2) return alert("Senhas não conferem!");

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        await updateProfile(cred.user, { displayName: nome });

        // Pega dados do endereço
        const endereco = {
            cep: document.getElementById("cep").value,
            rua: document.getElementById("rua").value,
            bairro: document.getElementById("bairro").value,
            cidade: document.getElementById("cidade").value,
            estado: document.getElementById("estado").value,
            numero: document.getElementById("Numero").value
        };

        await setDoc(doc(db, "tipoUsuario", cred.user.uid), {
            nome, email, endereco, tipo: "usuario", criadoEm: new Date()
        });

        alert("Sucesso!");
        window.location.href = "login-nexa.html";

    } catch (error) {
        alert("Erro: " + error.message);
    }
});

// CEP
document.getElementById('cep').addEventListener('blur', async function () {
    let cep = this.value.replace(/\D/g, '');
    if (cep.length === 8) {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if(!data.erro) {
            document.getElementById('rua').value = data.logradouro;
            document.getElementById('bairro').value = data.bairro;
            document.getElementById('cidade').value = data.localidade;
            document.getElementById('estado').value = data.uf;
        }
    }
});