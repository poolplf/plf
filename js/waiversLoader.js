console.log("🔁 Trades loader initialized (fixed filtering order)");

(async function loadTrades() {
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

    // years with at least one Echange having FkStatutTrade = 2
    const years = [...new Set(
      Echanges.filter(e => N(e.FkStatutTrade) === 2).map(e => N(e.FkAnnee))
    )].sort((a, b) => b - a);

    years.forEach(yearPk => {
      // Find display label for the year
      const anneeObj = Annees.find(a => N(a.PkAnnee ?? a.PKAnnee) === yearPk);
      const yearText = anneeObj ? anneeObj.Annee : yearPk;

      // Filter Echanges for this year + status = 2
      const tradesForYear = Echanges.filter(
        e => N(e.FkAnnee) === yearPk && N(e.FkStatutTrade) === 2
      );

      if (!tradesForYear.length) return;

      const table = document.createElement("table");
      table.className = "basicTable";
      table.id = "tradesTable";
      table.innerHTML = `
        <thead>
          <tr><th colspan="3">${yearText}</th></tr>
          <tr><th style="text-align:left;">Pooler</th><th style="text-align:left;">Joueurs IN</th><th style="text-align:left;">Joueurs OUT</th></tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");

      tradesForYear.forEach(ech => {
        // --- Pooler text from Echanges.FkPooler -> PLF -> Equipes
        let poolerTxt = "?";
        const plf = PLF.find(p => N(p.PkPLF) === N(ech.FkPooler1));
        if (plf) {
          const eq = Equipes.find(e => N(e.PkEquipe) === N(plf.FkEquipe));
          //if (eq) poolerTxt = `${eq.Ville} ${eq.Nom}`;
          if (eq) poolerTxt = `${eq.Ville}`;
        }

        // --- TradeItems for this trade (FkTrade may be named FkEchange in some dumps)
        const pkTrade = N(ech.PkEchange ?? ech.PKEchange ?? ech.PkTrade);
        const items = TradeItems.filter(ti => N(ti.FkTrade ?? ti.FkEchange) === pkTrade);

        // Column 2 (IN): item with FkPooler == 27
        let joueurIn = "";
        const inItem = items.find(ti => N(ti.FkPooler) === 27);
        if (inItem) {
          const j = Joueurs.find(x => N(x.PKJoueurs) === N(inItem.FkJoueur));
          if (j) joueurIn = `${j.Prenom} ${j.Nom}`;
        }

        // Column 3 (OUT): the other item (if exists)
        let joueurOut = "";
        const outItem = items.find(ti => N(ti.FkPooler) !== 27);
        if (outItem) {
          const j = Joueurs.find(x => N(x.PKJoueurs) === N(outItem.FkJoueur));
          if (j) joueurOut = `${j.Prenom} ${j.Nom}`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td style="text-align:left;">
            <a href="#" onclick="loadTeams(${N(ech.FkPooler1)})">${poolerTxt}</a>
          </td>
          <td style="text-align:left;">${joueurIn}</td>
          <td style="text-align:left;">${joueurOut}</td>
        `;
        tbody.appendChild(tr);
      });

      // spacer row
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 100;
      emptyCell.innerHTML = "&nbsp;";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);

      wrapper.appendChild(table);
    });

    console.log("✅ Trades built successfully");
  } catch (err) {
    console.error("❌ Error building trades:", err);
  }
})();
