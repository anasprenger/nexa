// Importa as funções necessárias (Versão 10.12.2)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDwDlSIlZXJax0ru3S_4yjG2spYv9UC3Pw", // CUIDADO: Em produção, proteja isso
    authDomain: "nexa-26f43.firebaseapp.com",
    projectId: "nexa-26f43",
    storageBucket: "nexa-26f43.firebasestorage.app",
    messagingSenderId: "988696409103",
    appId: "1:988696409103:web:d28243c34c76bd5ffddf7a"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar serviços para usar nos outros arquivos
export const auth = getAuth(app);
export const db = getFirestore(app);