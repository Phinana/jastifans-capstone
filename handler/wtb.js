import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js';

// Konfigurasi Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBQ3FFWzz-lBkEajePwUl5LxgpAOGqlXZA",
    authDomain: "capstone-442413.firebaseapp.com",
    projectId: "capstone-442413",
    storageBucket: "capstone-442413.firebasestorage.app",
    messagingSenderId: "1040333147919",
    appId: "1:1040333147919:web:63f19a9dd72b315bebb87a",
    measurementId: "G-S3Q03WCGNW"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth', // Menambahkan efek scroll yang halus
            block: 'start', // Memastikan bagian tersebut berada di atas halaman
        });
    }
};

//Fungsi untuk menambahkan postingan ke Firestore
const submitPost = async () => {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const budget = document.getElementById('budget').value;

    if (!title || !description) {
        alert('Judul dan Deskripsi wajib diisi!');
        return;
    }

    try {
        await addDoc(collection(db, 'wtb-post'), {
            title,
            description,
            budget: budget || 'N/A',
            createdAt: serverTimestamp()
        });

        alert('Postingan berhasil ditambahkan!');
        document.querySelector('#post-form form').reset(); // Reset form setelah submit
        fetchMyPosts(); // Menampilkan ulang postingan setelah menambahkan
    } catch (error) {
        console.error('Error menambahkan postingan:', error);
        alert('Gagal menambahkan postingan. Coba lagi nanti.');
    }
};


// Fungsi untuk mengambil dan menampilkan postingan dari Firestore
const fetchMyPosts = async () => {
    const myPostsContainer = document.getElementById('my-posts-container');
    myPostsContainer.innerHTML = '<p class="text-gray-500">Memuat postingan Anda...</p>';

    try {
        const querySnapshot = await getDocs(collection(db, 'wtb-post'));
        myPostsContainer.innerHTML = ''; // Menghapus placeholder

        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const postElement = document.createElement('div');
            postElement.className = 'border rounded-lg p-4 mb-4 shadow hover:shadow-lg transition';
            postElement.innerHTML = `
                <h3 class="font-bold text-gray-700">${post.title}</h3>
                <p class="text-gray-600">${post.description}</p>
                <p class="text-gray-500">Budget: ${post.budget}</p>
                <span class="text-sm text-gray-400">Dibuat pada ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Waktu tidak tersedia'}</span>
            `;
            myPostsContainer.appendChild(postElement);
        });

        if (querySnapshot.empty) {
            myPostsContainer.innerHTML = '<p class="text-gray-500">Belum ada postingan.</p>';
        }
    } catch (error) {
        console.error('Error mengambil postingan:', error);
        myPostsContainer.innerHTML = '<p class="text-red-500">Gagal memuat postingan.</p>';
    }
};

// Menambahkan event listener untuk tombol Post Now
document.addEventListener('DOMContentLoaded', () => {
    fetchMyPosts(); // Menampilkan postingan saat halaman dimuat

    document.getElementById('submit-post').addEventListener('click', submitPost);

    // Toggle post form visibility
    document.getElementById('toggle-post-form').addEventListener('click', () => {
        const form = document.getElementById('post-form');
        form.classList.toggle('hidden'); // Tampilkan atau sembunyikan form
    });

    // Navigasi antar tab
    document.getElementById('post-tab').addEventListener('click', () => scrollToSection('my-posts-tab'));
    document.getElementById('my-posts-tab').addEventListener('click', () => scrollToSection('post-tab'));
});
