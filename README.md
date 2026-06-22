# 🌍 GeoFace - Sistema de Asistencia Biométrica Georreferenciada

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-14354C?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)

**GeoFace** es una solución empresarial de código abierto diseñada para gestionar la asistencia del personal mediante la combinación de **Reconocimiento Facial por Inteligencia Artificial** (DeepFace) y validación de **Cercas Geográficas** (Geofencing).

Este repositorio contiene tanto la aplicación móvil (Frontend) como el motor de Inteligencia Artificial y la base de datos (Backend Dockerizado).

---

## ✨ Características Principales

* 👤 **Enrolamiento Facial Autónomo:** Los empleados registran su rostro directamente desde su celular bajo la supervisión tecnológica del modelo de IA `Facenet512`.
* 📍 **Control Georreferenciado:** Verificación estricta por GPS. El sistema valida que el empleado se encuentre dentro del "radio permitido" de su zona de trabajo antes de autorizar el fichaje.
* 🛡️ **Anti-Spoofing Integrado:** Evita suplantaciones de identidad rechazando fotografías o pantallas de celulares mediante detección biométrica de vida.
* ☁️ **Sincronización en la Nube:** Base de datos PostgreSQL centralizada para consultar la asistencia de toda la empresa en tiempo real.
* 👮 **Panel de Administración Segura:** Interfaz protegida para gestionar roles, zonas de trabajo y purgar registros antiguos.
* 🎨 **Diseño Premium:** Interfaz construida con tecnología *Glassmorphism* y micro-animaciones fluidas a 60FPS.

---

## 🏗️ Arquitectura Tecnológica

El sistema está dividido en dos grandes cerebros:

1. **Frontend (App Móvil):** Construida con `React Native` y `Expo`. Gestiona la captura en tiempo real, compresión de imágenes, cálculos de distancias por GPS (Fórmula de Haversine) y almacenamiento local asíncrono.
2. **Backend (Servidor AI):** Construido con `Python` y `FastAPI`. Despliega un contenedor de `Docker` equipado con la librería **DeepFace** y OpenCV para extraer *embeddings* faciales en milisegundos.

---

## 🚀 Guía de Instalación y Despliegue

### 1. Requisitos Previos
* Node.js v18+ y npm/yarn
* Docker y Docker Compose (Para el servidor de Inteligencia Artificial)
* Expo Go (en tu dispositivo móvil Android/iOS)

### 2. Levantar el Backend (Motor de IA y Base de Datos)
El servidor utiliza la potencia de Docker para orquestar la Inteligencia Artificial y PostgreSQL sin que tengas que instalar complejas dependencias de Python en tu sistema.

```bash
# Entra a la carpeta del servidor
cd face-server

# Crea el archivo de variables de entorno a partir de la plantilla
cp .env.example .env
# Opcional: Edita el archivo .env para poner tus contraseñas seguras

# Levanta la base de datos y la IA en segundo plano
docker-compose up -d --build
```
> **Nota:** La primera vez que levantes el contenedor, tardará unos minutos en descargar los pesos neuronales de DeepFace (~150MB).

### 3. Levantar la App Móvil (Frontend)
Abre otra terminal en la raíz del proyecto para iniciar el servidor de desarrollo de React Native.

```bash
# Instalar dependencias
npm install

# Iniciar Expo
npx expo start
```

### 4. Conectar la App al Servidor
1. Escanea el código QR con **Expo Go** en tu celular.
2. En la pantalla de inicio de sesión de la aplicación, toca el icono de **"Servidor"** ⚙️ en la esquina superior derecha.
3. Ingresa la **Dirección IP local** de tu computadora (ej. `192.168.1.50`) para enlazar el celular con tu base de datos de Docker.

---

## 🔒 Consideraciones de Seguridad para Producción
Este repositorio viene saneado por defecto, pero si planeas salir a un entorno corporativo real:
- **No utilices** contraseñas por defecto. Modifica tu `.env`.
- Implementa certificados **SSL/HTTPS** utilizando un proxy inverso (como NGINX o Traefik) delante del contenedor de FastAPI para cifrar las fotografías biométricas en tránsito.
- El sistema cuenta con **Rate Limiting** para bloquear ataques de fuerza bruta en el panel de administrador.

---

## 📄 Licencia
Este proyecto es de código abierto. Siéntete libre de clonarlo, modificarlo y adaptarlo a las necesidades de tu empresa.
