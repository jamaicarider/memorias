"use client";

import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

type MemoriaFile = { name: string; publicUrl: string };

export default function Home() {
  const [files, setFiles] = useState<MemoriaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [authChecked, setAuthChecked] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    const ok = localStorage.getItem("memoria_auth") === "1";
    setAuthChecked(ok);
    if (ok) loadFiles();
  }, []);

  const doAuth = async (pw: string) => {
    setAuthError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res.json();
      if (json.ok) {
        localStorage.setItem("memoria_auth", "1");
        setAuthChecked(true);
        loadFiles();
      } else {
        setAuthError(json.error ?? "Senha inválida");
      }
    } catch {
      setAuthError("Erro ao validar senha");
    }
  };

  const logout = () => {
    localStorage.removeItem("memoria_auth");
    setAuthChecked(false);
  };

  const loadFiles = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase.storage.from("memorias").list("", {
        limit: 1000,
        sortBy: { column: "name", order: "desc" },
      });
      if (error) {
        console.error("list error", error);
        setFiles([]);
        return;
      }
      if (!data) {
        setFiles([]);
        return;
      }

      const mapped: MemoriaFile[] = data.map((f) => {
        const publicUrl = supabase.storage.from("memorias").getPublicUrl(f.name).data.publicUrl;
        return { name: f.name, publicUrl };
      });

      setFiles(mapped);
    } catch (err) {
      console.error("loadFiles", err);
      setFiles([]);
    } finally {
      setLoadingList(false);
    }
  };

  const uploadFiles = async (filesList: FileList | null) => {
    if (!filesList) return;
    setUploading(true);
    try {
      for (const f of Array.from(filesList)) {
        const file = f as File;
        const fileName = `${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("memorias")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });
        if (error) console.error("upload error:", error);
      }
      await loadFiles();
    } catch (err) {
      console.error("uploadFiles error", err);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (name: string) => {
    const ok = confirm("Remover esta imagem? Essa ação é irreversível.");
    if (!ok) return;

    const { error } = await supabase.storage.from("memorias").remove([name]);
    if (error) {
      console.error("remove error", error);
      return;
    }
    await loadFiles();
  };

  if (authChecked === null) return null;

  if (!authChecked) {
    return (
      <div style={styles.authPage}>
        <div style={styles.authCard}>
          <h1 style={styles.brand}>lived</h1>
          <p>insira a senha para acessar</p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doAuth(passwordInput)}
            style={styles.input}
            placeholder="senha"
            autoFocus
          />
          <button onClick={() => doAuth(passwordInput)} style={styles.btn}>
            entrar
          </button>
          {authError && <p style={styles.error}>{authError}</p>}
          <p style={styles.smallNote}>powered by supabase</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.left}>lived</div>
        <nav style={styles.centerNav}>
          <span style={styles.navItem}>▼ archive</span>
          <span style={{ ...styles.navItem, marginLeft: 24 }}>▶ ongoing</span>
        </nav>
        <div style={styles.right}>
          <button
            onClick={() => document.getElementById("fileInput")?.click()}
            style={styles.add}
            title="+ add"
          >
            + add
          </button>
          <button onClick={logout} style={styles.smallLink}>
            ▲ info
          </button>
        </div>
      </header>

      <input
        id="fileInput"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => uploadFiles(e.target.files)}
        style={{ display: "none" }}
      />

      <main style={styles.main}>
        {loadingList ? (
          <p style={styles.loading}>loading…</p>
        ) : files.length === 0 ? (
          <p style={styles.empty}>no images yet — + add to start</p>
        ) : (
          <div style={styles.grid}>
            {files.map((f, idx) => (
              <div key={f.name} style={styles.cell}>
                <div style={styles.index}>({String(idx + 1).padStart(3, "0")})</div>
                <div style={styles.imageWrap} onClick={() => setModalSrc(f.publicUrl)}>
                  <img src={f.publicUrl} alt={f.name} style={styles.image} />
                </div>
                <div style={styles.meta}>
                  <div style={styles.title}>{f.name}</div>
                  <div style={styles.deleteRow}>
                    <button style={styles.deleteBtn} onClick={() => removeFile(f.name)}>
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalSrc && (
        <div style={styles.modalOverlay} onClick={() => setModalSrc(null)}>
          <div style={styles.modalInner} onClick={(e) => e.stopPropagation()}>
            <img src={modalSrc} alt="preview" style={styles.modalImage} />
            <button style={styles.modalClose} onClick={() => setModalSrc(null)}>
              close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    fontFamily: "Helvetica, Arial, sans-serif",
    background: "#fff",
    color: "#000",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  left: { fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  centerNav: { display: "flex", alignItems: "center", gap: 12 },
  navItem: { fontSize: 12, opacity: 0.7 },
  right: { display: "flex", gap: 12, alignItems: "center", marginTop: 12 },
  add: {
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 700,
  },
  smallLink: { border: "none", background: "transparent", cursor: "pointer", fontSize: 11 },
  main: { display: "flex", justifyContent: "center", flexDirection: "column" },
  loading: { textAlign: "center", opacity: 0.6 },
  empty: { textAlign: "center", opacity: 0.6 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 16,
  },
  cell: { display: "flex", flexDirection: "column", gap: 6 },
  index: { fontSize: 10, opacity: 0.6 },
  imageWrap: {
    width: "100%",
    aspectRatio: "1/1",
    overflow: "hidden",
    borderRadius: 6,
    cursor: "pointer",
    background: "#f4f4f4",
  },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  meta: { display: "flex", flexDirection: "column", gap: 4 },
  title: { fontSize: 12, fontWeight: 600, wordBreak: "break-word" },
  deleteRow: {},
  deleteBtn: { background: "transparent", border: "none", color: "#b33", cursor: "pointer", fontSize: 11 },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  modalInner: { maxWidth: "90vw", maxHeight: "90vh", padding: 8, borderRadius: 6, background: "#fff" },
  modalImage: { maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain" },
  modalClose: { marginTop: 8, padding: "6px 10px", cursor: "pointer" },
  authPage: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" },
  authCard: { padding: 24, borderRadius: 8, width: "90%", maxWidth: 400, textAlign: "center", background: "#fff" },
  brand: { fontSize: 24, fontWeight: 700 },
  input: { width: "100%", padding: 10, marginTop: 12, borderRadius: 6, border: "1px solid #ccc" },
  btn: { marginTop: 12, padding: "10px 14px", borderRadius: 6, cursor: "pointer", fontWeight: 700 },
  error: { color: "#b33", marginTop: 10 },
  smallNote: { marginTop: 14, fontSize: 12, opacity: 0.7 },
};
