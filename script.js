document.addEventListener("DOMContentLoaded", () => {
  const ramos = document.querySelectorAll(".ramo");

  function contarCreditosCursados() {
    return Array.from(ramos)
      .filter(r => r.classList.contains("cursado"))
      .reduce((total, r) => total + parseInt(r.dataset.creditos), 0);
  }

  function semestreAprobado(n) {
    // Devuelve true si todos los ramos hasta ese semestre están cursados
    const semestres = document.querySelectorAll(".semestre");
    for (let i = 0; i < semestres.length; i++) {
      if (i + 1 > n) break;
      const ramosSem = semestres[i].querySelectorAll(".ramo");
      for (let ramo of ramosSem) {
        if (!ramo.classList.contains("cursado") && !ramo.parentElement.querySelector("h2").textContent.includes("Prácticas")) {
          return false;
        }
      }
    }
    return true;
  }

  function actualizarDisponibilidad() {
    const creditos = contarCreditosCursados();
    ramos.forEach(ramo => {
      if (ramo.classList.contains("cursado")) return;

      const prereqs = ramo.dataset.prerrequisitos.split(",").map(p => p.trim()).filter(p => p);
      let desbloquear = true;

      for (let p of prereqs) {
        if (p.match(/(\d+)\s*créditos/i)) {
          const reqCreditos = parseInt(p);
          if (creditos < reqCreditos) desbloquear = false;
        } else if (p.match(/Hasta\s+(\d+)[°º]\s+semestre\s+aprobado/i)) {
          const reqSem = parseInt(p.match(/(\d+)/)[0]);
          if (!semestreAprobado(reqSem)) desbloquear = false;
        } else if (p !== "" && !Array.from(ramos).find(r => r.textContent.trim() === p && r.classList.contains("cursado"))) {
          desbloquear = false;
        }
      }

      ramo.classList.remove("bloqueado", "disponible");
      ramo.classList.add(desbloquear ? "disponible" : "bloqueado");
    });
  }

  // Añadir tooltip
  ramos.forEach(ramo => {
    const tooltip = document.createElement("span");
    tooltip.className = "tooltip";
    tooltip.textContent = `Créditos: ${ramo.dataset.creditos}\nPrerrequisitos: ${ramo.dataset.prerrequisitos || "Ninguno"}`;
    ramo.appendChild(tooltip);

    ramo.addEventListener("click", () => {
      if (!ramo.classList.contains("disponible") && !ramo.classList.contains("cursado")) return;
      ramo.classList.toggle("cursado");
      actualizarDisponibilidad();
    });
  });

  actualizarDisponibilidad();
});
