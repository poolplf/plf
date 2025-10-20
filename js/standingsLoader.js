console.log("📊 Standings loader initialized");

(async function loadStandings() {
  try {
    // --- Load data files ---
    const files = ["Classement", "Annees", "PLF", "Equipes"];
    const data = {};

    await Promise.all(
      files.map(async name => {
        const res = await fetch(`data/${name}.json`);
        if (!res.ok) throw new Error(`Failed to load ${name}.json`);
        data[name] = await res.json();
      })
    );

    const { Classement, Annees, PLF, Equipes } = data;
    const getPkAnnee = a => Number(a.PKAnnee ?? a.PkAnnee);

    // --- Sort years ascending and keep only those present in Classement ---
const yearsSorted = [...Annees]
  .sort((a, b) => getPkAnnee(b) - getPkAnnee(a))  // 🧭 newer years first (DESC)
  .filter(a => Classement.some(c => Number(c.FkAnnee ?? c.FKAnnee) === getPkAnnee(a)));

    const wrapper = document.querySelector(".tables-wrapper");
    wrapper.innerHTML = ""; // clear initial skeleton

    // --- Build a table for each year ---
    yearsSorted.forEach(annee => {
      const yearText = annee.Annee;
      const pkAnnee = getPkAnnee(annee);

      // Filter Classement for this year
      const yearClassement = Classement
        .filter(c => Number(c.FkAnnee ?? c.FKAnnee) === pkAnnee)
        .sort((a, b) => Number(a.Rang) - Number(b.Rang));

      if (!yearClassement.length) return;

      // Create table for this year
      const table = document.createElement("table");
      table.className = "mini-player-table";
      table.innerHTML = `
        <thead>
          <tr><th colspan="3">Année: ${yearText}</th></tr>
          <tr><th>Rang</th><th>Pooler</th><th>Points</th></tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");

      // Add one row per record
      yearClassement.forEach(c => {
        const rang = Number(c.Rang) || "";
        const points = c.Points ?? "";

        // Resolve Pooler short name
        const plf = PLF.find(p => Number(p.PkPLF) === Number(c.FkPooler));
        let shortName = "?";
        if (plf) {
          const eq = Equipes.find(e => Number(e.PkEquipe) === Number(plf.FkEquipe));
          if (eq && (eq.ShortName || eq.Shortname)) {
            shortName = eq.ShortName || eq.Shortname;
          }
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${rang}</td>
          <td>${shortName}</td>
          <td>${points}</td>
        `;
        tbody.appendChild(tr);
      });

      wrapper.appendChild(table);
    });

    console.log("✅ Standings built successfully");
  } catch (err) {
    console.error("❌ Error building standings:", err);
  }
})();
