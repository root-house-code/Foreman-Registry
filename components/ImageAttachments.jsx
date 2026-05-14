import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { storeImage, deleteStoredImage, getImages } from "../lib/images.js";

function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const img = images[idx];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  if (!img) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        alignItems: "center", background: "rgba(0,0,0,0.92)", bottom: 0,
        display: "flex", justifyContent: "center", left: 0,
        position: "fixed", right: 0, top: 0, zIndex: 2000,
      }}
    >
      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{
            background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
            color: "#e8e4dd", cursor: "pointer", fontSize: "1.2rem",
            height: 40, left: 16, position: "absolute", width: 40,
          }}
        >‹</button>
      )}

      <img
        src={img.dataUrl}
        alt={img.filename || "attachment"}
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "90vh", maxWidth: "90vw", objectFit: "contain", borderRadius: "4px" }}
      />

      {/* Next */}
      {idx < images.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{
            background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
            color: "#e8e4dd", cursor: "pointer", fontSize: "1.2rem",
            height: 40, position: "absolute", right: 16, width: 40,
          }}
        >›</button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        style={{
          background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
          color: "#e8e4dd", cursor: "pointer", fontSize: "1rem",
          height: 32, position: "absolute", right: 16, top: 16, width: 32,
        }}
      >×</button>

      {/* Counter */}
      {images.length > 1 && (
        <div style={{
          bottom: 16, color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem",
          position: "absolute", textAlign: "center", width: "100%",
        }}>
          {idx + 1} / {images.length}
        </div>
      )}
    </div>,
    document.body
  );
}

export default function ImageAttachments({ imageIds, onChange }) {
  const [images, setImages] = useState(() => getImages(imageIds || []));
  const [dragging, setDragging] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setImages(getImages(imageIds || []));
  }, [JSON.stringify(imageIds)]);

  async function handleFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setUploading(true);
    const newIds = [];
    for (const file of imageFiles) {
      try {
        const id = await storeImage(file);
        newIds.push(id);
      } catch {
        // skip unreadable files
      }
    }
    const updatedIds = [...(imageIds || []), ...newIds];
    setImages(getImages(updatedIds));
    onChange(updatedIds);
    setUploading(false);
  }

  function handleDelete(id, e) {
    e.stopPropagation();
    deleteStoredImage(id);
    const newIds = (imageIds || []).filter(i => i !== id);
    setImages(getImages(newIds));
    onChange(newIds);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
  }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div style={{ marginTop: "0.25rem" }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
        <label style={{
          color: "#a8a29c", display: "block", fontFamily: "monospace",
          fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase",
        }}>
          Images {images.length > 0 && `(${images.length})`}
        </label>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            background: "none", border: "1px solid #1e2330", borderRadius: "2px",
            color: uploading ? "#4a5060" : "#a8a29c", cursor: uploading ? "default" : "pointer",
            fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.06em",
            padding: "0.1rem 0.45rem", transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = "#c9a96e40"; e.currentTarget.style.color = "#c9a96e"; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2330"; e.currentTarget.style.color = uploading ? "#4a5060" : "#a8a29c"; }}
        >
          {uploading ? "uploading…" : "+ add"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {/* Drop zone + thumbnails */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `1px dashed ${dragging ? "#c9a96e" : images.length === 0 ? "#1e2330" : "transparent"}`,
          borderRadius: "4px",
          minHeight: images.length === 0 ? 52 : "auto",
          padding: images.length === 0 ? "0.5rem" : 0,
          transition: "border-color 0.15s",
        }}
      >
        {images.length === 0 ? (
          <div style={{
            alignItems: "center", color: "#2e3347", display: "flex",
            fontFamily: "monospace", fontSize: "0.6rem", height: "100%",
            justifyContent: "center", letterSpacing: "0.06em",
          }}>
            {dragging ? "drop to attach" : "drag images here or click + add"}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {images.map((img, i) => (
              <div
                key={img.id}
                style={{ borderRadius: "3px", flexShrink: 0, height: 64, overflow: "hidden", position: "relative", width: 64 }}
                onMouseEnter={() => setHoveredId(img.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <img
                  src={img.dataUrl}
                  alt={img.filename}
                  onClick={() => setLightboxIdx(i)}
                  style={{ cursor: "zoom-in", height: "100%", objectFit: "cover", width: "100%" }}
                />
                {hoveredId === img.id && (
                  <button
                    onClick={e => handleDelete(img.id, e)}
                    style={{
                      alignItems: "center", background: "rgba(0,0,0,0.7)", border: "none",
                      borderRadius: "50%", color: "#f87171", cursor: "pointer",
                      display: "flex", fontSize: "0.75rem", height: 18, justifyContent: "center",
                      lineHeight: 1, padding: 0, position: "absolute", right: 3, top: 3, width: 18,
                    }}
                  >×</button>
                )}
              </div>
            ))}
            {/* Inline drop target when images already present */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                alignItems: "center", background: dragging ? "#c9a96e08" : "transparent",
                border: `1px dashed ${dragging ? "#c9a96e" : "#2e3347"}`,
                borderRadius: "3px", color: dragging ? "#c9a96e" : "#2e3347",
                cursor: "pointer", display: "flex", flexShrink: 0,
                fontSize: "1.1rem", height: 64, justifyContent: "center",
                transition: "all 0.15s", width: 64,
              }}
            >+</div>
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          images={images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
