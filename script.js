// script.js - versión robusta que busca por nombres completos (no parte en comas)
document.addEventListener("DOMContentLoaded", () => {
  const ramos = Array.from(document.querySelectorAll(".ramo"));
  const semContainers = Array.from(document.querySelectorAll(".semestre"));
  const DEBUG = true; // pon false si no quieres logs en consola

  // normaliza texto (quita tildes, colapsa espacios, pasa a minúsculas)
  function norm(s) {
    if (!s) return "";
    return s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
  }

  // mapa nombre normalizado -> elemento (nombre real)
  const nameList = ramos.map(r => ({
    el: r,
    name: r.textContent.trim(),
    nameNorm: norm(r.textContent.trim()),
    credits: parseInt(r.dataset.creditos || 0, 10),
    rawPrereq: r.dataset.prerrequisitos || ""
  }));

  // lista de nombres normalizados ordenada por longitud (para coincidir nombres largos primero)
  const nameNormsSorted = nameList
    .map(x => x.nameNorm)
    .sort((a,b) => b.length - a.length);

  // map semestre number -> array de ramos (element)
  const semMap = new Map();
  semContainers.forEach(container => {
    const h = container.querySelector("h2");
    const match = h ? h.innerText.match(/(\d+)\s*°?/) : null;
    let num = null;
    if (match) num = parseInt(match[1], 10);
    // si no se detecta número (ej: "Prácticas"), lo omitimos
    if (num) {
      semMap.set(num, Array.from(container.querySelectorAll(".ramo")));
    }
  });

  // Helper: devuelve conjunto (Set) de nombres normalizados aprobados
  function getApprovedSet() {
    const s = new Set();
    ramos.forEach(r => {
      if (r.classList.contains("aprobado")) s.add(norm(r.textContent.trim()));
    });
    return s;
  }
  function getApprovedCredits() {
    let total = 0;
    ramos.forEach(r => {
      if (r.classList.contains("aprobado")) {
        const c = parseInt(r.dataset.creditos || 0, 10);
        if (!isNaN(c)) total += c;
      }
    });
    return total;
  }

  // Comprueba si todos los ramos hasta el semestre 'n' están aprobados
  function allUntilSemester(n, approvedSet) {
    for (let i = 1; i <= n; i++) {
      const arr = semMap.get(i) || [];
      for (const r of arr) {
        if (!approvedSet.has(norm(r.textContent.trim()))) return false;
      }
    }
    return true;
  }

  // Buscar nombres de asignaturas dentro de un texto de prerrequisitos (resuelve comas internas)
  // Devuelve array de nombres normales (no normalizados)
  function extractCourseNamesFromText(raw) {
    if (!raw) return [];
    let remaining = norm(raw);
    const found = [];

    // eliminar conectores comunes que no son nombres: '+' -> ' ' , ' y ' -> ' ', ';' -> ' '
    remaining = remaining.replace(/\+/g, " ")
                         .replace(/\by\b/gi, " ")
                         .replace(/;/g, " ");

    // Buscamos nombres completos (los más largos primero)
    for (const candidate of nameNormsSorted) {
      // while candidate aparece en remaining, extraerlo y reemplazar por espacios para evitar recuento duplicado
      let idx = remaining.indexOf(candidate);
      while (idx !== -1) {
        found.push(candidate);
        // reemplaza la porción encontrada con espacios para mantener índices
        const before = remaining.slice(0, idx);
        const after = remaining.slice(idx + candidate.length);
        remaining = (before + " ".repeat(candidate.length) + after).trim();
        idx = remaining.indexOf(candidate);
      }
    }

    // returned found as normalized names (we will compare with normalized approved set)
    return found;
  }

  // Evalúa si todos los requisitos de rawPrereq están cumplidos (true/false)
  function evaluatePrereq(rawPrereq, approvedSet, credits) {
    if (!rawPrereq || rawPrereq.trim() === "") return true;

    const text = rawPrereq.trim();

    // 1) comprobar "Hasta N° semestre aprobado" (puede venir como 'Hasta 3° semestre aprobado' o 'Hasta 3 semestre aprobado')
    const semMatch = text.match(/hasta\s*(\d+)\s*°?\s*.*semestre/i);
    if (semMatch) {
      const n = parseInt(semMatch[1], 10);
      if (!allUntilSemester(n, approvedSet)) {
        if (DEBUG) console.debug(`REQ: "Hasta ${n}° semestre" NO cumplido.`);
        return false;
      }
      // Eliminamos esa parte del texto para procesar otros requisitos combinados (si existen)
      // (seguimos verificando créditos/nombres abajo)
    }

    // 2) comprobar requisitos por créditos (ej. '220 créditos', '270 créditos')
    const creditMatch = text.match(/(\d+)\s*cr[eé]ditos/);
    if (creditMatch) {
      const need = parseInt(creditMatch[1], 10);
      if (credits < need) {
        if (DEBUG) console.debug(`REQ: "${need} créditos" NO cumplido (aprobados ${credits}).`);
        return false;
      }
    }

    // 3) extraer nombres de asignaturas incluidos en la cadena (esto maneja comas internas)
    const namesFound = extractCourseNamesFromText(text);

    // para cada nombre encontrado, comprobar que esté en aprobado
    for (const nm of namesFound) {
      if (!approvedSet.has(nm)) {
        if (DEBUG) {
          const human = nameList.find(x => x.nameNorm === nm);
          console.debug(`REQ: "${human? human.name : nm}" NO cumplido (no está aprobado).`);
        }
        return false;
      }
    }

    // Si ninguna regla falló -> OK
    return true;
  }

  // Recalcula disponibilidad de todos los ramos
  function actualizarDisponibilidad() {
    const approvedSet = getApprovedSet();
    const credits = getApprovedCredits();

    if (DEBUG) console.debug("----- recalculando disponibilidad -----", "aprobados:", Array.from(approvedSet), "creditos:", credits);

    ramos.forEach(r => {
      // si ya está aprobado, lo dejamos disponible
      if (r.classList.contains("aprobado")) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }
      const raw = r.dataset.prerrequisitos || "";
      const ok = evaluatePrereq(raw, approvedSet, credits);
      if (ok) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
      } else {
        r.classList.add("bloqueado");
        r.classList.remove("disponible");
      }
    });
  }

  // Tooltip y click handlers
  ramos.forEach(r => {
    let tip = null;
    r.addEventListener("mouseenter", (e) => {
      const texto = `Créditos: ${r.dataset.creditos || "0"}\nPrerrequisitos: ${r.dataset.prerrequisitos || "Ninguno"}`;
      tip = createTooltip(texto, e.pageX + 8, e.pageY + 8);
    });
    r.addEventListener("mousemove", (e) => { if (tip) { tip.style.left = (e.pageX + 8) + "px"; tip.style.top = (e.pageY + 8) + "px"; }});
    r.addEventListener("mouseleave", () => { if (tip && tip.parentNode) tip.parentNode.removeChild(tip); tip = null; });

    r.addEventListener("click", () => {
      // solo permitir click si está disponible o ya aprobado
      if (r.classList.contains("bloqueado")) return;
      r.classList.toggle("aprobado");
      actualizarDisponibilidad();
    });
  });

  // crea tooltip sencillo (estilo inline)
  function createTooltip(text, x, y) {
    const t = document.createElement("div");
    t.className = "malla-tooltip";
    t.innerText = text;
    Object.assign(t.style, {
      position: "absolute",
      left: x + "px",
      top: y + "px",
      background: "#fff",
      border: "1px solid #ddd",
      padding: "6px 8px",
      borderRadius: "6px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      zIndex: 9999,
      whiteSpace: "pre-line",
      fontSize: "13px",
      color: "#333"
    });
    document.body.appendChild(t);
    return t;
  }

  // inicial
  actualizarDisponibilidad();

  // Exponer util para debugging en consola
  window._malla = {
    recalc: actualizarDisponibilidad,
    approved: () => Array.from(getApprovedSet()),
    credits: () => getApprovedCredits(),
    listNames: () => nameList.map(x => ({name: x.name, norm: x.nameNorm, prereq: x.rawPrereq}))
  };
});

