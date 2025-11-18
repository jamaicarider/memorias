"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    if (!supabase) return;

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
        const { data: publicUrlData } = supabase
          .storage
          .from("memorias")
          .getPublicUrl(f.name);
        return { name: f.name, publicUrl: publicUrlData.publicUrl };
      });

      setFiles(mapped);
    } catch (err) {
      console.error("loadFiles error", err);
      setFiles([]);
    } finally {
      setLoadingList(false);
    }
  };

  const uploadFiles = async (filesList: FileList | null) => {
    if (!filesList || !supabase) return;
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
      console.error("uploadFiles catch:", err);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (name: string) => {
    if (!supabase) return;
    const ok = confirm("Remover esta imagem? Essa ação é irreversível.");
    if (!ok) return;

    try {
      const { error } = await supabase.storage.from("memorias").remove([name]);
      if (error) {
        console.error("remove error:", error);
        return;
      }
      await loadFiles();
    } catch (err) {
      console.error("remove catch:", err);
    }
  };

  if (authChecked === null) return null;

  if (!authChecked) {
    return (
      <div style={styles.root}>
        <div style={styles.centerCard}>
          <div style={styles.brand}>lived</div>
          <div style={{ marginTop: 18, color: "rgba(0,0,0,0.85)" }}>
            insira a senha para acessar
          </div>

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

          {authError && <div style={styles.error}>{authError}</div>}

          <div style={styles.smallNote}>powered by supabase</div>
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
            onClick={() => {
              const input = document.getElementById("fileInput") as HTMLInputElement | null;
              input?.click();
            }}
            style={styles.add}
            aria-label="add images"
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
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => uploadFiles(e.target.files ?? null)}
        style={{ display: "none" }}
      />

      <main style={styles.main}>
        <div style={styles.grid}>
          {loadingList ? (
            <div style={styles.loading}>loading…</div>
          ) : files.length === 0 ? (
            <div style={styles.empty}>no images yet — + add to start</div>
          ) : (
            files.map((f, idx) => (
              <div key={f.name} style={styles.cell}>
                <div style={styles.index}>({String(idx + 1).padStart(3, "0")})</div>

                <div
                  style={styles.imageWrap}
                  onClick={() => {
                    setModalSrc(f.publicUrl);
                  }}
                >
                  <img src={f.publicUrl} alt={f.name} style={styles.image} />
                </div>

                <div style={styles.meta}>
                  <div style={styles.title}>untitled</div>
                  <div style={styles.subtitle}>object 2024</div>
                  <div style={styles.deleteRow}>
                    <button style={styles.deleteBtn} onClick={() => removeFile(f.name)}>
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
  page: { minHeight: "100vh", background: "#fff", color: "#000", fontFamily: "Helvetica, Arial, sans-serif", padding: "48px 64px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  left: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 },
  centerNav: { display: "flex", alignItems: "center", gap: 12 },
  navItem: { fontSize: 11, opacity: 0.7, textTransform: "lowercase" },
  right: { display: "flex", gap: 12, alignItems: "center" },
  add: { fontSize: 13, padding: "6px 8px", borderRadius: 8, background: "transparent", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", fontWeight: 700, color: "#000" },
  smallLink: { background: "transparent", border: "none", cursor: "pointer", color: "#000", fontSize: 11, opacity: 0.8 },

  main: { display: "flex", justifyContent: "center" },
  grid: { width: "100%", maxWidth: 1300, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", columnGap: 40, rowGap: 120, alignItems: "start" },
  loading: { gridColumn: "1 / -1", textAlign: "center", opacity: 0.6 },
  empty: { gridColumn: "1 / -1", textAlign: "center", opacity: 0.6 },

  cell: { display: "flex", flexDirection: "column", gap: 10 },
  index: { fontSize: 11, opacity: 0.6, textTransform: "lowercase" },
  imageWrap: { width: "100%", height: 160, background: "#f4f4f4", display: "block", borderRadius: 4, overflow: "hidden", cursor: "pointer" },
  image: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  meta: { marginTop: 6, display: "flex", flexDirection: "column", gap: 4 },
  title: { fontSize: 12, fontWeight: 600, textTransform: "lowercase" },
  subtitle: { fontSize: 10, opacity: 0.6, textTransform: "lowercase" },
  deleteRow: { marginTop: 6 },
  deleteBtn: { background: "transparent", border: "none", color: "rgba(0,0,0,0.6)", fontSize: 11, cursor: "pointer", textDecoration: "underline" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 60 },
  modalInner: { maxWidth: "90vw", maxHeight: "90vh", background: "#fff", padding: 12, borderRadius: 8 },
  modalImage: { display: "block", maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain" },
  modalClose: { display: "block", marginTop: 8, background: "transparent", border: "1px solid rgba(0,0,0,0.08)", padding: "6px 8px", borderRadius: 6, cursor: "pointer" },

  centerCard: { width: "min(420px, 92%)", margin: "10vh auto", background: "transparent", padding: 24, borderRadius: 6, textAlign: "center" },
  input: { marginTop: 18, width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.06)", background: "transparent", color: "#000" },
  btn: { marginTop: 12, padding: "10px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.06)", color: "#000", fontWeight: 700, textTransform: "lowercase" },
  error: { marginTop: 10, color: "#b33" },
  smallNote: { marginTop: 14, fontSize: 12, opacity: 0.7 },
};
