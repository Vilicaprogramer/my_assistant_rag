import os

from typing import TypedDict, List, Dict, Any

from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from langgraph.graph import StateGraph, END



load_dotenv()



class RAGState(TypedDict):

    question: str

    context: List[Any]

    response: str

    sources: List[Dict[str, Any]]



def get_vectorstore(persist_dir: str = "vector_db") -> Chroma:

    """

    Carga la base de datos vectorial Chroma existente con los embeddings de Google.

    """

    api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:

        raise ValueError("GOOGLE_API_KEY no encontrada.")

    embeddings = GoogleGenerativeAIEmbeddings(

        model="models/gemini-embedding-001",

        google_api_key=api_key

    )

    return Chroma(persist_directory=persist_dir, embedding_function=embeddings)



def retrieve_docs(state: RAGState) -> Dict[str, Any]:

    """

    Nodo del grafo: Recupera los documentos mas relevantes de ChromaDB.

    """

    vectorstore = get_vectorstore()

    retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

    docs = retriever.get_relevant_documents(state["question"])

    return {"context": docs}



def get_doc_files(docs_dir: str = "docs") -> List[str]:

    """

    Retorna una lista con los nombres de los archivos en el directorio de documentos.

    """

    if not os.path.exists(docs_dir):

        return []

    return [f for f in os.listdir(docs_dir) if os.path.isfile(os.path.join(docs_dir, f))]



def format_context(context: List[Any]) -> str:

    """

    Formatea el contexto de documentos recuperados.

    """

    return "\n\n".join(

        [f"[Doc: {doc.metadata.get('source', 'Desconocido')} - Pag: {doc.metadata.get('page', 0)}]\n{doc.page_content}"

         for doc in context]

    )



def build_system_prompt(context_str: str) -> str:

    """

    Construye el prompt del sistema incluyendo la lista de documentos.

    """

    docs_list = get_doc_files("docs")

    docs_str = ", ".join(docs_list) if docs_list else "ninguno"

   

    return (

        f"Eres un asistente experto. Tu conocimiento proviene de estos manuales: {docs_str}. "

        "Usa la información proporcionada en el CONTEXTO para elaborar una respuesta detallada, útil y razonada. "

        "Si la respuesta se puede deducir del contexto, respóndela con confianza. "

        "Solo si el tema es completamente ajeno al contexto, debes responder EXACTAMENTE con la frase: "

        "'Lo siento, no puedo responder a esa pregunta, está fuera del alcance de la documentación provista.'\n\n"
        "REGLAS DE FORMATO OBLIGATORIAS:\n"
        "1. Usa Markdown claro y estructurado para responder.\n"
        "2. Utiliza encabezados de nivel 3 (###) para separar secciones principales.\n"
        "3. Si enumeras elementos o listas, coloca CADA elemento en una NUEVA LÍNEA usando viñetas (* o -).\n"
        "4. Deja un doble salto de línea entre párrafos y secciones para que el texto sea legible.\n"
        "5. Resalta nombres de secciones, páginas o términos clave usando **negrita**.\n"

        f"CONTEXTO:\n{context_str}"

    )



def generate_answer(state: RAGState) -> Dict[str, Any]:

    """

    Nodo del grafo: Genera la respuesta usando Gemini basandose solo en el contexto.

    """

    api_key = os.getenv("GOOGLE_API_KEY")

    llm = ChatGoogleGenerativeAI(

        model="gemini-2.5-flash",

        convert_system_message_to_human=True,

        google_api_key=api_key,

        temperature=0.0

    )

    context_str = format_context(state["context"])

    system_prompt = build_system_prompt(context_str)

   

    messages = [

        ("system", system_prompt),

        ("human", state["question"])

    ]

   

    response = llm.invoke(messages)

   

    sources = []

    seen = set()

    for doc in state["context"]:

        src = doc.metadata.get("source", "Desconocido")

        page = doc.metadata.get("page", 0)

        key = (src, page)

        if key not in seen:

            seen.add(key)

            sources.append({"source": src, "page": page})

           

    return {"response": response.content, "sources": sources}



def build_graph() -> StateGraph:

    """

    Construye y compila el grafo de estados de LangGraph.

    """

    workflow = StateGraph(RAGState)

    workflow.add_node("retrieve_docs", retrieve_docs)

    workflow.add_node("generate_answer", generate_answer)

    workflow.set_entry_point("retrieve_docs")

    workflow.add_edge("retrieve_docs", "generate_answer")

    workflow.add_edge("generate_answer", END)

    return workflow.compile()



def query_rag(question: str) -> Dict[str, Any]:

    """

    Ejecuta el grafo de estados con la pregunta indicada y retorna los resultados.

    """

    graph = build_graph()

    inputs = {

        "question": question,

        "context": [],

        "response": "",

        "sources": []

    }

    result = graph.invoke(inputs)

    return {

        "response": result.get("response", ""),

        "sources": result.get("sources", [])

    }