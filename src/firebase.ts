import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

export const firebaseConfig = {
    apiKey: "AIzaSyBMG5U1xYwoKGj-h6niNA7A_pY7LMkAfSc",
    authDomain: "digital-siwes-logbook.firebaseapp.com",
    projectId: "digital-siwes-logbook",
    storageBucket: "digital-siwes-logbook.firebasestorage.app",
    messagingSenderId: "1035689630303",
    appId: "1:1035689630303:web:1417dff7221ee3499e99ea"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export default firebase;
