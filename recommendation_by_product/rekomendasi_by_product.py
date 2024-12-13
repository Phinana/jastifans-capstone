from flask import Flask, request, jsonify
import pandas as pd
from joblib import load
import os
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from sklearn.metrics.pairwise import cosine_similarity

# Inisialisasi aplikasi Flask
app = Flask(__name__)

# Menambahkan CORS untuk semua domain
CORS(app, resources={r"/*": {"origins": "*"}})

# Firebase initialization
cred = credentials.Certificate("capstone-442413-firebase-adminsdk-m2t6m-60be223e62.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load model dan data produk
combined_similarity = load('./model/rekom_byproduk.joblib')
vectorizer = load('./model/tfidf_vectorizer.joblib')
scaler = load('./model/scaler.joblib')

# Membaca data produk dari file Excel
file_path = './dataset/Data Produk Justifans.xlsx'
products = pd.read_excel(file_path)

# Normalisasi data (contoh jika perlu)
products['kategori_artis'] = products['kategori_artis'].str.lower()
products['kategori_produk'] = products['kategori_produk'].str.lower()

# Fungsi untuk mengambil semua kategori artis yang ada di Firestore
def get_all_categories_from_firestore():
    categories_ref = db.collection('detail-jastip').distinct('kategori_artis')
    categories = [category['kategori_artis'] for category in categories_ref.stream()]
    return categories

# Fungsi untuk memeriksa apakah query terkait dengan kategori tertentu
def check_for_category_in_query(user_query):
    categories = get_all_categories_from_firestore()  # Ambil kategori secara dinamis dari Firestore
    for category in categories:
        if category.lower() in user_query.lower():
            return category  # Mengembalikan kategori yang ditemukan
    return None  # Tidak ada kategori yang cocok

# Fungsi untuk mengambil semua kategori artis yang ada di Firestore
def get_all_categories_from_firestore():
    # Ambil semua produk dari koleksi 'detail-jastip'
    products_ref = db.collection('detail-jastip')
    products = products_ref.stream()

    # Gunakan set untuk mengambil kategori unik
    categories = set()
    for product in products:
        product_data = product.to_dict()
        if 'kategori_artis' in product_data:
            categories.add(product_data['kategori_artis'])
    
    return list(categories)

# Fungsi untuk memeriksa apakah query terkait dengan kategori tertentu
def check_for_category_in_query(user_query):
    categories = get_all_categories_from_firestore()  # Ambil kategori secara dinamis dari Firestore
    for category in categories:
        if category.lower() in user_query.lower():
            return category  # Mengembalikan kategori yang ditemukan
    return None  # Tidak ada kategori yang cocok

# Fungsi rekomendasi produk berdasarkan query pengguna
def recommend_products_based_on_query(user_query, num_recommendations=10):
    # Periksa apakah query berhubungan dengan kategori
    category = check_for_category_in_query(user_query)
    
    if category:
        # Jika kategori ditemukan, filter produk berdasarkan kategori tersebut di Firestore
        filtered_products_ref = db.collection('detail-jastip').where('kategori_artis', '==', category).limit(num_recommendations)
        filtered_products = filtered_products_ref.stream()

        recommended_product_ids = [product.id for product in filtered_products]
    else:
        # Jika tidak ada kategori yang cocok, lakukan pencocokan biasa berdasarkan deskripsi produk
        query_tfidf = vectorizer.transform([user_query.lower()])
        
        if query_tfidf.shape[1] != combined_similarity.shape[1]:
            return "Dimensi query tidak cocok dengan model."
        
        cosine_similarities = cosine_similarity(query_tfidf, combined_similarity)
        similarity_scores = list(enumerate(cosine_similarities[0]))
        sorted_products = sorted(similarity_scores, key=lambda x: x[1], reverse=True)
        
        # Ambil 10 produk teratas berdasarkan similarity
        recommendations = [product for product in sorted_products if product[1] > 0]
        top_recommendations = recommendations[:num_recommendations]

        recommended_product_ids = [products.iloc[i[0]]['id_produk'] for i in top_recommendations]

    return recommended_product_ids

# Rute rekomendasi produk berdasarkan query
@app.route('/recommend', methods=['POST'])
def recommend():
    user_query = request.json.get('query', None)
    if not user_query:
        return jsonify({'error': 'Query is required'}), 400

    recommended_product_ids = recommend_products_based_on_query(user_query)
    
    if not recommended_product_ids:
        return jsonify({'error': 'No recommendations found'}), 404

    recommended_products = []
    for product_id in recommended_product_ids:
        # Ambil produk dari Firestore untuk menampilkan detail
        product_ref = db.collection('detail-jastip').document(product_id)
        product = product_ref.get()
        if product.exists:
            product_data = product.to_dict()
            recommended_products.append({
                "id": product.id,
                "name": product_data.get('product_name', ''),
                "price": product_data.get('harga', 0),
                "image": product_data.get('gambar_produk', 'placeholder.jpg')
            })
    
    return jsonify({'recommendations': recommended_products})



if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))  # Default ke 8080
    app.run(debug=True, host='0.0.0.0', port=port)
