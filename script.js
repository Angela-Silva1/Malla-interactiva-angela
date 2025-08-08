document.addEventListener("DOMContentLoaded", () => {
  const ramos = document.querySelectorAll(".ramo");

  ramos.forEach(ramo => {
    ramo.addEventListener("click", () => {
      if (ramo.classList.contains("bloqueado")) return;
      ramo.classList.toggle("aprobado");
      actualizarEstado();
    });

    const creditos = ramo.dataset.creditos;
    const prereq = ramo.dataset.prerrequisitos;

    if (creditos || prereq) {
      const textoTooltip = `Créditos: ${creditos}\nPrerrequisitos: ${prereq || "Ninguno"}`;
      ramo.setAttribute("data-tooltip", textoTooltip);
    }
  });

  function actualizarEstado() {
    const aprobados = Array.from(document.querySelectorAll(".ramo.aprobado")).map(r => r.textContent.trim());

    ramos.forEach(ramo => {
      const prereq = ramo.dataset.prerrequisitos;
      if (!prereq || ramo.classList.contains("aprobado")) return;

      const lista = prereq.split(",").map(r => r.trim());
      const cumplidos = lista.every(req => aprobados.includes(req));

      if (cumplidos) {
        ramo.classList.remove("bloqueado");
        ramo.classList.add("disponible");
      }
    });

    contarCreditosPorSemestre();
  }

  function contarCreditosPorSemestre() {
    const semestres = document.querySelectorAll(".semestre");
    semestres.forEach(sem => {
      let total = 0;
      const ramos = sem.querySelectorAll(".ramo.aprobado");
      ramos.forEach(r => {
        total += parseInt(r.dataset.creditos);
      });

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
});

