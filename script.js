// script.js - Versión robusta y corregida
document.addEventListener("DOMContentLoaded", () => {
  const DEBUG = false;
  const ramos = Array.from(document.querySelectorAll(".ramo"));
  const semContainers = Array.from(document.querySelectorAll(".semestre"));

  // ---------- UTILIDADES ----------
  function normalize(text) {
    if (!text) return "";
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  const nameToElem = new Map();
  ramos.forEach(r => {
    const name = r.textContent.trim();
    nameToElem.set(normalize(name), r);
  });

  // Alias: tolera variaciones de nombres
  const aliasMap = new Map([
    ["tipe i", "taller de integracion perfil sello uv i"],
    ["tipe ii", "taller de integracion perfil sello uv ii"],
    ["tipe iii", "taller de integracion perfil sello uv iii"],
    ["taller de integracion i", "taller de integracion de ingenieria industrial i"],
    ["taller de integracion ii", "taller de integracion de ingenieria industrial ii"],
    ["practica i", "práctica i"],
    ["practica ii", "práctica ii"],
    ["informatica 1", "informatica i"],
    ["informatica 2", "informatica ii"],
    // correcciones sing/plural y otros
    ["estadisticas y probabilidades", "estadistica y probabilidades"],
    ["estadistica y probabilidad", "estadistica y probabilidades"],
    ["tecnologias de informacion e inteligencia de negocios", "tecnologías de información e inteligencia de negocios"]
  ]);

  const aliasNorm = new Map();
  for (const [k,v] of aliasMap.entries()) aliasNorm.set(normalize(k), normalize(v));

  const candidateNames = Array.from(new Set([
    ...Array.from(nameToElem.keys()),
    ...Array.from(aliasNorm.keys())
  ])).sort((a,b) => b.length - a.length);

  const semMap = new Map();
  semContainers.forEach(container => {
    const h = container.querySelector("h2");
    if (!h) return;
    const m = h.innerText.match(/(\d+)\s*°?/);
    if (m) {
      const n = parseInt(m[1], 10);
      semMap.set(n, Array.from(container.querySelectorAll(".ramo")));
    }
  });

  // ---------- FUNCIONES DE ESTADO ----------
  function getApprovedSet() {
    const s = new Set();
    ramos.forEach(r => { if (r.classList.contains("aprobado")) s.add(normalize(r.textContent.trim())); });
    return s;
  }

  function getApprovedCredits() {
    return ramos.reduce((acc, r) => acc + (r.classList.contains("aprobado") ? (parseInt(r.dataset.creditos||0,10) || 0) : 0), 0);
  }

  function allRamosUntilSemester(n, approvedSet) {
    for (let i=1; i<=n; i++) {
      const arr = semMap.get(i) || [];
      for (const r of arr) {
        if (!approvedSet.has(normalize(r.textContent.trim()))) return false;
      }
    }
    return true;
  }

  function extractCourseNamesFromText(rawText) {
    const found = [];
    if (!rawText) return found;
    let text = normalize(rawText);
    text = text.replace(/\+/g, " ").replace(/;/g, " ").replace(/\by\b/g, " ");
    for (const cand of candidateNames) {
      let idx = text.indexOf(cand);
      while (idx !== -1) {
        const canonical = aliasNorm.has(cand) ? aliasNorm.get(cand) : cand;
        if (!found.includes(canonical)) found.push(canonical);
        text = text.slice(0, idx) + " ".repeat(cand.length) + text.slice(idx + cand.length);
        idx = text.indexOf(cand);
      }
    }
    return found;
  }

  function parsePrereq(raw) {
    const result = { courseNames: [], minCredits: null, untilSemester: null };
    if (!raw || raw.trim()==="") return result;
    const text = raw.trim();
    const semMatch = text.match(/hasta\s*(\d+)\D*semestre/i);
    if (semMatch) result.untilSemester = parseInt(semMatch[1],10);
    const crMatch = text.match(/(\d+)\s*cr[eé]ditos/i);
    if (crMatch) result.minCredits = parseInt(crMatch[1],10);
    result.courseNames = extractCourseNamesFromText(text);
    return result;
  }

  // ---------- NUEVA LÓGICA ----------
  function meetsPrereqs(ramoElement, approvedSet, creditsApproved) {
    const raw = ramoElement.dataset.prerrequisitos || "";
    const parsed = parsePrereq(raw);
    if (DEBUG) console.debug("Evaluando:", ramoElement.textContent.trim(), "parsed:", parsed);

    // 1) hasta N semestre
    if (parsed.untilSemester) {
      if (!allRamosUntilSemester(parsed.untilSemester, approvedSet)) {
        return false;
      }
    }

    // 2) créditos mínimos
    if (parsed.minCredits) {
      if (creditsApproved < parsed.minCredits) {
        return false;
      }
    }

    // 3) ramos
    for (const cn of parsed.courseNames) {
      const canonical = aliasNorm.has(cn) ? aliasNorm.get(cn) : cn;

      // si el nombre no existe en el mapa → bloquear
      if (!nameToElem.has(canonical)) {
        return false;
      }

      // si existe pero no está aprobado → bloquear
      if (!approvedSet.has(canonical)) {
        return false;
      }
    }

    return true;
  }

  // ---------- UI: contador créditos ----------
  function updateCreditCounters() {
    const sems = Array.from(document.querySelectorAll(".semestre"));
    sems.forEach(sem => {
      const approvedInSem = Array.from(sem.querySelectorAll(".ramo.aprobado"));
      const total = approvedInSem.reduce((acc,r) => acc + (parseInt(r.dataset.creditos||0,10)||0), 0);
      let contador = sem.querySelector(".contador-creditos");
      if (!contador) {
        contador = document.createElement("div");
        contador.className = "contador-creditos";
        sem.appendChild(contador);
      }
      contador.textContent = `Créditos aprobados: ${total}`;
      contador.style.color = total > 30 ? "red" : "#660033";
    });
  }

  // ---------- MAIN ----------
  function recalcAll() {
    const approvedSet = getApprovedSet();
    const credits = getApprovedCredits();
    if (DEBUG) console.debug("Recalculando. aprobados:", Array.from(approvedSet), "credits:", credits);

    ramos.forEach(r => {
      if (r.classList.contains("aprobado")) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }
      const raw = r.dataset.prerrequisitos || "";
      if (!raw || raw.trim()==="") {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }
      const ok = meetsPrereqs(r, approvedSet, credits);
      if (ok) { r.classList.add("disponible"); r.classList.remove("bloqueado"); }
      else     { r.classList.add("bloqueado");  r.classList.remove("disponible"); }
    });

    updateCreditCounters();
  }

  // ---------- EVENTOS ----------
  ramos.forEach(r => {
    let tip = null;
    r.addEventListener("mouseenter", (e) => {
      const text = `Créditos: ${r.dataset.creditos || "0"}\nPrerrequisitos: ${r.dataset.prerrequisitos || "Ninguno"}`;
      tip = createTooltip(text, e.pageX + 8, e.pageY + 8);
    });
    r.addEventListener("mousemove", (e) => { if (tip) { tip.style.left = (e.pageX+8)+"px"; tip.style.top=(e.pageY+8)+"px"; }});
    r.addEventListener("mouseleave", () => { if (tip && tip.parentNode) tip.parentNode.removeChild(tip); tip = null; });

    r.addEventListener("click", () => {
      if (r.classList.contains("bloqueado")) return;
      r.classList.toggle("aprobado");
      if (r.classList.contains("aprobado")) { r.classList.remove("disponible"); r.classList.add("aprobado"); }
      else { r.classList.remove("aprobado"); r.classList.add("disponible"); }
      recalcAll();
    });
  });

  function createTooltip(text, x, y) {
    const t = document.createElement("div");
    t.className = "malla-tooltip";
    t.innerText = text;
    Object.assign(t.style, {
      position: "absolute",
      left: x + "px",
      top: y + "px",
      background: "#fff",
      border: "1px solid #e6d6df",
      padding: "6px 8px",
      borderRadius: "6px",
      zIndex: 9999,
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      whiteSpace: "pre-line",
      fontSize: "13px",
      color: "#333"
    });
    document.body.appendChild(t);
    return t;
  }

  // ---------- inicial ----------
  recalcAll();

  window._mallaDebug = {
    recalc: recalcAll,
    approved: () => Array.from(getApprovedSet()),
    credits: () => getApprovedCredits(),
    names: () => Array.from(nameToElem.keys()),
    alias: () => Array.from(aliasNorm ? aliasNorm : [])
  };
});


