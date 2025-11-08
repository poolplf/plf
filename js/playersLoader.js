console.log("🏒 Joueurs loader initialized");

(async function loadJoueurs() {
  try {
    const files = [
      "Joueurs", "Equipes", "StatsJoueurs", "StatsGardiens",
      "PLF", "Salaires", "Annees", "Positions", "StatutsJoueurs"
    ];
    const data = {};

    await Promise.all(
      files.map(async name => {
        const res = await fetch(`./data/${name}.json`);
        if (!res.ok) throw new Error(`Failed to load ${name}.json`);
        data[name] = await res.json();
      })
    );

    const {
      Joueurs, Equipes, StatsJoueurs, StatsGardiens,
      PLF, Salaires, Annees
    } = data;

    // === Utilities ===
    const getAge = birthDateStr => {
      const birth = new Date(birthDateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };

    const getShortName = fkEquipe => {
      const eq = Equipes.find(e => Number(e.PkEquipe) === Number(fkEquipe));
      return eq ? (eq.ShortName || eq.Shortname || eq.Nom || "?") : "?";
    };

    const getOwnerShortName = fkPLF => {
      const plf = PLF.find(p => Number(p.PkPLF) === Number(fkPLF));
      if (!plf) return "?";
      const eq = Equipes.find(e => Number(e.PkEquipe) === Number(plf.FkEquipe));
      return eq ? (eq.ShortName || eq.Shortname || eq.Nom || "?") : "?";
    };

    const getSalary = fkSalaire => {
      const s = Salaires.find(sal => Number(sal.PKSalaire) === Number(fkSalaire));
      return s ? (s.Salaire ?? 0) : 0;
    };

    const currentAnnee = Annees.find(a => String(a.IsCurrent).toLowerCase() === "true");
    const currentIndex = Annees.findIndex(a => a === currentAnnee);
    const prevAnnee = Annees[currentIndex - 1];
    const pkPrev = prevAnnee ? Number(prevAnnee.PKAnnee ?? prevAnnee.PkAnnee) : null;

    // === Build enriched player data once ===
    let playersData = Joueurs.filter(j => Number(j.FkStatut) === 1).map(j => {
      // compute derived stats
      const teamShort = getShortName(j.FkEquipe);
      const owner = getOwnerShortName(j.FKPLF);
      const age = j.DateNaissance ? getAge(j.DateNaissance) : "";
      const salary = getSalary(j.FKPLFSalaire);

      // games + points
      let games = 0, points = 0;
      if (pkPrev) {
        if ([1, 2, 3, 6].includes(Number(j.FKPosition))) {
          const s = StatsJoueurs.find(
            s => Number(s.FkJoueur) === Number(j.PKJoueurs) && Number(s.FkAnnee) === pkPrev
          );
          if (s) {
            const buts = Number(s.Buts || 0);
            const passes = Number(s.Passes || 0);
            const butsGagnants = Number(s.ButsGagnants || 0);
            games = Number(s.Parties || 0);
            points = buts + passes + butsGagnants;
          }
        } else if ([4, 5, 7].includes(Number(j.FKPosition))) {
          const s = StatsJoueurs.find(
            s => Number(s.FkJoueur) === Number(j.PKJoueurs) && Number(s.FkAnnee) === pkPrev
          );
          if (s) {
            const buts = Number(s.Buts || 0);
            const passes = Number(s.Passes || 0);
            const butsGagnants = Number(s.ButsGagnants || 0);
            games = Number(s.Parties || 0);
            points = (buts * 2) + passes + butsGagnants;
          }
        } else if (Number(j.FKPosition) === 8) {
          const s = StatsGardiens.find(
            g => Number(g.FkJoueur) === Number(j.PKJoueurs) && Number(g.FkAnnee) === pkPrev
          );
          if (s) {
            const victoires = Number(s.Victoire || 0);
            const defProlon = Number(s.DefProlon || 0);
            const blanchissage = Number(s.Blanchissage || 0);
            const buts = Number(s.Buts || 0);
            const passes = Number(s.Passes || 0);
            games = Number(s.Parties || 0);
            points = (victoires * 2) + defProlon + (blanchissage * 3) + (buts * 3) + passes;
          }
        }
      }

      return { j, teamShort, owner, age, salary, games, points };
    });

// === Sort by Salary DESC, then Points DESC ===
playersData.sort((a, b) => {
  if (b.salary !== a.salary) return b.salary - a.salary;
  return b.points - a.points;
});

    // === Filtering, pagination, rendering use playersData now ===
    let filteredPlayers = playersData;
    let PAGE_SIZE = 100;
    let currentPage = 1;

    function filterPlayers() {
      const cbFwd = document.querySelector('input[name="cbForwards"]').checked;
      const cbDef = document.querySelector('input[name="cbDefenses"]').checked;
      const cbG = document.querySelector('input[name="cbGoalies"]').checked;
      const cbAll = document.querySelector('input[name="cbAll"]').checked;
      const cbFree = document.querySelector('input[name="cbFree"]').checked;
      const searchVal = document.getElementById("playerName").value.toLowerCase();

      const posMap = {
        forward: [1, 2, 3, 6],
        defense: [4, 5, 7],
        goalie: [8]
      };

      let list = playersData;

      if (!cbAll) {
        const active = [];
        if (cbFwd) active.push(...posMap.forward);
        if (cbDef) active.push(...posMap.defense);
        if (cbG) active.push(...posMap.goalie);

        if (active.length > 0) {
          list = list.filter(p => active.includes(Number(p.j.FKPosition)));
        }
      }

        if (searchVal) {
          list = list.filter(p =>
            `${p.j.Prenom || ""} ${p.j.Nom || ""}`.toLowerCase().includes(searchVal)
          );
        }

        if (cbFree) {
          list = list.filter(p => Number(p.j.FKPLF) === 27); // ✅ your new condition
        }

        filteredPlayers = list;
        currentPage = 1;
        renderPage();
    }

    function renderPage() {
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const page = filteredPlayers.slice(start, end);
      renderTable(page);
      renderFooter();
    }

function renderFooter() {
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));

  document.querySelectorAll("#pageInfo, #pageInfo_2").forEach(el => {
    el.textContent = `Page ${currentPage} of ${totalPages}`;
  });
  document.querySelectorAll("#totalInfo, #totalInfo_2").forEach(el => {
    el.textContent = `(Total: ${filteredPlayers.length})`;
  });

  document.querySelectorAll("#btnPrev, #btnPrev_2").forEach(el => {
    el.disabled = currentPage <= 1;
  });
  document.querySelectorAll("#btnNext, #btnNext_2").forEach(el => {
    el.disabled = currentPage >= totalPages;
  });
}

    function renderTable(list) {
      const tbody = document.querySelector("#listJoueurs tbody");
      tbody.innerHTML = "";
      list.forEach(p => {
        const { j, teamShort, owner, age, games, points, salary } = p;
        const name = `${j.Prenom || ""} ${j.Nom || ""}`.trim();
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="text-align:left;">${name}</td>
          <td>${teamShort}</td>
          <td>${age}</td>
          <td>${games}</td>
          <td>${points}</td>
          <td>${salary}</td>
          <td><a href="#" onclick="loadTeams(${p.j.FKPLF})">${owner}</a></td>
        `;
        tbody.appendChild(tr);
      });
    }

    // === Event bindings ===
    document.getElementById("playerName").addEventListener("input", filterPlayers);

// ✅ Checkbox + Search synchronization logic
const cbAll = document.querySelector('input[name="cbAll"]');
const cbForwards = document.querySelector('input[name="cbForwards"]');
const cbDefenses = document.querySelector('input[name="cbDefenses"]');
const cbGoalies = document.querySelector('input[name="cbGoalies"]');
const cbFreeBox = document.querySelector('input[name="cbFree"]');
const positionCheckboxes = [cbForwards, cbDefenses, cbGoalies];
const searchBox = document.getElementById("playerName");

// --- Checkbox logic ---
cbAll.addEventListener("change", () => {
  if (cbAll.checked) {
    positionCheckboxes.forEach(cb => (cb.checked = false));
     cbFreeBox.checked = false;   // ✅ clear "Libre"
  }
  searchBox.value = "";  // ✅ clear text search
  filterPlayers();
});

cbFreeBox.addEventListener("change", filterPlayers);

positionCheckboxes.forEach(cb => {
  cb.addEventListener("change", () => {
    if (positionCheckboxes.some(c => c.checked)) {
      cbAll.checked = false;
    }
    searchBox.value = "";  // ✅ clear text search
    filterPlayers();
  });
});

// --- Search logic ---
searchBox.addEventListener("input", () => {
  // ✅ clear all checkboxes when typing
  if (searchBox.value.trim() !== "") {
    cbAll.checked = false;
    positionCheckboxes.forEach(cb => (cb.checked = false));
  }
  filterPlayers();
});

// Handle both sets of pagination buttons
document.querySelectorAll("#btnPrev, #btnPrev_2").forEach(btn =>
  btn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage();
    }
  })
);

document.querySelectorAll("#btnNext, #btnNext_2").forEach(btn =>
  btn.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
    if (currentPage < totalPages) {
      currentPage++;
      renderPage();
    }
  })
);

// Handle both sets of page-size buttons
document.querySelectorAll("#btn50, #btn50_2").forEach(btn =>
  btn.addEventListener("click", () => {
    PAGE_SIZE = 50;
    document.querySelectorAll("#btn50, #btn50_2").forEach(b => b.classList.add("active"));
    document.querySelectorAll("#btn100, #btn100_2").forEach(b => b.classList.remove("active"));
    currentPage = 1;
    renderPage();
  })
);

document.querySelectorAll("#btn100, #btn100_2").forEach(btn =>
  btn.addEventListener("click", () => {
    PAGE_SIZE = 100;
    document.querySelectorAll("#btn100, #btn100_2").forEach(b => b.classList.add("active"));
    document.querySelectorAll("#btn50, #btn50_2").forEach(b => b.classList.remove("active"));
    currentPage = 1;
    renderPage();
  })
);

    // === Initial render ===
    renderPage();
    console.log("✅ Joueurs table ready — sorted by Points then Salary DESC");
  } catch (err) {
    console.error("❌ Error loading players:", err);
  }
})();
