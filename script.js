document.addEventListener("DOMContentLoaded", () => {
  const ramos = document.querySelectorAll(".ramo");

  // Al hacer clic en un ramo aprobado/disponible → marcar/desmarcar
  ramos.forEach(ramo => {
    ramo.addEventListener("click", () => {
      if (ramo.classList.contains("disponible") || ramo.classList.contains("aprobado")) {
        ramo.classList.toggle("aprobado");
        actualizarDisponibilidad();
      }
    });

    // Tooltip para mostrar créditos y prerrequisitos
    ramo.addEventListener("mouseenter", () => {
      const creditos = ramo.getAttribute("data-creditos");
      const prereq = ramo.getAttribute("data-prerrequisitos") || "Ninguno";
      ramo.title = `Créditos: ${creditos}\nPrerrequisitos: ${prereq}`;
    });
  });

  function actualizarDisponibilidad() {
    const aprobados = Array.from(document.querySelectorAll(".ramo.aprobado")).map(r => r.textContent.trim());
    const creditosAprobados = calcularCreditos(aprobados);

    ramos.forEach(ramo => {
      if (!ramo.classList.contains("aprobado")) {
        const requisitosTexto = ramo.getAttribute("data-prerrequisitos") || "";
        const requisitos = requisitosTexto.split(",").map(r => r.trim()).filter(r => r !== "");

        if (requisitos.length === 0 || cumpleTodosRequisitos(requisitos, aprobados, creditosAprobados)) {
          ramo.classList.add("disponible");
          ramo.classList.remove("bloqueado");
        } else {
          ramo.classList.add("bloqueado");
          ramo.classList.remove("disponible");
        }
      }
    });
  }

  function calcularCreditos(aprobados) {
    let total = 0;
    aprobados.forEach(nombre => {
      const ramoEl = Array.from(ramos).find(r => r.textContent.trim() === nombre);
      if (ramoEl) {
        total += parseInt(ramoEl.getAttribute("data-creditos")) || 0;
      }
    });
    return total;
  }

  function cumpleTodosRequisitos(requisitos, aprobados, creditos) {
    return requisitos.every(req => {
      // Caso: "Hasta N° semestre aprobado"
      const matchSemestre = req.match(/Hasta\\s*(\\d+)°\\s*semestre aprobado/i);
      if (matchSemestre) {
        return todosHastaSemestre(parseInt(matchSemestre[1]), aprobados);
      }

      // Caso: "X créditos"
      const matchCreditos = req.match(/(\\d+)\\s*créditos/i);
      if (matchCreditos) {
        return creditos >= parseInt(matchCreditos[1]);
      }

      // Caso: nombre normal de ramo
      return aprobados.includes(req);
    });
  }

  function todosHastaSemestre(numSem, aprobados) {
    const semestres = document.querySelectorAll(".semestre");
    for (let i = 0; i < numSem; i++) {
      const ramosSem = semestres[i].querySelectorAll(".ramo");
      for (let r of ramosSem) {
        if (!aprobados.includes(r.textContent.trim())) {
          return false;
        }
      }
    }
    return true;
  }
});

