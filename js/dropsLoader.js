console.log("🗑️ Drops loader initialized (stable grouping by pooler)");

(async function loadDrops() {
  try {
    const files = ["Echanges", "TradeItems", "Joueurs", "PLF", "Equipes", "Annees"];
    const data = {};
    await Promise.all(
      files.map(async name => {
        const res = await fetch(`./data/${name}.json`);
        if (!res.ok) throw new Error(`Failed to load ${name}.json`);
        data[name] = await res.json();
      })
    );

    const { Echanges, TradeItems, Joueurs, PLF, Equipes, Annees } = data;
    const N = v => Number(v);

    const wrapper = document.querySelector(".tables-wrapper");
    wrapper.innerHTML = "";

    // --- List of years that have drops (FkStatutTrade = 3)
    const years = [...new Set(
      Echanges.filter(e => N(e.FkStatutTrade) === 3).map(e => N(e.FkAnnee))
    )].sort((a, b) => b - a); // newer first

    years.forEach(yearPk => {
      // 🧭 find label
      const anneeObj = Annees.find(a => N(a.PkAnnee ?? a.PKAnnee) === yearPk);
      const yearText = anneeObj ? anneeObj.Annee : yearPk;

      // 🧹 isolate & sort trades for this year
      const dropsForYear = Echanges
        .filter(e => N(e.FkAnnee) === yearPk && N(e.FkStatutTrade) === 3)
        .slice() // clone to avoid mutating global data
        .sort((a, b) => N(a.PkEchange ?? a.PKEchange ?? a.PkTrade) - N(b.PkEchange ?? b.PKEchange ?? b.PkTrade));

      if (!dropsForYear.length) return;

      // --- create table
      const table = document.createElement("table");
      table.className = "basicTable";
      table.id = "dropsTable";
      table.innerHTML = `
        <thead>
          <tr><th colspan="2">${yearText}</th></tr>
          <tr><th style="text-align:left;">Pooler</th><th style="text-align:left;">Joueurs</th></tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");

      // 🧩 group by pooler (in the same chronological order as their first trade)
      const poolersInOrder = [];
      dropsForYear.forEach(e => {
        const pid = N(e.FkPooler1 ?? e.FkPooler);
        if (!poolersInOrder.includes(pid)) poolersInOrder.push(pid);
      });

      // --- render one row per pooler
      poolersInOrder.forEach(poolerId => {
        // Pooler name
        let poolerTxt = "?";
        const plf = PLF.find(p => N(p.PkPLF) === poolerId);
        if (plf) {
          const eq = Equipes.find(e => N(e.PkEquipe) === N(plf.FkEquipe));
          if (eq) poolerTxt = `${eq.Ville}`;
        }

        // trades belonging to this pooler for the year, already sorted by PkEchange
        const poolerTrades = dropsForYear.filter(e => N(e.FkPooler1 ?? e.FkPooler) === poolerId);

        const droppedNames = [];
        poolerTrades.forEach(ech => {
          const pkTrade = N(ech.PkEchange ?? ech.PKEchange ?? ech.PkTrade);
          const items = TradeItems.filter(
            ti => N(ti.FkTrade ?? ti.FkEchange) === pkTrade
          );
          items.forEach(ti => {
            const j = Joueurs.find(x => N(x.PKJoueurs ?? x.PkJoueur) === N(ti.FkJoueur));
            if (j) droppedNames.push(`${j.Prenom} ${j.Nom}`);
          });
        });

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="text-align:left;">${poolerTxt}</td>
          <td style="text-align:left;">${droppedNames.join("<br>")}</td>
        `;
        tbody.appendChild(tr);
      });

      // spacer
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 100;
      emptyCell.innerHTML = "&nbsp;";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);

      wrapper.appendChild(table);
    });

    console.log("✅ Drops built successfully for all years");
  } catch (err) {
    console.error("❌ Error building drops:", err);
  }
})();
