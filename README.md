# 🤖 Asistente RAG: Inteligencia Artificial para Tu Documentación Técnica

> **Transforma cientos de páginas de manuales complejos en un asistente virtual que responde a tus empleados en segundos.**

---

## 🚀 El Desafío de las Pequeñas y Medianas Empresas

En muchos sectores (soporte técnico, consultoría, atención al cliente, procesos industriales o gestión normativa), la información crítica de la empresa suele estar atrapada en decenas de archivos PDF, manuales de usuario y guías extensas. 

Esto genera problemas diarios:
* ⏱️ **Pérdida de tiempo:** Los empleados invierten minutos u horas buscando un dato específico entre cientos de páginas.
* 📉 **Cuellos de botella:** La curva de aprendizaje para nuevos trabajadores es lenta y requiere interrumpir a personal sénior.
* ❌ **Errores de procedimiento:** Consultar documentación desactualizada o malinterpretar un manual largo provoca errores operativos.

---

## 💡 La Solución: Un Asistente Virtual Basado en Tus Propios Manuales

Esta herramienta utiliza arquitectura **RAG (Retrieval-Augmented Generation)** conectada a la tecnología de Google Gemini. Funciona como un **buscador inteligente y conversacional** exclusivo para la documentación interna de tu empresa.

### ¿Qué aporta a tu negocio?

1. **Respuestas Inmediatas y Exactas**
   En lugar de buscar por palabras clave dentro de un PDF, el usuario formula una pregunta en lenguaje natural ("*¿Cómo se configura el puerto en el modelo X?*") y recibe una respuesta estructurada al instante.

2. **Cita de Fuentes y Páginas exactas**
   El sistema no solo responde, sino que indica el **archivo de origen y el número de página exacto** donde se encuentra la información, permitiendo verificar cualquier dato al momento.

3. **Cero Alucinaciones (Respuestas Confiables)**
   El asistente está programado con reglas strictly: **solo responde utilizando la información presente en tus manuales**. Si un tema no está documentado, lo indicará en lugar de inventar la respuesta.

4. **Automatización "Sin Esfuerzo"**
   Simplemente coloca los nuevos archivos en PDF, TXT o Markdown en la carpeta asignada y la aplicación procesará, dividirá e indexará todo el contenido de forma automática al arrancar.

---

## 🎯 Casos de Uso Prácticos

* **Soporte Técnico y Mantenimiento:** Diagnóstico rápido de averías según el manual del fabricante sin hojear el libro físico.
* **Onboarding e Incorporación de Empleados:** Los nuevos contratados pueden resolver sus dudas sobre procesos internos de inmediato.
* **Cumplimiento Normativo y Legal:** Consulta rápida de reglamentos internos, contratos tipo o manuales de prevención.
* **Atención al Cliente Interna:** Ayuda al personal de ventas a responder preguntas técnicas avanzadas de clientes durante una llamada.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto combina varias de las herramientas más sólidas del ecosistema de IA actual:

* **Backend:** Flask (Python)
* **Orquestación de IA:** LangChain y LangGraph
* **Base de Datos Vectorial:** ChromaDB
* **Modelos de IA:** Google Gemini (Embeddings para indexación + Gemini Flash/Pro para generación de respuestas)

---

## 📋 Requisitos Previos e Instalación

### 1. Requisitos
* Python 3.10 o superior instalado.
* Una clave API gratuita de [Google AI Studio](https://aistudio.google.com/).

### 2. Configuración Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/Vilicaprogramer/my_assistant_rag.git](https://github.com/Vilicaprogramer/my_assistant_rag.git)
   cd my_assistant_rag

2. **Crear y activar un entorno virtual:**
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En Linux/Mac:
   source venv/bin/activate

3. **Instalar dependencias:**
    ```bash
    pip install -r requirements.txt

4. **Configurar las variables de entorno:**
Crea un archivo llamado .env en la raíz del proyecto y añade tu clave API:
    ```bash
    GOOGLE_API_KEY=tu_clave_api_aqui
    FLASK_SECRET_KEY=clave_secreta_para_flask

---

## Uso de la Aplicación
1. **Añade tus documentos:**
Coloca tus manuales en formato PDF, TXT o MD dentro de la carpeta docs/.

2. **Inicia el servidor:**

```bash
    python app.py
```
3. **Accede al chat:**
Abre tu navegador en http://127.0.0.1:5000 y empieza a consultar tu documentación mediante una interfaz web sencilla e intuitiva.