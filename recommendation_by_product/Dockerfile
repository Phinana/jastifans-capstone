FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Salin file requirements dan install dependencies
COPY requirements.txt /app/
RUN pip install -r requirements.txt

# Salin aplikasi dan data ke dalam container
COPY . /app

# Expose port yang digunakan oleh Flask
EXPOSE 8080

# Jalankan aplikasi
CMD ["python", "rekomendasi_by_product.py"]
