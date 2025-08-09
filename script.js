document.addEventListener("DOMContentLoaded", () => {
  const ramos = document.querySelectorAll(".ramo");

  // Marcar/desmarcar un ramo y verificar desbloqueos
  ramos.forEach(ramo => {
    ramo.addEventListener("click", () => {
      if (ramo.classList.contains("disponible")) {
        ramo.classList.toggle("aprobado");
        actualizarDisponibilidad();
      }
    });
  });

  function actualizarDisponibilidad() {
    const aprobados = Array.from(document.querySelectorAll(".ramo.aprobado")).map(r => r.textContent.trim());
    const creditosAprobados = calcularCreditos(aprobados);

    ramos.forEach(ramo => {
      if (!ramo.classList.contains("aprobado")) {
        const requisitos = ramo.getAttribute("data-prerrequisitos").split(",").map(r => r.trim()).filter(r => r);
        if (requisitos.length === 0) {
          ramo.classList.add("disponible");
          ramo.classList.remove("bloqueado");
        } else {
          if (cumpleRequisitos(requisitos, aprobados, creditosAprobados)) {
            ramo.classList.add("disponible");
            ramo.classList.remove("bloqueado");
          } else {
            ramo.classList.add("bloqueado");
            ramo.classList.remove("disponible");
          }
        }
      }
    });
  }

  function calcularCreditos(listaAprobados) {
    let total = 0;
    listaAprobados.forEach(nombre => {
      const ramoEl = Array.from(ramos).find(r => r.textContent.trim() === nombre);
      if (ramoEl) {
        total += parseInt(ramoEl.getAttribute("data-creditos")) || 0;
      }
    });
    return total;
  }

  function cumpleRequisitos(requisitos, aprobados, creditos) {
    return requisitos.every(req => {
      // Caso: hasta X semestre aprobado
      const matchSemestre = req.match(/Hasta (\d+)° semestre aprobado/i);
      if (matchSemestre) {
        const limite = parseInt(matchSemestre[1]);
        return todosRamosHastaSemestre(limite, aprobados);
      }

      // Caso: créditos + ramo específico
      const matchCreditos = req.match(/(\d+)\s*créditos/i);
      if (matchCreditos) {
        const minCreditos = parseInt(matchCreditos[1]);
        return creditos >= minCreditos || aprobados.includes(req.replace(matchCreditos[0], "").replace("+", "").trim());
      }

      // Caso normal: requisito es un ramo por nombre
      return aprobados.includes(req);
    });
  }

  function todosRamosHastaSemestre(numSem, aprobados) {
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
