import { auth, db } from "./auth.js";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let userLogado = null;

// 1. VERIFICAR SE JÁ ESTÁ LOGADO
onAuthStateChanged(auth, (user) => {
    const loginFields = document.getElementById("loginFields");
    const userMsg = document.getElementById("userLoggedMsg");

    if (user) {
        userLogado = user;
        if(loginFields) loginFields.style.display = "none";
        if(userMsg) userMsg.style.display = "block";
        
        // Remove 'required' dos campos de login ocultos
        document.getElementById("email")?.removeAttribute("required");
        document.getElementById("senha")?.removeAttribute("required");
    } else {
        if(loginFields) loginFields.style.display = "block";
        if(userMsg) userMsg.style.display = "none";
        document.getElementById("email")?.setAttribute("required", "true");
        document.getElementById("senha")?.setAttribute("required", "true");
    }
});

// 2. MÁSCARAS E VALIDAÇÃO VISUAL
const inputDoc = document.getElementById("docFiscal");
const selectDoc = document.getElementById("tipoDoc");

window.mudarMascara = () => {
    if(!inputDoc) return;
    inputDoc.value = "";
    document.getElementById("docError").style.display = "none";
    if (selectDoc.value === "cpf") {
        inputDoc.placeholder = "000.000.000-00";
        inputDoc.maxLength = 14;
    } else {
        inputDoc.placeholder = "00.000.000/0000-00";
        inputDoc.maxLength = 18;
    }
};

// 3. BUSCA DE CEP
const cepInput = document.getElementById("cepLoja");
if(cepInput) {
    cepInput.addEventListener("blur", async function() {
        let cep = this.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    document.getElementById("cidadeLoja").value = `${data.localidade} - ${data.uf}`;
                    document.getElementById("ruaLoja").value = `${data.logradouro}, , ${data.bairro}`;
                }
            } catch(e) { console.log(e); }
        }
    });
}

// 4. ENVIO DO FORMULÁRIO
const formLoja = document.getElementById("formLoja");
if(formLoja) {
    formLoja.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btnCadastrar");
        const docNumero = inputDoc.value.replace(/\D/g, '');
        const tipoDocumento = selectDoc.value;

        // Validação de Documento
        if (!validarDocumento(docNumero, tipoDocumento)) {
            document.getElementById("docError").style.display = "block";
            inputDoc.focus();
            return;
        }
        document.getElementById("docError").style.display = "none";

        btn.disabled = true;
        btn.innerText = "Processando...";

        try {
            let uid;

            // A) Se não está logado, cria conta ou loga
            if (!userLogado) {
                const email = document.getElementById("email").value;
                const senha = document.getElementById("senha").value;
                
                try {
                    // Tenta criar usuário novo
                    const userCred = await createUserWithEmailAndPassword(auth, email, senha);
                    uid = userCred.user.uid;
                    
                    // CORREÇÃO: Usa setDoc para garantir criação
                    await setDoc(doc(db, "users", uid), {
                        email: email,
                        nome: document.getElementById("responsavel").value,
                        tipoUsuario: "vendedor", 
                        criadoEm: new Date()
                    }, { merge: true });

                } catch (authErr) {
                    if (authErr.code === 'auth/email-already-in-use') {
                        // Se já existe, tenta logar
                        const loginCred = await signInWithEmailAndPassword(auth, email, senha);
                        uid = loginCred.user.uid;
                        
                        // CORREÇÃO: Atualiza perfil existente para vendedor
                        await setDoc(doc(db, "users", uid), { 
                            tipoUsuario: "vendedor" 
                        }, { merge: true });
                    } else {
                        throw authErr;
                    }
                }
            } else {
                // B) Já está logado
                uid = userLogado.uid;
                
                // CORREÇÃO CRÍTICA PARA O SEU ERRO:
                // updateDoc falha se não existir. setDoc com merge cria se não existir.
                await setDoc(doc(db, "users", uid), { 
                    tipoUsuario: "vendedor",
                    email: userLogado.email || ""
                }, { merge: true });
            }

            // C) Cria a Loja
            const lojaRef = await addDoc(collection(db, "lojas"), {
                nome: document.getElementById("nomeLoja").value,
                descricao: document.getElementById("descLoja").value,
                donoUid: uid,
                endereco: {
                    cep: document.getElementById("cepLoja").value,
                    completo: document.getElementById("ruaLoja").value,
                    cidade: document.getElementById("cidadeLoja").value
                },
                dadosFiscais: {
                    tipo: tipoDocumento,
                    numero: docNumero,
                    responsavel: document.getElementById("responsavel").value
                },
                contato: document.getElementById("telefone").value,
                ativa: true,
                dataCriacao: new Date()
            });

            // D) Sucesso
            document.getElementById("formContainer").style.display = "none";
            document.getElementById("successScreen").style.display = "block";
            document.getElementById("nomeLojaSucesso").innerText = document.getElementById("nomeLoja").value;
            
            // Botão para ir ao dashboard
            document.getElementById("btnComecar").onclick = () => {
                window.location.href = `dashboard-loja.html?id=${lojaRef.id}`;
            };

        } catch (error) {
            console.error(error);
            alert("Erro ao cadastrar: " + error.message);
            btn.disabled = false;
            btn.innerText = "SEJA VENDEDOR";
        }
    });
}

// --- FUNÇÕES DE VALIDAÇÃO ---
function validarDocumento(val, type) {
    if (type === 'cpf') return validarCPF(val);
    if (type === 'cnpj') return validarCNPJ(val);
    return false;
}

function validarCPF(cpf) {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

function validarCNPJ(cnpj) {
    if (cnpj.length !== 14) return false;
    return true; 
}