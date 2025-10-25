
// Full loader: fetch data, find current PLF, insert logo & info, build player lists
//console.clear();

window.pkPLF = window.currentPkPLF || window.pkPLF || null;

(function() {
  // 1️⃣ Only create arrays once
  window.PLF = window.PLF || [];
  window.Joueurs = window.Joueurs || [];
  window.Injured = window.Injured || [];
  window.Choix = window.Choix || [];
  window.Echanges = window.Echanges || [];
  window.Classement = window.Classement || [];
  window.Equipes = window.Equipes || [];
  window.Salaires = window.Salaires || [];
  window.Annees = window.Annees || [];
  window.TradeItems = window.TradeItems || [];

  // 2️⃣ Local reference to selected team
  const pk = window.currentPkPLF || window.pkPLF || null;
  if (!pk) {
    console.error("❌ No team selected");
    return;
  }

  console.log("✅ Loading data for team:", pk);

  // 3️⃣ Then run all your existing logic below...
  // fetch JSON, filter players, fill tables, etc.

})();

// --- Load all data ---
async function loadData() {
  const files = [
    "PLF", "Joueurs", "Injured", "Choix", "Echanges",
    "Classement", "Equipes", "Salaires", "Annees", "TradeItems"
  ];

  const promises = files.map(name =>
    fetch(`./data/${name}.json`).then(res => {
      if (!res.ok) throw new Error(`Failed to load ./data/${name}.json`);
      return res.json();
    })
  );

  [
    PLF, Joueurs, Injured, Choix, Echanges,
    Classement, Equipes, Salaires, Annees, TradeItems
  ] = await Promise.all(promises);

  console.log("✅ All data loaded:", "Annees:", Annees.length, "PLF:", PLF.length);
}

// --- Run loader ---
loadData()
  .then(() => {
    // Now all data is ready here 👇
    buildPicksList();
    fillInjured("Injured",Injured, Joueurs, Salaires);
    loadArchiveTable();
    fillTradesTable()

    const currentPLF = PLF.find(p => String(p.PkPLF) === String(window.pkPLF));
    if (!currentPLF) {
      console.error(`No PLF found for PkPLF = ${window.pkPLF}`);
      return;
    }

    loadTopMenu(PLF,Equipes, "topMenu", (key, name) => {
      const display = document.getElementById("selectedTeam");
    });


    // --- Insert team logo ---
    try {
      const logoCell = document.getElementById("teamLogo");
      if (logoCell) {
        logoCell.innerHTML = "";
        if (currentPLF.LogoString) {
          const img = document.createElement("img");
          img.src = `./files/${currentPLF.LogoString}`;
          img.alt = `${currentPLF.NomEquipe || currentPLF.Pooler || "Team"} Logo`;
          img.style.width = "100px";
          img.style.height = "100px";
          img.style.objectFit = "contain";
          logoCell.appendChild(img);
        }
      }
    } catch (err) {
      console.warn("Error inserting logo:", err);
    }

    // --- Insert basic team info ---
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value == null ? "" : value;
    };

    setText("teamName", currentPLF.Pooler || currentPLF.NomEquipe || "");
    setText("teamEmail", currentPLF.Courriel || "");
    setText("teamExtra", currentPLF.Titre || "");

    // --- PROCESS PLAYERS ---
    const teamPlayers = (Joueurs || []).filter(
      j => String(j.FKPLF) === String(currentPLF.PkPLF)
    );

    teamPlayers.sort((a, b) =>
      Number(b.FKPLFSalaire || b.FkPLFSalaire || 0) -
      Number(a.FKPLFSalaire || a.FkPLFSalaire || 0)
    );

    const equipesByPk = {};
    (Equipes || []).forEach(e => {
      const key = String(e.PkEquipe || e.PKEQUIPE || e.id || "");
      if (key) equipesByPk[key] = e;
    });

    const salairesByPk = {};
    (Salaires || []).forEach(s => {
      const key = String(s.PKSalaire || s.PkSalaire || s.id || "");
      if (key) salairesByPk[key] = s;
    });

    const forwards = [], defenses = [], goalers = [];
    let totalSalary = 0;
    let totalPlayers = 0;

    teamPlayers.forEach(j => {
      const eq = equipesByPk[String(j.FkEquipe || j.FKEquipe || "")];
      const sal = salairesByPk[String(j.FKPLFSalaire || j.FkPLFSalaire || "")];

      const equipeShort = eq ? (eq.ShortName || eq.Shortname || eq.Nom || "") : "";
      const salaireValue = Number(sal ? (sal.Salaire || sal.Value || 0) : 0);

      totalSalary += salaireValue;

      j.EquipeName = equipeShort;
      j.SalaireValue = salaireValue.toLocaleString();

      const pos = Number(j.FKPosition || j.FkPosition || 0);
      if ([1, 2, 3, 6].includes(pos)) forwards.push(j);
      else if ([4, 5, 7].includes(pos)) defenses.push(j);
      else if (pos === 8) goalers.push(j);

      totalPlayers++;
    });

    document.getElementById("capValue").textContent = totalSalary.toLocaleString();
    document.getElementById("nbPlayersValue").textContent = totalPlayers;

    const fillTable = (id, players) => {
      const tbody = document.getElementById(id);
      if (!tbody) return;
      tbody.innerHTML = "";
      players.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.Prenom || ""} ${p.Nom || ""}</td>
          <td>${p.EquipeName || ""}</td>
          <td>${p.SalaireValue || ""}</td>`;
        tbody.appendChild(row);
      });
    };

    fillTable("forwardsList", forwards);
    fillTable("defenseList", defenses);
    fillTable("goalersList", goalers);

    const setTextIfExists = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTextIfExists("forwardsTotal", forwards.length);
    setTextIfExists("defenseTotal", defenses.length);
    setTextIfExists("goalersTotal", goalers.length);

    console.log("✅ Team data processed for PkPLF:", window.pkPLF);
  })
  .catch(err => console.error("Error loading or processing team data:", err));


// new part 25-10-15

function buildPicksList() {
  const picksList = document.getElementById("picksList");
  const picksHeader = document.getElementById("picksHeader");
  if (!picksList || !picksHeader) {
    console.error("❌ picksList or picksHeader not found");
    return;
  }

  picksList.innerHTML = "";
  picksHeader.innerHTML = "";

  const getPkAnnee = a => Number(a.PKAnnee ?? a.PkAnnee);

  const currentAnneeObj = Annees.find(a =>
    (typeof a.IsCurrent === "boolean" && a.IsCurrent === true) ||
    (typeof a.IsCurrent === "string" && a.IsCurrent.toLowerCase() === "true") ||
    (Number(a.IsCurrent) === 1)
  );
  if (!currentAnneeObj) return console.error("No current 'Annee' found (IsCurrent).");

  const currentPk = getPkAnnee(currentAnneeObj);
  if (!Number.isFinite(currentPk)) return;

  const anneesSorted = [...Annees].sort((x, y) => getPkAnnee(x) - getPkAnnee(y));
  const startIndex = anneesSorted.findIndex(a => getPkAnnee(a) === currentPk) + 1;
  const targetAnnees = anneesSorted.slice(startIndex, startIndex + 3);
  const targetIds = targetAnnees.map(a => getPkAnnee(a));

  // 🧩 Filter Choix for selected team, target years, and Ronde 1–3 only
  const teamChoix = (Choix || []).filter(c => {
    const ronde = Number(c.Ronde);
    return (
      Number(c.FKPLF_NEW_Owner) === Number(window.pkPLF) &&
      targetIds.includes(Number(c.FkAnnee ?? c.FKAnnee)) &&
      [1, 2, 3].includes(ronde)
    );
  });

  // Sort by round
  teamChoix.sort((a, b) => Number(a.Ronde) - Number(b.Ronde));

  // Group by year
  const picksByYear = {};
  targetAnnees.forEach(a => { picksByYear[a.Annee] = []; });

  teamChoix.forEach(chx => {
    const yearObj = Annees.find(a =>
      Number(a.PKAnnee ?? a.PkAnnee) === Number(chx.FkAnnee ?? chx.FKAnnee)
    );
    if (!yearObj) return;

    // find short name of original team
    let shortName = "?";
    const plfOwner = PLF.find(p => Number(p.PkPLF) === Number(chx.FKPLF_OR_Owner));
    if (plfOwner) {
      const eq = Equipes.find(e => Number(e.PkEquipe) === Number(plfOwner.FkEquipe));
      if (eq && (eq.ShortName || eq.Shortname)) {
        shortName = eq.ShortName || eq.Shortname;
      }
    }

    // format ronde
    const r = Number(chx.Ronde);
    const rondeText = isNaN(r) ? "" : `${r}${r === 1 ? "er" : "e"}`;

    picksByYear[yearObj.Annee].push(`${rondeText} (${shortName})`);
  });

  // === HEADER mini-table ===
  const headerTable = document.createElement("table");
  headerTable.className = "mini-player-table";
  headerTable.style.width = "100%";
  headerTable.style.tableLayout = "fixed";
  const headerRow = document.createElement("tr");

  const colWidth = `${100 / targetAnnees.length}%`;
  targetAnnees.forEach(a => {
    const yearTh = document.createElement("th");
    yearTh.textContent = a.Annee;
    yearTh.style.width = colWidth;
    headerRow.appendChild(yearTh);
  });

  headerTable.appendChild(headerRow);
  picksHeader.appendChild(headerTable);

  // === BODY mini-table ===
  const table = document.createElement("table");
  table.className = "mini-player-table";
  table.style.width = "100%";
  table.style.tableLayout = "fixed";

  const tbody = document.createElement("tbody");
  const maxRows = Math.max(...Object.values(picksByYear).map(arr => arr.length), 0);
  const rowsToShow = Math.max(maxRows, 1);

  for (let i = 0; i < rowsToShow; i++) {
    const tr = document.createElement("tr");
    targetAnnees.forEach(a => {
      const td = document.createElement("td");
      td.style.width = colWidth;
      td.textContent = picksByYear[a.Annee]?.[i] || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  picksList.appendChild(table);
}



function fillInjured(id, InjuredArray, JoueursArray, SalairesArray) {

  if (!Array.isArray(InjuredArray)) {
    console.warn("⚠️ Injured data not ready or invalid:", InjuredArray);
    return;
  }

  const AllInjured = (Injured || [])
    .filter(i => Number(i.FkPooler) === Number(window.pkPLF))
    .map(i => ({
      PkInjured: i.PkInjured,
      FkJoueur: i.FkJoueur,
      WhenPlaced: i.WhenPlaced
    }));

   const cell = document.getElementById(id);
  if (!cell) return;

  // Clear previous content and create a small table structure
  const table = document.createElement("table");
  table.style.width = "100%";
    // 🧮 start salary accumulator
  let totalInjuredSalary = 0;

  AllInjured.forEach(inj => {
    const joueur = (JoueursArray || []).find(
      j => String(j.PKJoueurs || j.PkJoueur) === String(inj.FkJoueur)
    );
    if (!joueur || !joueur.Prenom || !joueur.Nom || !inj.WhenPlaced) return;

    const salaireObj = (Salaires || []).find(
      s => String(s.PKSalaire || s.PkSalaire || s.id) === String(joueur.FKPLFSalaire || joueur.FkPLFSalaire)
    );
    const salaireValue = Number(salaireObj?.Salaire || salaireObj?.Value || 0);
    totalInjuredSalary -= salaireValue;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${joueur.Prenom} ${joueur.Nom}</td>
      <td>${inj.WhenPlaced}</td>
    `;
    table.appendChild(row);
  });

  cell.innerHTML = "";
  cell.appendChild(table);

  const capCell = document.getElementById("capInjured");
  if (capCell) capCell.textContent = totalInjuredSalary.toLocaleString();
  //document.getElementById("Ajustement").style.display = "";
};

function loadArchiveTable() {
  // Get the table body

  const tbody = document.getElementById("archiveList");
  if (!tbody) return;

  // Clear any existing rows
  tbody.innerHTML = "";

  // Filter Classement by the selected team
  const filtered = Classement.filter(c => Number(c.FkPooler) === Number(window.pkPLF));

  // Loop through each matching record

  filtered.forEach(c => {
    // Find the matching year
    const annee = Annees.find(a => Number(a.PKAnnee) === Number(c.FkAnnee));
    const anneeText = annee ? annee.Annee : "";

    // Format rank (1er / 2e / 3e ...)
    const rangNum = Number(c.Rang);
    const rangText = isNaN(rangNum) ? "" : `${rangNum}${rangNum === 1 ? "er" : "e"}`;

    // Create a new row
    const tr = document.createElement("tr");

    // Cell 1 – Year
    const tdYear = document.createElement("td");
    tdYear.textContent = anneeText;
    tr.appendChild(tdYear);

    // Cell 2 – Rank
    const tdRank = document.createElement("td");
    tdRank.textContent = rangText;
    tr.appendChild(tdRank);

    // Cell 3 – Points
    const tdPoints = document.createElement("td");
    tdPoints.textContent = c.Points;
    tr.appendChild(tdPoints);

    // Add row to table
    tbody.appendChild(tr);
  });
}

function loadTopMenu(PLFArray, EquipeArray, topMenuID, onTeamClick) {
  // Make a lookup map for faster access by key
  const equipesMap = {};
  EquipeArray.forEach(eq => {
    equipesMap[eq.PkEquipe] = eq;
  });

  // Remove all PLF entries with PkPLF = 27
  PLFArray = PLFArray.filter(item => Number(item.PkPLF) !== 27);

  // Sort PLF by team shortname (via lookup)
  PLFArray.sort((a, b) => {
    const nameA = equipesMap[a.FkEquipe]?.ShortName || "";
    const nameB = equipesMap[b.FkEquipe]?.ShortName || "";
    return nameA.localeCompare(nameB);
  });

  const topMenu = document.getElementById(topMenuID);
  topMenu.innerHTML = "";

  PLFArray.forEach(plf => {
    const equipe = equipesMap[plf.FkEquipe];
    if (!equipe) return; // skip if no match

    // Create link wrapper
    const tdTopMenu = document.createElement("a");
    tdTopMenu.href = "#";
    tdTopMenu.classList.add("team-logo");

    // Add logo image
    const img = document.createElement("img");
    img.src = "./files/" + equipe.Logo;
    img.alt = equipe.ShortName;
    img.classList.add("team-logo");
    img.style.width = "48px";
    img.style.height = "48px";
    img.style.verticalAlign = "middle";

    // Add text
    //const text = document.createTextNode(equipe.ShortName);

    // Append logo + text to link
    tdTopMenu.appendChild(img);
    //tdTopMenu.appendChild(text);

    // Click event
    tdTopMenu.addEventListener("click", (e) => {
      e.preventDefault();
      topMenu.querySelectorAll("a").forEach(a => a.classList.remove("selected"));
      tdTopMenu.classList.add("selected");

      if (typeof loadTeams === "function") {            
        loadTeams(plf.PkPLF);
      }
    });

    topMenu.appendChild(tdTopMenu);
  });
}

function fillTradesTable() {
  const table = document.getElementById("tradesTable");
  const tbody = document.getElementById("tradesList");
  const theadCell = table?.querySelector("thead tr th");
  if (!table || !tbody || !theadCell) {
    console.error("❌ tradesTable / tradesList / header not found");
    return;
  }

  // remove old select if present
  let select = document.getElementById("tradeYearFilter");
  if (select) select.remove();

  // create select and append to header cell
  select = document.createElement("select");
  select.id = "tradeYearFilter";
  select.style.marginLeft = "10px";
  select.style.padding = "0.2rem";

  // sort Annees by numeric start year DESC
  const parseYear = val => {
    if (!val) return 0;
    const str = String(val);
    const num = parseInt(str.substring(0, 4), 10);
    return isNaN(num) ? 0 : num;
  };

  const sortedAnnees = [...(Annees || [])].sort((a, b) => {
    const na = parseYear(a.Annee ?? a.Name ?? "");
    const nb = parseYear(b.Annee ?? b.Name ?? "");
    return nb - na; // DESC
  });

  sortedAnnees.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.PKAnnee ?? a.PkAnnee ?? a.Pk ?? "";
    opt.textContent = a.Annee ?? a.Name ?? opt.value;
    select.appendChild(opt);
  });
  theadCell.appendChild(select);

  // helper: get numeric prop from object trying many possible key names
  function getNum(obj, names = []) {
    if (!obj) return NaN;
    for (const k of names) {
      if (k in obj && obj[k] != null && obj[k] !== "") {
        const n = Number(obj[k]);
        if (!Number.isNaN(n)) return n;
      }
    }
    return NaN;
  }

  const numEq = (a, b) => Number(a) === Number(b);

  // --- render trades as mini-tables ---
  function renderTrades(trades, limit = null) {
    tbody.innerHTML = "";
    const headerRow = document.createElement("tr");
    const thIn = document.createElement("th");
    const thOut = document.createElement("th");
    thIn.textContent = "IN";
    thOut.textContent = "OUT";
    headerRow.appendChild(thIn);
    headerRow.appendChild(thOut);
    tbody.appendChild(headerRow);

    const sorted = (trades || []).slice().sort((a, b) => new Date(b.DateEchange) - new Date(a.DateEchange));
    const toShow = (limit && limit > 0) ? sorted.slice(0, limit) : sorted;

    toShow.forEach(trade => {
      const tradePk = getNum(trade, ["PkEchange", "id"]);
      const items = (TradeItems || []).filter(it => numEq(getNum(it, ["FkTrade", "FkEchange"]), tradePk));

      // find other team via PLF → Equipe.ShortName
      const pooler1 = getNum(trade, ["FkPooler1"]);
      const pooler2 = getNum(trade, ["FkPooler2"]);
      const isPooler1 = numEq(pooler1, window.pkPLF);
      const otherPk = isPooler1 ? pooler2 : pooler1;
      let otherTeamName = `PLF#${otherPk}`;
      const otherPLF = (PLF || []).find(p => numEq(getNum(p, ["PkPLF"]), otherPk));
      if (otherPLF) {
        const eq = (Equipes || []).find(e =>
          numEq(getNum(e, ["PkEquipe"]), getNum(otherPLF, ["FkEquipe"]))
        );
        if (eq) otherTeamName = eq.ShortName || eq.Shortname || eq.Nom || otherTeamName;
      }

      // classify items into IN/OUT
      const itemsIn = [];
      const itemsOut = [];
      items.forEach(it => {
        let text = "";

        // --- Player ---
        const fkJ = getNum(it, ["FkJoueur"]);
        if (!Number.isNaN(fkJ) && fkJ !== 0) {
          const joueur = (Joueurs || []).find(j =>
            numEq(getNum(j, ["PKJoueur", "PKJoueurs", "id"]), fkJ)
          );
          if (joueur) {
            const initial = (joueur.Prenom || "").charAt(0)
              ? joueur.Prenom.charAt(0) + ". "
              : "";
            text = `${initial}${joueur.Nom || joueur.LastName || ""}`;
          } else {
            text = `Joueur#${fkJ}`;
          }
        }

        // --- Pick ---
        const fkC = getNum(it, ["FkChoix"]);
        if (!Number.isNaN(fkC) && fkC !== 0) {
          const choix = (Choix || []).find(c => numEq(getNum(c, ["PkChoix"]), fkC));
          if (choix) {
            // find trade → year
            let yearTxt = "";
            const annee = (Annees || []).find(a => numEq(getNum(a, ["PKAnnee"]), getNum(choix, ["FkAnnee"])));

            if (annee) yearTxt = annee.Annee;
            yearTxt = yearTxt.slice(0, 4);

            // ronde
            const r = Number(choix.Ronde);
            const rondeTxt = isNaN(r) ? "" : `${r}${r === 1 ? "er" : "e"}`;

            // owner team shortname
            const ownerPLF = (PLF || []).find(p => numEq(getNum(p, ["PkPLF"]), getNum(choix, ["FKPLF_OR_Owner"])));
            let shortName = "?";
            if (ownerPLF) {
              const eq = (Equipes || []).find(e =>
                numEq(getNum(e, ["PkEquipe"]), getNum(ownerPLF, ["FkEquipe"]))
              );
              if (eq) shortName = eq.ShortName || eq.Shortname || eq.Nom || shortName;
            }

            text = `${rondeTxt} ${yearTxt} (${shortName})`;
          } else {
            text = `Pick#${fkC}`;
          }
        }

        // --- Classification: IN or OUT ---
        if (text) {
          if (numEq(getNum(it, ["FkPooler"]), window.pkPLF)) {
            itemsOut.push(text);
          } else {
            itemsIn.push(text);
          }
        }
      });

      // Build mini-table
      const mini = document.createElement("table");
      mini.className = "mini-trade";
      mini.style.width = "100%";
      mini.style.margin = "8px 0";
      
      // Row 1: Date + Other team
      const r1 = document.createElement("tr");
      const tdDate = document.createElement("td");
      const tdTeam = document.createElement("td");
      tdDate.textContent = trade.DateEchange || "";
      tdTeam.textContent = otherTeamName;
      tdDate.style.fontWeight = "600";
      tdTeam.style.fontWeight = "600";
      r1.appendChild(tdDate);
      r1.appendChild(tdTeam);
      mini.appendChild(r1);

      // Row 2: IN / OUT (each item on its own line)
      const r2 = document.createElement("tr");
      const tdIn = document.createElement("td");
      const tdOut = document.createElement("td");
      tdIn.innerHTML = itemsIn.length ? itemsIn.join("<br>") : " ";
      tdOut.innerHTML = itemsOut.length ? itemsOut.join("<br>") : " ";
      r2.appendChild(tdIn);
      r2.appendChild(tdOut);
      mini.appendChild(r2);

      // Wrap mini table
      const wrap = document.createElement("tr");
      const wrapCell = document.createElement("td");
      wrapCell.colSpan = 2;
      wrapCell.appendChild(mini);
      wrap.appendChild(wrapCell);
      tbody.appendChild(wrap);
    });
  }

  // get relevant trades for the selected team
  const relevantTrades = (Echanges || []).filter(e => {
    const p1 = getNum(e, ["FkPooler1"]);
    const p2 = getNum(e, ["FkPooler2"]);
    return numEq(p1, window.pkPLF) || numEq(p2, window.pkPLF);
  });

  // initial: show latest 10
  renderTrades(relevantTrades, 10);

  // on select change -> filter by FkAnnee
  select.addEventListener("change", () => {
    const year = Number(select.value);
    const filtered = relevantTrades.filter(e =>
      numEq(getNum(e, ["FkAnnee"]), year)
    );
       renderTrades(filtered);
  });

  if (select.options.length > 0) {
    select.selectedIndex = 0;
  }
}
