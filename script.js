// script.js - Versión robusta y corregida
document.addEventListener("DOMContentLoaded", () => {
  const DEBUG = false;
  const ramos = Array.from(document.querySelectorAll(".ramo"));
  const semContainers = Array.from(document.querySelectorAll(".semestre"));

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
    // arreglos de singular/plural y errores comunes
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
    result.courseNames = extractCourse


