"use client";
import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

const EMPTY_FORM = { name: "", category: "tops", frontData: null, backData: null };

async function resizeImage(dataUrl, maxWidth = 1200) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

const CATS = {
  tops: "Top", bottoms: "Bottom", outerwear: "Outer",
  shoes: "Shoes", accessories: "Acc.", dresses: "Dress", other: "Other",
};

export default function AppPage() {
  const { user, isLoaded } = useUser();
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("wardrobe");
  const [outfits, setOutfits] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [previewSide, setPreviewSide] = useState("front");
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [activeUpload, setActiveUpload] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (!isLoaded || !user) return;
    supabase
      .from("wardrobe_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Load error:", error);
        else setWardrobe(data || []);
        setLoading(false);
        // Delay mounted for stagger entry
        setTimeout(() => setMounted(true), 50);
      });
  }, [isLoaded, user]);

  const normalizeItem = (item) => ({
    ...item,
    imageData: item.image_data || item.imageData,
    backData: item.back_data || item.backData,
  });

  const handleAdd = async () => {
    if (!addForm.name || !addForm.frontData) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("wardrobe_items")
        .insert([{ name: addForm.name, category: addForm.category, image_data: addForm.frontData, back_data: addForm.backData || null, dirty: false, user_id: user.id }])
        .select().single();
      if (error) throw error;
      setWardrobe(w => [...w, normalizeItem(data)]);
      setAddForm({ ...EMPTY_FORM });
      setView("wardrobe");
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDirty = async (id) => {
    const item = wardrobe.find(i => i.id === id);
    const newDirty = !item.dirty;
    setWardrobe(w => w.map(i => i.id === id ? { ...i, dirty: newDirty } : i));
    await supabase.from("wardrobe_items").update({ dirty: newDirty }).eq("id", id).eq("user_id", user.id);
  };

  const removeItem = async (id) => {
    setWardrobe(w => w.filter(i => i.id !== id));
    await supabase.from("wardrobe_items").delete().eq("id", id).eq("user_id", user.id);
  };

  const triggerUpload = (side) => {
    setActiveUpload(side);
    fileRef.current.value = "";
    fileRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const resized = await resizeImage(ev.target.result, 1200);
      if (activeUpload === "front") setAddForm(f => ({ ...f, frontData: resized }));
      if (activeUpload === "back") setAddForm(f => ({ ...f, backData: resized }));
    };
    reader.readAsDataURL(file);
  };

  const generateOutfits = async () => {
    const clean = wardrobe.filter(i => !i.dirty);
    if (clean.length < 2) { alert("Add at least 2 clean items first!"); return; }
    setGenerating(true); setOutfits([]); setGenError(""); setView("outfits");
    const limited = clean.slice(0, 6);
    const imageContent = limited.map(item => ({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: (item.imageData || item.image_data).split(",")[1] }
    }));
    const itemList = limited.map((it, i) => `${i + 1}. ID=${it.id} | "${it.name}" | ${it.category}`).join("\n");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1500,
          messages: [{ role: "user", content: [...imageContent, { type: "text", text: `You are an expert fashion stylist. Here are ${limited.length} clothing items:\n\n${itemList}\n\nCreate 4 stylish outfit combinations. Return ONLY raw JSON:\n{"outfits":[{"name":"string","itemIds":[number,number],"description":"string","styleScore":8,"tips":"string"}]}` }] }]
        })
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const rawText = data.content?.find(b => b.type === "text")?.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]);
      const enriched = parsed.outfits
        .map(o => ({ ...o, items: (o.itemIds || []).map(id => clean.find(i => i.id === id)).filter(Boolean) }))
        .filter(o => o.items.length > 0)
        .sort((a, b) => b.styleScore - a.styleScore);
      setOutfits(enriched);
    } catch (err) {
      setGenError(err.message || "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  const cleanCount = wardrobe.filter(i => !i.dirty).length;
  const dirtyCount = wardrobe.filter(i => i.dirty).length;

  if (!isLoaded || loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        {/* Fast spinner — perceived performance: faster spin = feels faster */}
        <div style={{ width: 20, height: 20, border: "1.5px solid #e5e5e5", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.5s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <span style={{ fontSize: 12, color: "#bbb", letterSpacing: "-0.01em" }}>Loading</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        /* Custom easing curves from Emil's skill */
        :root {
          --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
          --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
          --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
        }

        @keyframes spin { to { transform: rotate(360deg) } }

        /* Entry: scale from 0.95 not 0 — nothing in the real world appears from nothing */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }

        /* Bottom sheet: slides in from bottom */
        @keyframes sheetIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        * { box-sizing: border-box; }

        /* Buttons must feel responsive — 160ms, scale(0.97) on :active */
        .btn {
          transition: background 150ms ease, color 150ms ease, border-color 150ms ease, transform 160ms var(--ease-out), box-shadow 160ms ease;
        }
        .btn:active { transform: scale(0.97); }

        /* Hover only on pointer devices — prevents false positives on touch */
        @media (hover: hover) and (pointer: fine) {
          .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
          .upload-zone:hover { border-color: #aaa !important; }
        }

        /* Stagger: wardrobe grid items */
        .grid-item { opacity: 0; animation: fadeUp 240ms var(--ease-out) forwards; }
        .grid-item:nth-child(1)  { animation-delay: 0ms; }
        .grid-item:nth-child(2)  { animation-delay: 40ms; }
        .grid-item:nth-child(3)  { animation-delay: 80ms; }
        .grid-item:nth-child(4)  { animation-delay: 120ms; }
        .grid-item:nth-child(5)  { animation-delay: 160ms; }
        .grid-item:nth-child(6)  { animation-delay: 200ms; }
        .grid-item:nth-child(7)  { animation-delay: 240ms; }
        .grid-item:nth-child(8)  { animation-delay: 280ms; }
        .grid-item:nth-child(n+9) { animation-delay: 320ms; }

        /* Outfit cards stagger */
        .outfit-card { opacity: 0; animation: fadeUp 220ms var(--ease-out) forwards; }
        .outfit-card:nth-child(1) { animation-delay: 0ms; }
        .outfit-card:nth-child(2) { animation-delay: 60ms; }
        .outfit-card:nth-child(3) { animation-delay: 120ms; }
        .outfit-card:nth-child(4) { animation-delay: 180ms; }

        /* View transitions */
        .view-enter { opacity: 0; transform: translateY(4px) scale(0.99); animation: fadeUp 200ms var(--ease-out) forwards; }

        /* Input focus */
        input:focus, select:focus { outline: none; border-color: #0a0a0a !important; }

        /* Blur transitions for button content state changes */
        .btn-content { transition: filter 200ms ease, opacity 200ms ease; }
        .btn-content.saving { filter: blur(1px); opacity: 0.6; }

        /* prefers-reduced-motion: keep opacity transitions, remove movement */
        @media (prefers-reduced-motion: reduce) {
          .grid-item, .outfit-card, .view-enter {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          @keyframes sheetIn { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>

      {/* Header — no animation on nav, used constantly */}
      <header style={{ background: "rgba(250,250,250,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #e5e5e5", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.03em", color: "#0a0a0a" }}>
          wore<span style={{ color: "#c8f55a" }}>.</span>
        </span>
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {[
            { key: "wardrobe", label: "Closet" },
            { key: "add", label: "Add" },
            { key: "outfits", label: "Outfits" }
          ].map(tab => (
            <button
              key={tab.key}
              className="btn"
              onClick={() => tab.key === "outfits" ? generateOutfits() : setView(tab.key)}
              style={{
                background: view === tab.key ? "#0a0a0a" : "transparent",
                color: view === tab.key ? "#fafafa" : "#666",
                border: "none", borderRadius: 6,
                padding: "5px 12px", fontSize: 13, fontWeight: 500,
                cursor: "pointer", letterSpacing: "-0.01em",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Stats */}
      {view === "wardrobe" && wardrobe.length > 0 && (
        <div style={{ borderBottom: "1px solid #e5e5e5", padding: "10px 24px", display: "flex", gap: 24, background: "#fafafa" }}>
          {[
            { label: "Total", value: wardrobe.length, color: "#0a0a0a" },
            { label: "Clean", value: cleanCount, color: "#16a34a" },
            { label: "In wash", value: dirtyCount, color: "#dc2626" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.04em", color: s.color, transition: "color 200ms ease" }}>{s.value}</span>
              <span style={{ fontSize: 11, color: "#aaa", letterSpacing: "-0.01em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "28px 24px" }}>

        {/* Wardrobe */}
        {view === "wardrobe" && (
          wardrobe.length === 0 ? (
            <div className="view-enter" style={{ textAlign: "center", padding: "80px 0" }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 4, letterSpacing: "-0.01em" }}>Your closet is empty</div>
              <div style={{ fontSize: 12, color: "#d4d4d4", marginBottom: 28 }}>Add your first item to get started</div>
              <button className="btn" onClick={() => setView("add")} style={btnPrimary}>Add item</button>
            </div>
          ) : (
            <div className="view-enter">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h1 style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em", margin: 0 }}>Closet</h1>
                <button className="btn" onClick={() => setView("add")} style={btnSecondary}>+ Add</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 8 }}>
                {wardrobe.map((item, idx) => (
                  <div
                    key={item.id}
                    className="card grid-item"
                    style={{ background: "#fff", borderRadius: 10, overflow: "hidden", border: item.dirty ? "1px solid #fecaca" : "1px solid #e5e5e5", transition: "box-shadow 200ms ease" }}
                  >
                    <div
                      onClick={() => { setPreviewItem(normalizeItem(item)); setPreviewSide("front"); }}
                      style={{ position: "relative", cursor: "pointer" }}
                    >
                      <img src={item.image_data || item.imageData} alt={item.name} style={{ width: "100%", height: 148, objectFit: "cover", display: "block" }} />
                      {item.dirty && (
                        <div style={{ position: "absolute", top: 7, left: 7, background: "rgba(10,10,10,0.8)", color: "#fca5a5", fontSize: 9, fontWeight: 500, borderRadius: 4, padding: "2px 6px", backdropFilter: "blur(4px)", letterSpacing: "0.02em" }}>In wash</div>
                      )}
                    </div>
                    <div style={{ padding: "9px 10px 8px" }}>
                      <div style={{ fontWeight: 500, fontSize: 12, color: "#0a0a0a", marginBottom: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "#bbb", marginBottom: 7, letterSpacing: "-0.01em" }}>{CATS[item.category] || item.category}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn"
                          onClick={() => toggleDirty(item.id)}
                          style={{ flex: 1, border: "1px solid #e5e5e5", background: "#fafafa", borderRadius: 5, padding: "5px 0", cursor: "pointer", fontSize: 11, fontWeight: 500, color: item.dirty ? "#dc2626" : "#16a34a", letterSpacing: "-0.01em", transition: "color 150ms ease, background 150ms ease, transform 160ms var(--ease-out)" }}
                        >
                          {item.dirty ? "Dirty" : "Clean"}
                        </button>
                        <button
                          className="btn"
                          onClick={() => removeItem(item.id)}
                          style={{ border: "1px solid #e5e5e5", background: "#fafafa", borderRadius: 5, padding: "5px 8px", cursor: "pointer", fontSize: 12, color: "#d4d4d4", fontFamily: "inherit" }}
                        >×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Add */}
        {view === "add" && (
          <div className="view-enter" style={{ maxWidth: 400 }}>
            <h1 style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em", marginBottom: 20, marginTop: 0 }}>Add item</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { side: "front", label: "Front", required: true, data: addForm.frontData },
                { side: "back", label: "Back", required: false, data: addForm.backData }
              ].map(({ side, label, required, data }) => (
                <div
                  key={side}
                  className="btn upload-zone"
                  onClick={() => triggerUpload(side)}
                  style={{ flex: 1, border: data ? "1px solid #c8f55a" : "1px dashed #d4d4d4", borderRadius: 10, background: data ? "#0a0a0a" : "#fff", cursor: "pointer", overflow: "hidden", height: 156, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4, position: "relative", transition: "border-color 150ms ease, transform 160ms var(--ease-out)" }}
                >
                  {data ? (
                    <>
                      <img src={data} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(200,245,90,0.92)", color: "#0a0a0a", fontSize: 10, fontWeight: 600, textAlign: "center", padding: "4px 0", letterSpacing: "0.04em" }}>✓ {label.toUpperCase()}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, opacity: 0.15, lineHeight: 1 }}>↑</div>
                      <div style={{ fontSize: 11, color: "#bbb", letterSpacing: "-0.01em" }}>{label}{required ? " *" : ""}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Name *</label>
              <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Navy slim chinos" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Category</label>
              <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => { setAddForm({ ...EMPTY_FORM }); setView("wardrobe"); }} style={btnGhost}>Cancel</button>
              <button
                className="btn"
                onClick={handleAdd}
                disabled={!addForm.name || !addForm.frontData || saving}
                style={{ ...btnPrimary, flex: 1, opacity: !addForm.name || !addForm.frontData ? 0.35 : 1, cursor: !addForm.name || !addForm.frontData ? "not-allowed" : "pointer" }}
              >
                <span className={`btn-content${saving ? " saving" : ""}`}>{saving ? "Saving…" : "Add to closet"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Outfits */}
        {view === "outfits" && (
          <div className="view-enter">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h1 style={{ fontSize: 14, fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em", margin: 0 }}>Today's picks</h1>
              <button className="btn" onClick={generateOutfits} disabled={generating} style={btnSecondary}>
                {generating ? "Styling…" : "↻ Restyle"}
              </button>
            </div>

            {generating && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                {/* Fast spinner — makes loading feel faster */}
                <div style={{ width: 20, height: 20, border: "1.5px solid #e5e5e5", borderTopColor: "#0a0a0a", borderRadius: "50%", animation: "spin 0.45s linear infinite", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 12, color: "#bbb", letterSpacing: "-0.01em" }}>Styling your wardrobe</div>
              </div>
            )}

            {!generating && genError && (
              <div style={{ border: "1px solid #e5e5e5", borderRadius: 10, padding: "24px", textAlign: "center", animation: "fadeUp 200ms var(--ease-out)" }}>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 14, letterSpacing: "-0.01em" }}>{genError}</div>
                <button className="btn" onClick={generateOutfits} style={btnPrimary}>Try again</button>
              </div>
            )}

            {!generating && !genError && outfits.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 12, color: "#d4d4d4", letterSpacing: "-0.01em" }}>Hit Restyle to generate outfit ideas</div>
              </div>
            )}

            {outfits.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {outfits.map((outfit, i) => (
                  <div key={i} className="outfit-card" style={{ background: "#fff", borderRadius: 10, border: i === 0 ? "1px solid #c8f55a" : "1px solid #e5e5e5", overflow: "hidden" }}>
                    <div style={{ padding: "13px 15px 11px", borderBottom: "1px solid #f5f5f5" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0a0a0a", letterSpacing: "-0.02em", marginBottom: 2 }}>{outfit.name}</div>
                          <div style={{ fontSize: 10, color: "#ccc", letterSpacing: "0.05em" }}>
                            {"★".repeat(Math.round(outfit.styleScore / 2))}{"☆".repeat(5 - Math.round(outfit.styleScore / 2))}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, background: i === 0 ? "#c8f55a" : "#f5f5f5", color: i === 0 ? "#0a0a0a" : "#999", borderRadius: 5, padding: "3px 8px", letterSpacing: "-0.01em" }}>{outfit.styleScore}/10</span>
                      </div>
                    </div>
                    <div style={{ padding: "11px 15px 13px" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto" }}>
                        {outfit.items.map(item => (
                          <div key={item.id} style={{ flexShrink: 0 }}>
                            <img src={item.image_data || item.imageData} alt={item.name} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 7, display: "block", border: "1px solid #e5e5e5" }} />
                            <div style={{ fontSize: 9, color: "#ccc", marginTop: 3, maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{item.name}</div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: "#555", lineHeight: 1.7, margin: "0 0 8px", letterSpacing: "-0.01em" }}>{outfit.description}</p>
                      <div style={{ fontSize: 11, color: "#999", letterSpacing: "-0.01em" }}>💡 {outfit.tips}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom sheet modal — slides in from bottom with drawer easing */}
      {previewItem && (
        <>
          <div
            onClick={() => setPreviewItem(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 200, backdropFilter: "blur(3px)", animation: "backdropIn 200ms ease forwards" }}
          />
          <div
            style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, display: "flex", justifyContent: "center" }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: "#fff", borderRadius: "14px 14px 0 0", maxWidth: 440, width: "100%", overflow: "hidden", animation: "sheetIn 320ms var(--ease-drawer) forwards" }}
            >
              <img
                src={previewSide === "front" ? previewItem.imageData : (previewItem.backData || previewItem.imageData)}
                alt={previewItem.name}
                style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block" }}
              />
              {previewItem.backData && (
                <div style={{ display: "flex", borderBottom: "1px solid #f0f0f0" }}>
                  {["front", "back"].map(side => (
                    <button
                      key={side}
                      className="btn"
                      onClick={() => setPreviewSide(side)}
                      style={{ flex: 1, padding: "10px", border: "none", background: previewSide === side ? "#0a0a0a" : "#fafafa", color: previewSide === side ? "#fafafa" : "#aaa", fontWeight: 500, fontSize: 12, cursor: "pointer", letterSpacing: "-0.01em", transition: "background 150ms ease, color 150ms ease, transform 160ms var(--ease-out)" }}
                    >
                      {side.charAt(0).toUpperCase() + side.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {/* Drag handle */}
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 32, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2 }} />
              <div style={{ padding: "14px 18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#0a0a0a", letterSpacing: "-0.02em" }}>{previewItem.name}</div>
                    <div style={{ fontSize: 11, color: "#bbb", marginTop: 2, letterSpacing: "-0.01em" }}>{CATS[previewItem.category] || previewItem.category}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, background: previewItem.dirty ? "#fef2f2" : "#f0fdf4", color: previewItem.dirty ? "#dc2626" : "#16a34a", borderRadius: 5, padding: "4px 10px", letterSpacing: "-0.01em", transition: "background 200ms ease, color 200ms ease" }}>
                    {previewItem.dirty ? "In wash" : "Clean"}
                  </span>
                </div>
                <button className="btn" onClick={() => setPreviewItem(null)} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>Done</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary = { background: "#0a0a0a", color: "#fafafa", border: "none", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit", display: "flex", alignItems: "center" };
const btnSecondary = { background: "#fff", color: "#0a0a0a", border: "1px solid #e5e5e5", borderRadius: 7, padding: "7px 13px", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit" };
const btnGhost = { background: "transparent", color: "#aaa", border: "1px solid #e5e5e5", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 500, color: "#aaa", letterSpacing: "-0.01em", marginBottom: 5 };
const inputStyle = { width: "100%", padding: "9px 11px", border: "1px solid #e5e5e5", borderRadius: 7, fontSize: 13, background: "#fff", color: "#0a0a0a", fontFamily: "inherit", letterSpacing: "-0.01em", display: "block", transition: "border-color 150ms ease" };
