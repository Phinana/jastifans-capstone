import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where, orderBy, addDoc } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();

// Fungsi untuk mengambil data pesanan
const fetchOrders = async (id_user) => {
    try {
        console.log("Mencoba mengambil pesanan untuk UID:", id_user);

        const ordersQuery = query(
            collection(db, "orders"),
            where("id_user", "==", id_user),
            orderBy("orderTimestamp")
        );

        const querySnapshot = await getDocs(ordersQuery);

        console.log("Jumlah pesanan ditemukan:", querySnapshot.size);

        const tableBody = document.getElementById("product-table");
        tableBody.innerHTML = ''; // Menghapus konten lama di tabel

        if (querySnapshot.size > 0) {
            querySnapshot.forEach((doc) => {
                const orders = doc.data();
                console.log("Pesanan data:", orders);

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="px-4 py-2 border-b">${orders.id_produk}</td>
                    <td class="px-4 py-2 border-b">${orders.nama_jastip}</td>
                    <td class="px-4 py-2 border-b">${orders.product_name}</td>
                    <td class="px-2 py-2 border-b">Rp ${orders.harga.toLocaleString('id-ID')}</td>
                    <td class="px-2 py-2 border-b">${orders.productQuantity || 1 }</td>
                    <td class="px-2 py-2 border-b">Rp ${(orders.harga * (orders.productQuantity || 1)).toLocaleString('id-ID')}</td>
                    <td class="px-4 py-2 border-b">${orders.statuspengiriman}</td>
                    <td class="px-4 py-2 border-b">${new Date(orders.orderTimestamp.seconds * 1000).toLocaleString('id-ID')}</td>
                    <td class="px-4 py-2 border-b">
                        <button class="bg-purple-600 text-white px-3 py-1 rounded hover:bg-green-600" onclick="showRatingPopup('${orders.id_produk}')">
                            Nilai Produk
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.log("Tidak ada pesanan untuk pengguna ini.");
            tableBody.innerHTML = "<tr><td colspan='8' class='text-center py-4'>Tidak ada pesanan ditemukan</td></tr>";
        }
    } catch (error) {
        console.error("Error fetching orders:", error.message);
    }
};

// Fungsi untuk menampilkan popup rating
function showRatingPopup(orderId) {
    const popup = document.getElementById('rating-popup');
    const orderDisplay = document.getElementById('order-id-display');

    popup.classList.remove('hidden');
    popup.dataset.orderId = orderId;
    orderDisplay.textContent = orderId;

    resetRating();
}

// Fungsi untuk menutup popup rating
function closeRatingPopup() {
    const popup = document.getElementById('rating-popup');
    popup.classList.add('hidden');
}

// Fungsi untuk memilih rating dengan bintang
function setRating(value) {
    const stars = document.querySelectorAll('#star-rating span');
    document.getElementById('rating-value').value = value;

    stars.forEach((star, index) => {
        if (index < value) {
            star.classList.add('selected');
        } else {
            star.classList.remove('selected');
        }
    });
}

// Fungsi untuk reset rating bintang
function resetRating() {
    const stars = document.querySelectorAll('#star-rating span');
    document.getElementById('rating-value').value = 0;

    stars.forEach(star => star.classList.remove('selected'));
}

// Fungsi untuk submit rating ke Firestore
async function submitRating() {
    const popup = document.getElementById('rating-popup');
    const orderId = popup.dataset.orderId;
    const ratingValue = document.getElementById('rating-value').value;

    if (ratingValue === "0") {
        alert("Harap pilih rating sebelum submit!");
        return;
    }

    try {
        await addDoc(collection(db, "ratings"), {
            orderId: orderId,
            rating: parseInt(ratingValue),
            createdAt: new Date()
        });

        alert("Rating berhasil dikirim!");
        closeRatingPopup();
    } catch (error) {
        console.error("Error saat mengirim rating:", error);
        alert("Gagal mengirim rating. Coba lagi nanti.");
    }
}

// Event listener DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Pengguna login dengan UID:", user.uid);
            await fetchOrders(user.uid);
        } else {
            console.log("Pengguna tidak login");
            alert("Anda harus login untuk melihat pesanan.");
            window.location.href = "/login.html";
        }
    });
});

// Menambahkan fungsi ke global scope agar dapat diakses dari HTML
window.showRatingPopup = showRatingPopup;
window.closeRatingPopup = closeRatingPopup;
window.setRating = setRating;
window.submitRating = submitRating;
