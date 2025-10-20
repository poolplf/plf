console.log("🧩 Drafts loader initialized");

(async function loadDrafts() {
  try {
    console.log("⚙️ Entering loadDrafts async block...");

    // --- 1️⃣ Load JSON data once ---
    const files = ["Choix", "Annees", "PLF", "Equipes", "Joueurs"];
    const data = {};

    await Promise.all(
      files.map(async name => {
        const res = await fetch(`data/${name}.json`);
        if (!res.ok) throw new Error(`Failed to load ${name}.json`);
        data[name] = await res.json();
      })
    );

    const { Choix, Annees, PLF, Equipes, Joueurs } = data;
    console.log(
      "✅ Data loaded:",
      "Choix:", Choix.length,
      "Annees:", Annees.length,
      "PLF:", PLF.length,
      "Equipes:", Equipes.length,
      "Joueurs:", Joueurs.length
    );

    // --- 2️⃣ Helpers ---
    const getPkAnnee = a => Number(a.PKAnnee ?? a.PkAnnee);

    const parseYear = str => {
      if (!str) return 0;
      const match = String(str).match(/\d{4}/);
      return match ? Number(match[0]) : 0;
    };

    const getTeamShortName = fkPLF => {
      const plf = PLF.find(p => Number(p.PkPLF) === Number(fkPLF));
      if (!plf) return "";
      const eq = Equipes.find(e => Number(e.PkEquipe) === Number(plf.FkEquipe));
      return eq ? (eq.ShortName || eq.Shortname || eq.Nom || "") : "";
    };

    const getPlayerName = fkJoueur => {
      const j = Joueurs.find(j => Number(j.PKJoueurs || j.PkJoueur) === Number(fkJoueur));
      return j ? `${j.Prenom || ""} ${j.Nom || ""}`.trim() : "";
    };

    // --- 3️⃣ Year ordering ---
    const currentAnnee = Annees.find(a => String(a.IsCurrent).toLowerCase() === "true");
    if (!currentAnnee) {
      console.error("❌ No current Annee found (IsCurrent)");
      return;
    }

    const yearsSortedAsc = [...Annees].sort(
      (a, b) => parseYear(a.Annee) - parseYear(b.Annee)
    );

    const currentIndex = yearsSortedAsc.findIndex(a => a.Annee === currentAnnee.Annee);
    const nextTwo = yearsSortedAsc.slice(currentIndex + 1, currentIndex + 3);
    const futureBlock = [currentAnnee, ...nextTwo];

    const remaining = yearsSortedAsc
      .filter(a => !futureBlock.includes(a))
      .sort((a, b) => parseYear(b.Annee) - parseYear(a.Annee));

    let finalYears = [...futureBlock, ...remaining];

    // --- 4️⃣ Keep only years that have Choix entries ---
    const yearsWithChoix = Choix.map(c => Number(c.FkAnnee ?? c.FKAnnee));
    finalYears = finalYears.filter(a => yearsWithChoix.includes(getPkAnnee(a)));

    console.log("✅ Year order (filtered):", finalYears.map(a => a.Annee));

    // --- 5️⃣ Build the Draft tables ---
    const wrapper = document.querySelector(".tables-wrapper");
    wrapper.innerHTML = "";

    finalYears.forEach(annee => {
      const yearText = annee.Annee;
      const pkAnnee = getPkAnnee(annee);

      // main structure for that year
      const table = document.createElement("table");
      table.className = "mini-player-table";
      table.innerHTML = `
        <thead>
          <tr><th colspan="4">Année: ${yearText}</th></tr>
          <tr>
            <td>Ronde 1</td>
            <td>Ronde 2</td>
            <td>Ronde 3</td>
            <td>Ronde extra</td>
          </tr>
          <tr>
            <td id="listRonde1-${pkAnnee}"></td>
            <td id="listRonde2-${pkAnnee}"></td>
            <td id="listRonde3-${pkAnnee}"></td>
            <td id="listRondeX-${pkAnnee}"></td>
          </tr>
        </thead>
      `;
      wrapper.appendChild(table);

      // Filter Choix for this year
      const yearChoix = Choix.filter(c => Number(c.FkAnnee ?? c.FKAnnee) === pkAnnee);

      // Group by Ronde
      const grouped = { 1: [], 2: [], 3: [], X: [] };
      yearChoix.forEach(chx => {
        const ronde = Number(chx.Ronde);
        const key = ronde >= 1 && ronde <= 3 ? ronde : "X";
        grouped[key].push(chx);
      });

      // Sort & build mini-tables
      Object.keys(grouped).forEach(r => {
        const list = grouped[r];
        if (!list.length) return;

        list.sort((a, b) => {
          const oa = Number(a.Overall);
          const ob = Number(b.Overall);
          if (!isNaN(oa) && !isNaN(ob)) return oa - ob;
          if (!isNaN(oa)) return -1;
          if (!isNaN(ob)) return 1;
          return Number(a.PkChoix) - Number(b.PkChoix);
        });

        const mini = document.createElement("table");
        mini.className = "mini-player-table";
        mini.style.width = "100%";
        mini.style.tableLayout = "fixed";

        const thead = document.createElement("thead");
        thead.innerHTML = `
          <tr>
            <th>OV</th>
            <th>Orig</th>
            <th>New</th>
            <th>Joueurs</th>
          </tr>`;
        mini.appendChild(thead);

        const tbody = document.createElement("tbody");
        list.forEach(c => {
          const tr = document.createElement("tr");
// 🧩 Debug block – inspect player linkages
//console.groupCollapsed(`Choix #${c.PkChoix || "?"}`);
//console.log("FkJoueurs field in Choix:", c.FkJoueurs);
const sample = Joueurs.find(j =>
  Number(j.PKJoueurs) === Number(c.FkJoueurs)
);
//console.log("Matched Joueur object:", sample);
//console.groupEnd();

const overall = c.Overall || "";
const orig = getTeamShortName(c.FKPLF_OR_Owner);
const newOwner = getTeamShortName(c.FKPLF_NEW_Owner);
const joueur = getPlayerName(c.FkJoueurs);
          tr.innerHTML = `
            <td>${overall}</td>
            <td>${orig}</td>
            <td>${newOwner}</td>
            <td>${joueur}</td>`;
          tbody.appendChild(tr);
        });
        mini.appendChild(tbody);

        const cell = document.getElementById(`listRonde${r}-${pkAnnee}`);
        if (cell) cell.appendChild(mini);
      });
    });

    console.log("✅ Drafts built successfully");

  } catch (err) {
    console.error("❌ Error in loadDrafts:", err);
  }
})();
