const fs = require('fs');
const path = 'c:/Users/spenc/OneDrive/Documents/Projects/Home Dashboard/inventory-page.jsx';
const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

// Replace lines 1609-1948 (1-indexed) = indices 1608-1947 (0-indexed)
const before = lines.slice(0, 1608);
const after  = lines.slice(1948);

const newLines = `          {!selectedItem ? (
            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", padding: "2.5rem 1rem", textAlign: "center" }}>
              Select an item to view details
            </div>
          ) : (
            <div style={{ padding: "0.75rem 1rem 0.85rem" }}>
              {(() => {
                const cfKey = \`\${selectedItem.category}|\${selectedItem.item}\`;
                const itmFields = itemFieldSchemas[cfKey] || [];
                const vals = customFieldValues[cfKey] || {};
                const addedIds = new Set(itmFields.map(f => f.id));
                const svgArrow = \`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a5460'/%3E%3C/svg%3E")\`;
                const fieldStyle = { background: "#0f1117", border: "1px solid #a8a29c", borderRadius: "3px", boxSizing: "border-box", color: "#e8e4dd", fontFamily: "monospace", fontSize: "0.75rem", outline: "none", padding: "0.3rem 0.5rem", width: "100%" };
                const labelStyle = { color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" };
                const chipBtn = { background: "#13161f", border: "1px solid #1e2330", borderRadius: "3px", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.04em", padding: "0.2rem 0.55rem", transition: "all 0.12s" };

                function renderFieldInput(field) {
                  const val = vals[field.id] ?? "";
                  const onChange = v => handleCustomFieldValueChange(selectedItem.category, selectedItem.item, field.id, v);

                  if (field.id === "manufacturer") {
                    const mfrs = getManufacturers(selectedItem.item);
                    if (mfrs.length > 0) return (
                      <select value={val} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", cursor: "pointer", paddingRight: "1.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"}>
                        <option value="">—</option>
                        {mfrs.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="Other">Other</option>
                      </select>
                    );
                  }
                  if (field.id === "model") {
                    const mfr = vals.manufacturer || "";
                    const models = getModels(mfr, selectedItem.item);
                    if (models.length > 0) return (
                      <select value={val} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", cursor: "pointer", paddingRight: "1.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"}>
                        <option value="">—</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    );
                  }
                  if (field.type === "receipt") {
                    const receipt = vals[field.id];
                    return receipt ? (
                      <div style={{ alignItems: "center", display: "flex", gap: "0.5rem" }}>
                        <img src={receipt} alt="Receipt" onClick={() => window.open(receipt, "_blank")} style={{ border: "1px solid #a8a29c", borderRadius: "3px", cursor: "pointer", height: 44, objectFit: "cover", width: 66 }} />
                        <button onClick={() => onChange(null)} style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.72rem", padding: "0.1rem 0.3rem", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}>×</button>
                      </div>
                    ) : (
                      <label style={{ cursor: "pointer", lineHeight: 1 }}>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async e => { const file = e.target.files[0]; if (!file) return; const dataUrl = await compressImage(file); onChange(dataUrl); e.target.value = ""; }} />
                        <span style={{ border: "1px dashed #a8a29c", borderRadius: "3px", color: "#a8a29c", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.08em", padding: "0.25rem 0.65rem", transition: "color 0.15s, border-color 0.15s" }} onMouseEnter={e => { e.currentTarget.style.color = "#c9a96e"; e.currentTarget.style.borderColor = "#c9a96e"; }} onMouseLeave={e => { e.currentTarget.style.color = "#a8a29c"; e.currentTarget.style.borderColor = "#a8a29c"; }}>+ Upload Receipt</span>
                      </label>
                    );
                  }
                  if (field.type === "list" && field.options?.length > 0) return (
                    <select value={val} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", cursor: "pointer", paddingRight: "1.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"}>
                      <option value="">—</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  );
                  return (
                    <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={val} onChange={e => onChange(e.target.value)} placeholder="—" style={fieldStyle} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"} />
                  );
                }

                const universalAvail = UNIVERSAL_FIELDS.filter(f => !addedIds.has(f.id));
                const itemLibAvail   = (ITEM_FIELDS[selectedItem.item] || []).filter(f => !addedIds.has(f.id));

                return (
                  <>
                    {itmFields.length === 0 && !showFieldPicker && (
                      <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.72rem", marginBottom: "0.5rem", paddingTop: "0.25rem" }}>No fields yet</div>
                    )}
                    {itmFields.map(field => (
                      <div key={field.id} style={{ marginBottom: "0.45rem" }}>
                        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                          <span style={labelStyle}>{field.name}</span>
                          <button onClick={() => handleDeleteItemField(selectedItem.category, selectedItem.item, field.id)} style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1, padding: "0 0.1rem", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}>×</button>
                        </div>
                        {renderFieldInput(field)}
                      </div>
                    ))}

                    {showFieldPicker && (
                      <div style={{ background: "#0f1117", border: "1px solid #1e2330", borderRadius: "4px", marginBottom: "0.5rem", marginTop: itmFields.length > 0 ? "0.5rem" : 0, padding: "0.6rem 0.75rem" }}>
                        {universalAvail.length > 0 && (
                          <>
                            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>Common</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
                              {universalAvail.map(f => (
                                <button key={f.id} onClick={() => handleAddItemField(selectedItem.category, selectedItem.item, f)} style={chipBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2330"; e.currentTarget.style.color = "#a8a29c"; }}>{f.name}</button>
                              ))}
                            </div>
                          </>
                        )}
                        {itemLibAvail.length > 0 && (
                          <>
                            <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>For {selectedItem.item}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.6rem" }}>
                              {itemLibAvail.map(f => (
                                <button key={f.id} onClick={() => handleAddItemField(selectedItem.category, selectedItem.item, f)} style={chipBtn} onMouseEnter={e => { e.currentTarget.style.borderColor = "#c9a96e"; e.currentTarget.style.color = "#c9a96e"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2330"; e.currentTarget.style.color = "#a8a29c"; }}>{f.name}</button>
                              ))}
                            </div>
                          </>
                        )}
                        {universalAvail.length === 0 && itemLibAvail.length === 0 && (
                          <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.65rem", marginBottom: "0.5rem" }}>All library fields added</div>
                        )}
                        <div style={{ color: "#a8a29c", fontFamily: "monospace", fontSize: "0.58rem", letterSpacing: "0.12em", marginBottom: "0.4rem", textTransform: "uppercase" }}>Custom</div>
                        <div style={{ display: "flex", gap: "0.5rem", marginBottom: newField.type === "list" ? "0.4rem" : "0.5rem" }}>
                          <input autoFocus placeholder="Field name" value={newField.name} onChange={e => setNewField(f => ({ ...f, name: e.target.value }))} style={{ ...fieldStyle, flex: 1 }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"} onKeyDown={e => { if (e.key === "Escape") { setShowFieldPicker(false); setNewField({ name: "", type: "text", options: "" }); } }} />
                          <select value={newField.type} onChange={e => setNewField(f => ({ ...f, type: e.target.value }))} style={{ ...fieldStyle, appearance: "none", backgroundImage: svgArrow, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.4rem center", cursor: "pointer", flex: "0 0 76px", paddingRight: "1.25rem" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="list">List</option>
                          </select>
                        </div>
                        {newField.type === "list" && (
                          <input placeholder="Options, comma-separated" value={newField.options} onChange={e => setNewField(f => ({ ...f, options: e.target.value }))} style={{ ...fieldStyle, marginBottom: "0.5rem" }} onFocus={e => e.currentTarget.style.borderColor = "#c9a96e"} onBlur={e => e.currentTarget.style.borderColor = "#a8a29c"} />
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between" }}>
                          <button onClick={() => { setShowFieldPicker(false); setNewField({ name: "", type: "text", options: "" }); }} style={{ background: "transparent", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.65rem", padding: "0.25rem 0" }}>Close</button>
                          <button onClick={() => { if (!newField.name.trim()) return; handleAddItemField(selectedItem.category, selectedItem.item, { id: crypto.randomUUID(), name: newField.name.trim(), type: newField.type, options: newField.type === "list" ? newField.options.split(",").map(s => s.trim()).filter(Boolean) : [] }); setNewField({ name: "", type: "text", options: "" }); }} disabled={!newField.name.trim()} style={{ background: newField.name.trim() ? "#c9a96e18" : "transparent", border: \`1px solid \${newField.name.trim() ? "#c9a96e40" : "#a8a29c"}\`, borderRadius: "3px", color: newField.name.trim() ? "#c9a96e" : "#a8a29c", cursor: newField.name.trim() ? "pointer" : "default", fontFamily: "monospace", fontSize: "0.65rem", padding: "0.25rem 0.65rem" }}>+ Add custom</button>
                        </div>
                      </div>
                    )}

                    {!showFieldPicker && (
                      <button onClick={() => setShowFieldPicker(true)} style={{ background: "none", border: "none", color: "#a8a29c", cursor: "pointer", fontFamily: "monospace", fontSize: "0.7rem", letterSpacing: "0.05em", marginTop: itmFields.length > 0 ? "0.4rem" : 0, padding: "0.2rem 0", transition: "color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color = "#c9a96e"} onMouseLeave={e => e.currentTarget.style.color = "#a8a29c"}>+ Add Field</button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          </div>`;

const newSection = newLines.split('\n').map(l => l + '\r');
const result = [...before, ...newSection, ...after].join('\n');
fs.writeFileSync(path, result, 'utf8');
console.log('Done. Lines:', result.split('\n').length);
