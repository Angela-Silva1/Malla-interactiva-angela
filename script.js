// script.js - Versión reiniciada y robusta
document.addEventListener("DOMContentLoaded", () => {
  const DEBUG = false; // Pon true si quieres ver logs en consola
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

  // Construir lista de nombres canonicales (normalizados) -> element
  const nameToElem = new Map();
  ramos.forEach(r => {
    const name = r.textContent.trim();
    nameToElem.set(normalize(name), r);
  });

  // MAPA DE ALIAS (añade más si ves otros abreviados en tu malla)
  const aliasMap = new Map([
    ["tipe i", "taller de integracion perfil sello uv i"],
    ["tipe ii", "taller de integracion perfil sello uv ii"],
    ["tipe iii", "taller de integracion perfil sello uv iii"],
    ["taller de integracion ii", "taller de integracion de ingenieria industrial ii"],
    ["taller de integracion i", "taller de integracion de ingenieria industrial i"],
    ["practica i", "práctica i"],
    ["practica ii", "práctica ii"],
    ["informatica 1", "informatica i"],
    ["informatica 2", "informatica ii"]
    // Agrega aquí cualquier alias extra que encuentres en los prerrequisitos
  ]);
  // Normalize alias keys and values
  const aliasNorm = new Map();
  for (const [k,v] of aliasMap.entries()) aliasNorm.set(normalize(k), normalize(v));

  // Prepara lista de candidatos para buscar nombres dentro de un texto de prerrequisitos
  // Incluye nombres reales + aliases (las keys de aliasNorm)
  const candidateNames = Array.from(new Set([
    ...Array.from(nameToElem.keys()), // nombres normalizados reales
    ...Array.from(aliasNorm.keys())   // alias normalizados
  ])).sort((a,b) => b.length - a.length); // ordenar por longitud descendente (coincidir nombres largos primero)

  // map semestre number -> array of ramo elements
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

  // Extrae nombres de asignaturas (normalizados) encontrados dentro del texto "raw"
  function extractCourseNamesFromText(rawText) {
    const found = [];
    if (!rawText) return found;
    let text = normalize(rawText);
    // sustituir + y ; por espacios para que no rompan tokens
    text = text.replace(/\+/g, " ").replace(/;/g, " ").replace(/\by\b/g, " ");
    // buscar candidatos por orden de longitud (evita dividir nombres con comas internas)
    for (const cand of candidateNames) {
      let idx = text.indexOf(cand);
      while (idx !== -1) {
        // si cand es alias, mapear a su canonical (aliasNorm)
        const canonical = aliasNorm.has(cand) ? aliasNorm.get(cand) : cand;
        if (!found.includes(canonical)) found.push(canonical);
        // reemplaza la porción encontrada con espacios para evitar recapturas
        text = text.slice(0, idx) + " ".repeat(cand.length) + text.slice(idx + cand.length);
        idx = text.indexOf(cand);
      }
    }
    return found;
  }

  // Parsea requisitos especiales (créditos, "Hasta N semestre aprobado") y nombres
  function parsePrereq(raw) {
    const result = {
      courseNames: [], // array de normalizados
      minCredits: null,
      untilSemester: null
    };
    if (!raw || raw.trim()==="") return result;
    const text = raw.trim();

    // detectar "Hasta N° semestre aprobado" (variantes)
    const semMatch = text.match(/hasta\s*(\d+)\D*semestre/i);
    if (semMatch) result.untilSemester = parseInt(semMatch[1],10);

    // detectar créditos
    const crMatch = text.match(/(\d+)\s*cr[eé]ditos/i);
    if (crMatch) result.minCredits = parseInt(crMatch[1],10);

    // extraer nombres de asignaturas (maneja comas internas)
    result.courseNames = extractCourseNamesFromText(text);

    return result;
  }

  function meetsPrereqs(ramoElement, approvedSet, creditsApproved) {
    const raw = ramoElement.dataset.prerrequisitos || "";
    const parsed = parsePrereq(raw);
    if (DEBUG) console.debug("Evaluando:", ramoElement.textContent.trim(), "parsed:", parsed);

    // 1) verificar untilSemester
    if (parsed.untilSemester) {
      if (!allRamosUntilSemester(parsed.untilSemester, approvedSet)) {
        if (DEBUG) console.debug(`Fallo: necesita todos los ramos hasta ${parsed.untilSemester}° semestre.`);
        return false;
      }
    }
    // 2) verificar minCredits
    if (parsed.minCredits) {
      if (creditsApproved < parsed.minCredits) {
        if (DEBUG) console.debug(`Fallo: necesita ${parsed.minCredits} créditos, tienes ${creditsApproved}.`);
        return false;
      }
    }
    // 3) verificar nombres de ramos listados
    for (const cn of parsed.courseNames) {
      // cn ya está normalizado; si es alias, aliasNorm lo tiene mapeado a canonical
      const canonical = aliasNorm.has(cn) ? aliasNorm.get(cn) : cn;
      // si canonical está en nameToElem map? si no, puede ser que prereq contenga texto no-curso (ignorar)
      // pero si existe en map, requerimos que esté aprobado
      if (nameToElem.has(canonical)) {
        if (!approvedSet.has(canonical)) {
          if (DEBUG) console.debug(`Fallo: requiere curso "${canonical}" no aprobado.`);
          return false;
        }
      } else {
        // Si no está en el mapa (por ejemplo texto raro), intentar usar la cadena tal cual:
        if (!approvedSet.has(cn)) {
          if (DEBUG) console.debug(`Nota: prereq "${cn}" no coincide con ningún curso conocido y no está aprobado.`);
          return false;
        }
      }
    }

    // si pasa todo -> ok
    return true;
  }

  // ---------- UI: contador créditos por semestre ----------
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

  // ---------- MAIN: recalcular disponibilidad ----------
  function recalcAll() {
    const approvedSet = getApprovedSet();
    const credits = getApprovedCredits();
    if (DEBUG) console.debug("Recalculando. aprobados:", Array.from(approvedSet), "credits:", credits);

    ramos.forEach(r => {
      // si ya está aprobado, lo mostramos como disponible
      if (r.classList.contains("aprobado")) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }
      // si no tiene prereq, se marca disponible
      const raw = r.dataset.prerrequisitos || "";
      if (!raw || raw.trim()==="") {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }
      // evaluar prerequisitos
      const ok = meetsPrereqs(r, approvedSet, credits);
      if (ok) { r.classList.add("disponible"); r.classList.remove("bloqueado"); }
      else     { r.classList.add("bloqueado");  r.classList.remove("disponible"); }
    });

    updateCreditCounters();
  }

  // ---------- EVENTOS: tooltip y click ----------
  ramos.forEach(r => {
    let tip = null;
    r.addEventListener("mouseenter", (e) => {
      const text = `Créditos: ${r.dataset.creditos || "0"}\nPrerrequisitos: ${r.dataset.prerrequisitos || "Ninguno"}`;
      tip = createTooltip(text, e.pageX + 8, e.pageY + 8);
    });
    r.addEventListener("mousemove", (e) => { if (tip) { tip.style.left = (e.pageX+8)+"px"; tip.style.top=(e.pageY+8)+"px"; }});
    r.addEventListener("mouseleave", () => { if (tip && tip.parentNode) tip.parentNode.removeChild(tip); tip = null; });

    r.addEventListener("click", () => {
      if (r.classList.contains("bloqueado")) return; // no permitir click
      r.classList.toggle("aprobado");
      // aplicar estilo inmediato (puedes controlar el aspecto en CSS)
      if (r.classList.contains("aprobado")) { r.classList.remove("disponible"); r.classList.add("aprobado"); }
      else { r.classList.remove("aprobado"); r.classList.add("disponible"); }
      recalcAll();
    });
  });

  // función sencilla para tooltip
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

  // Exponer utilidades en consola para debugging manual
  window._mallaDebug = {
    recalc: recalcAll,
    approved: () => Array.from(getApprovedSet()),
    credits: () => getApprovedCredits(),
    names: () => Array.from(nameToElem.keys()),
    alias: () => Array.from(aliasNorm ? aliasNorm : [])
  };
});

