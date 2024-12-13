import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js';

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

document.addEventListener("DOMContentLoaded", async () => {
    const fetchUserProfile = async (uid) => {
        try {
            const userRef = doc(db, "users", uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const userName = userData.name || "Nama tidak tersedia";
                const userPhone = userData.phone || "Nomor telepon tidak tersedia";
                const userAddress = userData.address || "Alamat tidak tersedia";

                document.getElementById("userName").innerText = `${userName}`;
                document.getElementById("userPhone").innerText = `(+62) ${userPhone}`;
                document.getElementById("userAddress").innerText = userAddress;
            } else {
                console.error("Dokumen pengguna tidak ditemukan!");
            }
        } catch (error) {
            console.error("Error mendapatkan data pengguna:", error);
        }
    };

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await fetchUserProfile(user.uid);
        } else {
            alert("Anda harus login untuk melihat detail pesanan.");
            window.location.href = "/login.html";
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
        alert("ID produk tidak ditemukan.");
        return;
    }

    try {
        const productRef = doc(db, "detail-jastip", productId);
        const productDoc = await getDoc(productRef);

        if (productDoc.exists()) {
            const product = productDoc.data();
            const productPrice = parseInt(product.harga);

            document.getElementById("productName").innerText = product.product_name || "Nama produk tidak tersedia";
            document.getElementById("productPrice").innerText = `Rp ${productPrice.toLocaleString("id-ID") || "0"}`;
            document.getElementById("productImage").src = product.gambar_produk || "placeholder.jpg";

            let currentQuantity = 1;

            const updatePriceAndTotal = () => {
                const subtotal = productPrice * currentQuantity;
                const adminPrice = Math.round(subtotal * 0.02);
                const total = subtotal + adminPrice + 10000;

                document.getElementById("subtotal").innerText = `Rp ${subtotal.toLocaleString("id-ID")}`;
                document.getElementById("adminprice").innerText = `Rp ${adminPrice.toLocaleString("id-ID")}`;
                document.getElementById("total").innerText = `Rp ${total.toLocaleString("id-ID")}`;
            };

            document.getElementById("decrementButton").addEventListener("click", () => {
                if (currentQuantity > 1) {
                    currentQuantity--;
                    document.getElementById("quantity").innerText = currentQuantity;
                    updatePriceAndTotal();
                }
            });

            document.getElementById("incrementButton").addEventListener("click", () => {
                currentQuantity++;
                document.getElementById("quantity").innerText = currentQuantity;
                updatePriceAndTotal();
            });

            updatePriceAndTotal();

            const updateOrderInFirestore = async (orderId, userId, productId, quantity, totalAmount, status) => {
                try {
                    const orderRef = doc(db, "orders", orderId);
                    await updateDoc(orderRef, {
                        userId: userId,
                        productId: productId,
                        quantity: quantity,
                        totalAmount: totalAmount,
                        status: status,
                        updatedAt: new Date(),
                    });
                    console.log("Pesanan berhasil diperbarui di Firestore");
                } catch (error) {
                    console.error("Error memperbarui pesanan di Firestore:", error);
                }
            };

            document.getElementById("payButton").addEventListener("click", async () => {
                const totalAmount = Math.round(parseInt(document.getElementById("total").innerText.replace(/\D/g, ""), 10));
                const user = auth.currentUser;

                if (!user) {
                    alert("Anda harus login untuk melanjutkan.");
                    return;
                }

                const id_user = user.uid;
                const orderId = `${id_user}-${productId}`; // Order ID unik
                const currentQuantity = parseInt(document.getElementById("quantity").innerText, 10);

                try {
                    const orderRef = doc(db, "orders", orderId);
                    const orderDoc = await getDoc(orderRef);

                    if (orderDoc.exists()) {
                        console.log("Pesanan sudah ada, memperbarui pesanan...");
                        await  await updateDoc(orderRef, {
                            userId: id_user,
                            productId: productId,
                            quantity: currentQuantity,
                            totalAmount: totalAmount,
                            status: "pending",
                            updatedAt: new Date(),});
                    } else {
                        console.log("Pesanan baru, menyimpan ke Firestore...");
                        await setDoc(orderRef, {
                            orderId: orderId,
                            userId: id_user,
                            productId: productId,
                            quantity: currentQuantity,
                            totalAmount: totalAmount,
                            status: "pending",
                            createdAt: new Date(),
                        });
                    }

                    const response = await fetch('http://localhost:3000/payment-gateway/placeOrder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ totalAmount, orderId, id_user })
                    });

                    if (!response.ok) {
                        throw new Error('Gagal mendapatkan token.');
                    }

                    const data = await response.json();
                    const token = data.token;

                    if (!token) {
                        throw new Error('Token pembayaran tidak valid.');
                    }

                    window.snap.pay(token, {
                        onSuccess: function(result) {
                            console.log('Pembayaran Sukses:', result);
                            window.location.href = "pesanansaya.html";
                            updateOrderInFirestore(orderId, id_user, productId, currentQuantity, totalAmount, "success");
                        },
                        onPending: function(result) {
                            console.log('Pembayaran Pending:', result);
                            alert("Pembayaran pending.");
                            updateOrderInFirestore(orderId, id_user, productId, currentQuantity, totalAmount, "pending");
                        },
                        onError: function(result) {
                            console.log('Pembayaran Gagal:', result);
                            alert("Pembayaran gagal.");
                            updateOrderInFirestore(orderId, id_user, productId, currentQuantity, totalAmount, "failed");
                        },
                        onClose: function() {
                            console.log('Pop-up ditutup.');
                        }
                    });
                } catch (error) {
                    console.error("Error:", error);
                    alert("Pembayaran gagal. Silakan coba lagi.");
                }
            });
        } else {
            console.error("Produk tidak ditemukan di Firestore.");
            alert("Produk tidak ditemukan.");
        }
    } catch (error) {
        console.error("Terjadi kesalahan:", error);
        alert("Terjadi kesalahan saat memuat data produk.");
    }
});
