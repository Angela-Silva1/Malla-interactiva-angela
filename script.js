// script.js

document.addEventListener("DOMContentLoaded", function () {
  const ramos = document.querySelectorAll(".ramo");

  function actualizarDisponibilidad() {
    ramos.forEach((ramo) => {
      if (ramo.classList.contains("aprobado")) return;

      const requisitos = ramo.dataset.prerrequisitos.split(",").map(r => r.trim()).filter(Boolean);

      const cumplidos = requisitos.every((req) => {
        if (req === "Hasta 3° semestre aprobado") {
          return [...ramos].filter(r => r.closest('.semestre').querySelector('h2').innerText.includes('1°') ||
                                          r.closest('.semestre').querySelector('h2').innerText.includes('2°') ||
                                          r.closest('.semestre').querySelector('h2').innerText.includes('3°'))
                             .every(r => r.classList.contains("aprobado"));
        } else if (req === "Hasta 4° semestre aprobado") {
          return [...ramos].filter(r => r.closest('.semestre').querySelector('h2').innerText.includes('1°') ||
                                          r.closest('.semestre').querySelector('h2').innerText.includes('2°') ||
                                          r.closest('.semestre').querySelector('h2').innerText.includes('3°') ||
                                          r.closest('.semestre').querySelector('h2').innerText.includes('4°'))
                             .every(r => r.classList.contains("aprobado"));
        } else if (req === "Hasta 5° semestre aprobado") {
          return [...ramos].filter(r => /[1-5]° Semestre/.test(r.closest('.semestre').querySelector('h2').innerText))
                             .every(r => r.classList.contains("aprobado"));
        } else if (req === "270 créditos + Práctica I") {
          const total = [...ramos].filter(r => r.classList.contains("aprobado"))
                                  .reduce((sum, r) => sum + parseInt(r.dataset.creditos || 0), 0);
          const practica1 = [...ramos].find(r => r.textContent.includes("Práctica I") && r.classList.contains("aprobado"));
          return total >= 270 && practica1;
        } else if (req === "220 créditos + Práctica I") {
          const total = [...ramos].filter(r => r.classList.contains("aprobado"))
                                  .reduce((sum, r) => sum + parseInt(r.dataset.creditos || 0), 0);
          const practica1 = [...ramos].find(r => r.textContent.includes("Práctica I") && r.classList.contains("aprobado"));
          return total >= 220 && practica1;
        } else if (req === "309 créditos + Práctica II") {
          const total = [...ramos].filter(r => r.classList.contains("aprobado"))
                                  .reduce((sum, r) => sum + parseInt(r.dataset.creditos || 0), 0);
          const practica2 = [...ramos].find(r => r.textContent.includes("Práctica II") && r.classList.contains("aprobado"));
          return total >= 309 && practica2;
        } else if (req) {
          const ramoRequisito = [...ramos].find((r) => r.textContent.trim() === req);
          return ramoRequisito && ramoRequisito.classList.contains("aprobado");
        }
        return true;
      });

      if (cumplidos) {
        ramo.classList.remove("bloqueado");
        ramo.classList.add("disponible");
      }
    });
  }

  ramos.forEach((ramo) => {
    ramo.addEventListener("click", function () {
      if (!ramo.classList.contains("bloqueado")) {
        ramo.classList.toggle("aprobado");
        ramo.classList.toggle("disponible");
        ramo.style.textDecoration = ramo.classList.contains("aprobado") ? "line-through" : "none";
        actualizarDisponibilidad();
      }
    });

    ramo.addEventListener("mouseover", function () {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.innerHTML = `<strong>Créditos:</strong> ${ramo.dataset.creditos}<br><strong>Prerrequisitos:</strong> ${ramo.dataset.prerrequisitos || "Ninguno"}`;
      document.body.appendChild(tooltip);
      const rect = ramo.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;

      ramo.addEventListener("mouseout", function () {
        document.body.removeChild(tooltip);
      }, { once: true });
    });
  });

  actualizarDisponibilidad();
});

