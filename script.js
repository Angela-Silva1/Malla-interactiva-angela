// script.js (versión robusta)
document.addEventListener("DOMContentLoaded", () => {
  const ramos = Array.from(document.querySelectorAll(".ramo"));
  const semContainers = Array.from(document.querySelectorAll(".semestre"));

  // --- utilidades ---
  function normalizeText(s) {
    if (!s) return "";
    // quitar diacríticos, colapsar espacios y lower case
    return s.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
  }

  // mapa nombre normalizado -> elemento
  const nameToElem = new Map();
  ramos.forEach(r => {
    const name = normalizeText(r.textContent);
    nameToElem.set(name, r);
  });

  // mapa semnumero -> lista de ramos
  const semMap = new Map();
  semContainers.forEach(container => {
    const h = container.querySelector("h2");
    const text = h ? h.innerText : "";
    const m = text.match(/(\d+)\s*°?/);
    if (m) {
      const num = parseInt(m[1], 10);
      semMap.set(num, Array.from(container.querySelectorAll(".ramo")));
    }
  });

  // --- tooltip simple (crea estilo en runtime si no existe) ---
  function createTooltip(text, x, y) {
    const t = document.createElement("div");
    t.className = "malla-tooltip";
    t.innerHTML = text;
    Object.assign(t.style, {
      position: "absolute",
      zIndex: 9999,
      background: "#fff",
      border: "1px solid #e0d0db",
      padding: "8px",
      borderRadius: "6px",
      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
      left: x + "px",
      top: y + "px",
      whiteSpace: "pre-line",
      fontSize: "13px",
      color: "#333"
    });
    document.body.appendChild(t);
    return t;
  }

  // --- cálculo créditos aprobados y conjunto de aprobados (normalizado) ---
  function getApprovedSet() {
    const approved = new Set();
    ramos.forEach(r => {
      if (r.classList.contains("aprobado")) {
        approved.add(normalizeText(r.textContent));
      }
    });
    return approved;
  }
  function getCreditsApproved() {
    let total = 0;
    ramos.forEach(r => {
      if (r.classList.contains("aprobado")) {
        const c = parseInt(r.dataset.creditos || 0, 10);
        if (!isNaN(c)) total += c;
      }
    });
    return total;
  }

  // --- comprobar si todos los ramos hasta un semestre están aprobados ---
  function allUntilSemester(n, approvedSet) {
    for (let i = 1; i <= n; i++) {
      const arr = semMap.get(i) || [];
      for (const r of arr) {
        if (!approvedSet.has(normalizeText(r.textContent))) return false;
      }
    }
    return true;
  }

  // --- evaluar si una lista de tokens de requisito se cumple ---
  function tokenSatisfied(token, approvedSet, credits) {
    if (!token) return true;
    const t = token.toLowerCase().trim();

    // 1) Hasta N° semestre aprobado  (acepta variaciones: 'hasta 3° semestre', 'hasta 3 semestre aprobado', etc.)
    const mSem = t.match(/hasta\s*(\d+)\D*semestre/i);
    if (mSem) {
      const lim = parseInt(mSem[1], 10);
      const ok = allUntilSemester(lim, approvedSet);
      if (!ok) console.debug(`Requisito "${token}" no cumplido: no están aprobados todos los ramos hasta ${lim}° semestre.`);
      return ok;
    }

    // 2) X créditos  (ej: "220 créditos")
    const mCr = t.match(/(\d+)\s*cr[eé]ditos/);
    if (mCr) {
      const need = parseInt(mCr[1], 10);
      const ok = credits >= need;
      if (!ok) console.debug(`Requisito "${token}" no cumplido: créditos aprobados ${credits} < ${need}.`);
      return ok;
    }

    // 3) Caso combinado con '+' o 'y' ya fue separado antes; aquí tratamos token como nombre de ramo o práctica
    const normToken = normalizeText(token);
    const ok = approvedSet.has(normToken);
    if (!ok) console.debug(`Requisito "${token}" no cumplido: ramo "${token}" no está en aprobados.`);
    return ok;
  }

  // --- función central que decide si una asignatura se desbloquea ---
  function evaluatePrerequisites(rawPrereq, approvedSet, credits) {
    if (!rawPrereq) return true;
    // Normalizar separadores: '+' o ' y ' -> ',' ; también ';' -> ','
    const normalized = rawPrereq.replace(/\+/g, ",").replace(/\by\b/gi, ",").replace(/;/g, ",");
    // dividir por comas
    const parts = normalized.split(",").map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) return true;

    // Todos los tokens deben estar satisfechos
    for (const part of parts) {
      if (!tokenSatisfied(part, approvedSet, credits)) return false;
    }
    return true;
  }

  // --- actualizar disponibilidad de todos los ramos ---
  function actualizarDisponibilidad() {
    const approvedSet = getApprovedSet();
    const credits = getCreditsApproved();

    ramos.forEach(r => {
      // si ya está aprobado, forzamos que sea disponible (no bloqueado)
      if (r.classList.contains("aprobado")) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
        return;
      }

      const raw = r.dataset.prerrequisitos || "";
      const disponible = evaluatePrerequisites(raw, approvedSet, credits);

      if (disponible) {
        r.classList.add("disponible");
        r.classList.remove("bloqueado");
      } else {
        r.classList.add("bloqueado");
        r.classList.remove("disponible");
      }
    });

    // opcional: mostrar en consola resumen de créditos y aprobados
    console.debug("Créditos aprobados:", credits, "Aprobados:", Array.from(approvedSet));
  }

  // --- manejadores click/tooltip ---
  ramos.forEach(r => {
    // tooltip con info
    let tooltipEl = null;
    r.addEventListener("mouseenter", (e) => {
      const c = r.dataset.creditos || "0";
      const p = r.dataset.prerrequisitos || "Ninguno";
      tooltipEl = createTooltip(`Créditos: ${c}\nPrerrequisitos: ${p}`, e.pageX + 8, e.pageY + 8);
    });
    r.addEventListener("mousemove", (e) => {
      if (tooltipEl) {
        tooltipEl.style.left = (e.pageX + 8) + "px";
        tooltipEl.style.top = (e.pageY + 8) + "px";
      }
    });
    r.addEventListener("mouseleave", () => {
      if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
      tooltipEl = null;
    });

    // click: sólo funciona si está disponible (o ya aprobado)
    r.addEventListener("click", () => {
      if (r.classList.contains("bloqueado")) return; // no hacer nada
      r.classList.toggle("aprobado");
      // estilo visual inmediato (puedes controlarlo con CSS)
      if (r.classList.contains("aprobado")) {
        r.classList.remove("disponible");
        r.classList.add("aprobado");
      } else {
        r.classList.remove("aprobado");
        r.classList.add("disponible");
      }
      actualizarDisponibilidad();
    });
  });

  // inicial
  actualizarDisponibilidad();

  // Exponer función para debug manual desde consola si quieres
  window._malla_debug = {
    recalc: actualizarDisponibilidad,
    credits: () => getCreditsApproved(),
    approved: () => Array.from(getApprovedSet())
  };
});
