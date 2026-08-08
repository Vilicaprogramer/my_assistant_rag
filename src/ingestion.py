import os

from glob import glob

from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader, TextLoader

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_community.vectorstores import Chroma

from langchain_google_genai import GoogleGenerativeAIEmbeddings



load_dotenv()



def get_loader(file_path):

    """

    Retorna el cargador apropiado segun la extension del archivo.

    """

    ext = os.path.splitext(file_path)[1].lower()

    if ext == '.pdf':

        return PyPDFLoader(file_path)

    elif ext in ['.txt', '.md']:

        return TextLoader(file_path, encoding='utf-8')

    return None



def load_document(file_path):

    """

    Carga un documento usando el cargador adecuado y retorna su contenido.

    """

    loader = get_loader(file_path)

    if not loader:

        print(f"Formato no soportado: {file_path}")

        return []

    try:

        return loader.load()

    except Exception as e:

        print(f"Error al cargar {file_path}: {e}")

        return []



def split_docs(docs):

    """

    Divide los documentos en fragmentos (chunks) usando RecursiveCharacterTextSplitter.

    """

    splitter = RecursiveCharacterTextSplitter(

        chunk_size=1000,

        chunk_overlap=200

    )

    return splitter.split_documents(docs)



def get_embeddings():

    """

    Inicializa y retorna el modelo de embeddings de Google.

    """

    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:

        raise ValueError("GOOGLE_API_KEY no encontrada en las variables de entorno.")

    return GoogleGenerativeAIEmbeddings(

        model="models/gemini-embedding-001",

        google_api_key=api_key

    )



def save_to_chroma(chunks, embeddings, persist_dir):

    """

    Guarda los fragmentos de texto con sus embeddings en ChromaDB.

    """

    if not chunks:

        print("No hay fragmentos para guardar.")

        return None

    db = Chroma.from_documents(

        documents=chunks,

        embedding=embeddings,

        persist_directory=persist_dir

    )

    db.persist()

    print(f"Persistido exitosamente en: {persist_dir}")

    return db



def ingest_all(docs_dir="docs", persist_dir="vector_db"):

    """

    Ejecuta el pipeline completo de ingesta para todos los archivos en docs_dir.

    """

    if not os.path.exists(docs_dir):

        os.makedirs(docs_dir)

        print(f"Creada carpeta vacia: {docs_dir}")

        return 0

       

    search_path = os.path.join(docs_dir, "*")

    files = [f for f in glob(search_path) if os.path.isfile(f)]

    all_chunks = []

   

    for file_path in files:

        docs = load_document(file_path)

        if docs:

            for doc in docs:

                doc.metadata["source"] = os.path.basename(file_path)

                if "page" not in doc.metadata:

                    doc.metadata["page"] = 0

            chunks = split_docs(docs)

            all_chunks.extend(chunks)

            print(f"Procesado: {os.path.basename(file_path)} ({len(chunks)} fragmentos)")

           

    if all_chunks:

        embeddings = get_embeddings()

        save_to_chroma(all_chunks, embeddings, persist_dir)

    return len(all_chunks)





def check_and_auto_ingest(docs_dir="docs", persist_dir="vector_db"):

    """

    Verifica si la base de datos vectorial existe y contiene archivos.

    Si no existe o esta vacia, realiza la ingesta automatica de los documentos.

    """

    db_exists = os.path.exists(persist_dir)

    db_has_files = False

    if db_exists:

        try:

            files = os.listdir(persist_dir)

            if len(files) > 0:

                db_has_files = True

        except Exception:

            pass

           

    if not db_exists or not db_has_files:

        print(f"Base de datos vectorial '{persist_dir}' no encontrada o vacia. Iniciando ingesta automatica...")

        num_chunks = ingest_all(docs_dir=docs_dir, persist_dir=persist_dir)

        print(f"Ingesta automatica completada. {num_chunks} fragmentos indexados.")

    else:

        print(f"Base de datos vectorial '{persist_dir}' detectada con datos. Listo para operar.")

