var firebaseConfig = {
  apiKey:            "AIzaSyDxlxmbB8HDCzjSurx-b1pebZCuBLU61kU",
  authDomain:        "yashir-marketing.firebaseapp.com",
  projectId:         "yashir-marketing",
  storageBucket:     "yashir-marketing.firebasestorage.app",
  messagingSenderId: "1000002092474",
  appId:             "1:1000002092474:web:c39a8ed42d02e015467183",
  measurementId:     "G-PN0FHRXYN2"
};

firebase.initializeApp(firebaseConfig);
window.DB = firebase.firestore();
