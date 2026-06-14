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
      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 20, height: 20, border: "1.5px solid rgba(255,255,255,0.1)", borderTopColor: "#c8f55a", borderRadius: "50%", animation: "spin 0.45s linear infinite" }} />
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", letterSpacing: "-0.01em" }}>Loading</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", fontFamily: "'Inter', system-ui, sans-serif", position: "relative", overflowX: "hidden" }}>
      <style>{`
        :root {
          --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
          --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
        }
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes breathe1 {
          0%,100% { transform: scale(1) translate(0,0); opacity: 0.18; }
          50% { transform: scale(1.15) translate(-10px,15px); opacity: 0.28; }
        }
        @keyframes breathe2 {
          0%,100% { transform: scale(1) translate(0,0); opacity: 0.14; }
          50% { transform: scale(1.2) translate(15px,-10px); opacity: 0.22; }
        }
        @keyframes breathe3 {
          0%,100% { transform: scale(1); opacity: 0.08; }
          50% { transform: scale(1.3); opacity: 0.15; }
        }
        @keyframes sheetIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes bdIn { from { opacity: 0; } to { opacity: 1; } }
        .wore-btn { transition: all 0.15s var(--ease-out); }
        .wore-btn:active { transform: scale(0.97); }
        .wore-card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        @media (hover: hover) and (pointer: fine) {
          .wore-card:hover { border-color: rgba(200,245,90,0.2) !important; box-shadow: 0 0 0 1px rgba(200,245,90,0.08); }
        }
        .grid-item { animation: fadeUp 0.3s var(--ease-out) both; }
        .grid-item:nth-child(1) { animation-delay: 0ms; }
        .grid-item:nth-child(2) { animation-delay: 45ms; }
        .grid-item:nth-child(3) { animation-delay: 90ms; }
        .grid-item:nth-child(4) { animation-delay: 135ms; }
        .grid-item:nth-child(5) { animation-delay: 180ms; }
        .grid-item:nth-child(6) { animation-delay: 225ms; }
        .grid-item:nth-child(n+7) { animation-delay: 270ms; }
        .outfit-item { animation: fadeUp 0.28s var(--ease-out) both; }
        .outfit-item:nth-child(1) { animation-delay: 0ms; }
        .outfit-item:nth-child(2) { animation-delay: 65ms; }
        .outfit-item:nth-child(3) { animation-delay: 130ms; }
        .outfit-item:nth-child(4) { animation-delay: 195ms; }
        .glass-input:focus { outline: none; border-color: rgba(200,245,90,0.4) !important; }
        @media (prefers-reduced-motion: reduce) {
          .grid-item, .outfit-item { animation: none !important; opacity: 1 !important; }
          .orb { animation: none !important; }
        }
      `}</style>

      {/* Ambient breathing orbs */}
      <div style={{ position: "fixed", top: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "#c8f55a", filter: "blur(90px)", opacity: 0.15, pointerEvents: "none", zIndex: 0, animation: "breathe1 7s ease-in-out infinite" }} className="orb" />
      <div style={{ position: "fixed", bottom: 100, left: -100, width: 260, height: 260, borderRadius: "50%", background: "#4ade80", filter: "blur(90px)", opacity: 0.12, pointerEvents: "none", zIndex: 0, animation: "breathe2 9s ease-in-out infinite" }} className="orb" />
      <div style={{ position: "fixed", top: "40%", left: "25%", width: 180, height: 180, borderRadius: "50%", background: "#a78bfa", filter: "blur(80px)", opacity: 0.08, pointerEvents: "none", zIndex: 0, animation: "breathe3 11s ease-in-out infinite" }} className="orb" />

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, height: 52, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,10,15,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "-0.04em" }}>wore<span style={{ color: "#c8f55a" }}>.</span></span>
        <nav style={{ display: "flex", gap: 2 }}>
          {[{ key: "wardrobe", label: "Closet" }, { key: "add", label: "Add" }, { key: "outfits", label: "Outfits" }].map(tab => (
            <button
              key={tab.key}
              className="wore-btn"
              onClick={() => tab.key === "outfits" ? generateOutfits() : setView(tab.key)}
              style={{ background: view === tab.key ? "rgba(200,245,90,0.12)" : "transparent", color: view === tab.key ? "#c8f55a" : "rgba(255,255,255,0.35)", border: view === tab.key ? "0.5px solid rgba(200,245,90,0.2)" : "0.5px solid transparent", borderRadius: 8, padding: "5px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit" }}
            >{tab.label}</button>
          ))}
        </nav>
      </header>

      {/* Stats */}
      {view === "wardrobe" && wardrobe.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
          {[{ label: "Total", value: wardrobe.length, color: "#fff" }, { label: "Clean", value: cleanCount, color: "#4ade80" }, { label: "In wash", value: dirtyCount, color: "#f87171" }].map(s => (
            <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: s.color, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 3, transition: "color 0.3s ease" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <main style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>

        {/* Wardrobe */}
        {view === "wardrobe" && (
          wardrobe.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 24px", animation: "fadeUp 0.3s var(--ease-out)" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginBottom: 4, letterSpacing: "-0.01em" }}>Your closet is empty</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.12)", marginBottom: 28 }}>Add your first item to get started</div>
              <button className="wore-btn" onClick={() => setView("add")} style={btnPrimary}>Add item</button>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px" }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Your closet</span>
                <button className="wore-btn" onClick={() => setView("add")} style={{ background: "rgba(200,245,90,0.1)", border: "0.5px solid rgba(200,245,90,0.2)", color: "#c8f55a", fontSize: 12, fontWeight: 500, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}>+ Add</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, padding: "0 16px 24px" }}>
                {wardrobe.map((item, i) => (
                  <div key={item.id} className="grid-item wore-card" style={{ borderRadius: 16, overflow: "hidden", border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer" }}>
                    <div onClick={() => { setPreviewItem(normalizeItem(item)); setPreviewSide("front"); }} style={{ position: "relative" }}>
                      <img src={item.image_data || item.imageData} alt={item.name} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                      {item.dirty && (
                        <div style={{ position: "absolute", top: 7, left: 7, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "0.5px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 9, fontWeight: 600, borderRadius: 6, padding: "2px 7px", letterSpacing: "0.04em" }}>IN WASH</div>
                      )}
                    </div>
                    <div style={{ padding: "9px 10px 8px" }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.02em" }}>{item.name}</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="wore-btn" onClick={() => toggleDirty(item.id)} style={{ flex: 1, border: "0.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "5px 0", cursor: "pointer", fontSize: 11, fontWeight: 500, color: item.dirty ? "#f87171" : "#4ade80", fontFamily: "inherit", letterSpacing: "-0.01em" }}>{item.dirty ? "Dirty" : "Clean"}</button>
                        <button className="wore-btn" onClick={() => removeItem(item.id)} style={{ border: "0.5px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.15)", fontFamily: "inherit" }}>×</button>
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
          <div style={{ padding: "16px", maxWidth: 400, margin: "0 auto", animation: "fadeUp 0.25s var(--ease-out)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.03em", marginBottom: 16 }}>Add item</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[{ side: "front", label: "Front", data: addForm.frontData }, { side: "back", label: "Back", data: addForm.backData }].map(({ side, label, data }) => (
                <div key={side} className="wore-btn" onClick={() => triggerUpload(side)} style={{ flex: 1, aspectRatio: "1", border: data ? "1px solid rgba(200,245,90,0.3)" : "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, background: data ? "rgba(200,245,90,0.05)" : "rgba(255,255,255,0.02)", cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, position: "relative" }}>
                  {data ? (
                    <>
                      <img src={data} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(200,245,90,0.85)", color: "#0a0a0f", fontSize: 10, fontWeight: 700, textAlign: "center", padding: "4px 0", letterSpacing: "0.06em" }}>✓ {label.toUpperCase()}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 20, opacity: 0.15 }}>↑</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "-0.01em" }}>{label}{side === "front" ? " *" : ""}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "-0.01em", marginBottom: 5 }}>Name *</label>
            <input className="glass-input" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Navy slim chinos" style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", letterSpacing: "-0.01em", display: "block", marginBottom: 10, transition: "border-color 0.15s ease" }} />
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "-0.01em", marginBottom: 5 }}>Category</label>
            <select className="glass-input" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "inherit", letterSpacing: "-0.01em", display: "block", marginBottom: 20 }}>
              {Object.entries(CATS).map(([k, v]) => <option key={k} value={k} style={{ background: "#1a1a24" }}>{v}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="wore-btn" onClick={() => { setAddForm({ ...EMPTY_FORM }); setView("wardrobe"); }} style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}>Cancel</button>
              <button className="wore-btn" onClick={handleAdd} disabled={!addForm.name || !addForm.frontData || saving} style={{ flex: 1, background: "#c8f55a", border: "none", color: "#0a0a0f", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: !addForm.name || !addForm.frontData ? "not-allowed" : "pointer", opacity: !addForm.name || !addForm.frontData ? 0.35 : 1, fontFamily: "inherit", letterSpacing: "-0.02em" }}>{saving ? "Saving…" : "Add to closet"}</button>
            </div>
          </div>
        )}

        {/* Outfits */}
        {view === "outfits" && (
          <div style={{ animation: "fadeUp 0.25s var(--ease-out)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 12px" }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Today's picks</span>
              <button className="wore-btn" onClick={generateOutfits} disabled={generating} style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 500, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}>{generating ? "Styling…" : "↻ Restyle"}</button>
            </div>
            {generating && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ width: 20, height: 20, border: "1.5px solid rgba(255,255,255,0.08)", borderTopColor: "#c8f55a", borderRadius: "50%", animation: "spin 0.45s linear infinite", margin: "0 auto 10px" }} />
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", letterSpacing: "-0.01em" }}>Styling your wardrobe</div>
              </div>
            )}
            {!generating && genError && (
              <div style={{ margin: "0 16px", padding: "20px", background: "rgba(255,255,255,0.03)", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 16, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>{genError}</div>
                <button className="wore-btn" onClick={generateOutfits} style={btnPrimary}>Try again</button>
              </div>
            )}
            {!generating && !genError && outfits.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", letterSpacing: "-0.01em" }}>Hit Restyle to generate outfit ideas</div>
              </div>
            )}
            {outfits.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 24px" }}>
                {outfits.map((outfit, i) => (
                  <div key={i} className="outfit-item wore-card" style={{ background: "rgba(255,255,255,0.03)", border: i === 0 ? "0.5px solid rgba(200,245,90,0.2)" : "0.5px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden", position: "relative" }}>
                    {i === 0 && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(200,245,90,0.04) 0%, transparent 60%)", pointerEvents: "none" }} />}
                    <div style={{ padding: "13px 14px 11px", borderBottom: "0.5px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>{outfit.name}</div>
                        <span style={{ fontSize: 11, fontWeight: 600, background: i === 0 ? "rgba(200,245,90,0.12)" : "rgba(255,255,255,0.06)", color: i === 0 ? "#c8f55a" : "rgba(255,255,255,0.35)", border: i === 0 ? "0.5px solid rgba(200,245,90,0.25)" : "0.5px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "3px 9px", letterSpacing: "-0.01em" }}>{outfit.styleScore}/10</span>
                      </div>
                    </div>
                    <div style={{ padding: "11px 14px 13px" }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 10, overflowX: "auto" }}>
                        {outfit.items.map(item => (
                          <div key={item.id} style={{ flexShrink: 0 }}>
                            <img src={item.image_data || item.imageData} alt={item.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 9, display: "block", border: "0.5px solid rgba(255,255,255,0.1)" }} />
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, margin: "0 0 7px", letterSpacing: "-0.01em" }}>{outfit.description}</p>
                      <div style={{ fontSize: 11, color: "rgba(200,245,90,0.5)", letterSpacing: "-0.01em" }}>💡 {outfit.tips}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom sheet preview */}
      {previewItem && (
        <>
          <div onClick={() => setPreviewItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 100, animation: "bdIn 0.2s ease" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 101, display: "flex", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "rgba(14,14,20,0.96)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: "20px 20px 0 0", maxWidth: 440, width: "100%", animation: "sheetIn 0.32s var(--ease-drawer)" }}>
              <div style={{ width: 36, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "14px auto 0" }} />
              <img src={previewSide === "front" ? previewItem.imageData : (previewItem.backData || previewItem.imageData)} alt={previewItem.name} style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block", marginTop: 12 }} />
              {previewItem.backData && (
                <div style={{ display: "flex", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
                  {["front", "back"].map(side => (
                    <button key={side} className="wore-btn" onClick={() => setPreviewSide(side)} style={{ flex: 1, padding: "10px", border: "none", background: previewSide === side ? "rgba(200,245,90,0.1)" : "transparent", color: previewSide === side ? "#c8f55a" : "rgba(255,255,255,0.25)", fontWeight: 500, fontSize: 12, cursor: "pointer", letterSpacing: "-0.01em", fontFamily: "inherit" }}>{side.charAt(0).toUpperCase() + side.slice(1)}</button>
                  ))}
                </div>
              )}
              <div style={{ padding: "16px 18px 28px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.03em" }}>{previewItem.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2, letterSpacing: "-0.01em" }}>{CATS[previewItem.category] || previewItem.category}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, background: previewItem.dirty ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", color: previewItem.dirty ? "#f87171" : "#4ade80", border: previewItem.dirty ? "0.5px solid rgba(248,113,113,0.25)" : "0.5px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "4px 10px", letterSpacing: "-0.01em" }}>{previewItem.dirty ? "In wash" : "Clean"}</span>
                </div>
                <button className="wore-btn" onClick={() => setPreviewItem(null)} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>Done</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary = { background: "#c8f55a", border: "none", color: "#0a0a0f", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", letterSpacing: "-0.02em", fontFamily: "inherit", display: "flex", alignItems: "center" };
