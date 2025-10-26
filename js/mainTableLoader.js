/* mainTableLoader.js – Populates PLF summary table dynamically
   Targets #plfTable inside main.html
   Consistent with team-page dynamic loaders
*/

Promise.all([
  fetch('data/PLF.json').then(r => r.json()),
  fetch('data/Equipes.json').then(r => r.json()),
  fetch('data/Joueurs.json').then(r => r.json()),
  fetch('data/Salaires.json').then(r => r.json())
])
.then(([plf, equipes, joueurs, salaires]) => {
  //console.log("✅ JSONs loaded:", plf.length, equipes.length, joueurs.length, salaires.length);

  // Remove unwanted entries
  plf = plf.filter(item => Number(item.PkPLF) !== 27);

  // Sort alphabetically
  plf.sort((a, b) => (a.LogoString || '').localeCompare(b.LogoString || ''));

const tableBody = document.getElementById("plfTableBody");
if (!tableBody) return console.error("❌ tbody not found");


  plf.forEach(pooler => {
    const row = tableBody.insertRow();
    const eq = equipes.find(e => e.PkEquipe === pooler.FkEquipe);

    // 1. Logo
    const logoCell = row.insertCell();
    if (eq && eq.Logo) {
      const img = document.createElement('img');
      img.src = `files/${eq.Logo}`;
      img.alt = pooler.Pooler;
      logoCell.appendChild(img);
    } else {
      logoCell.textContent = '—';
    }

    // 2. Pooler link
    const poolerCell = row.insertCell();
    const link = document.createElement('a');
    link.textContent = pooler.Pooler;
    link.href = '#';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadTeams(pooler.PkPLF);
    });
    poolerCell.appendChild(link);

    // 3. Salary
    const poolerPlayers = joueurs.filter(j => j.FKPLF === pooler.PkPLF);
    let totalSalary = 0;
    poolerPlayers.forEach(j => {
      const sal = salaires.find(s => s.PKSalaire === j.FKPLFSalaire);
      if (sal && sal.Salaire) {
        const clean = parseFloat(String(sal.Salaire).replace(/[^0-9.-]+/g, ""));
        totalSalary += isNaN(clean) ? 0 : clean;
      }
    });

    const salaryCell = row.insertCell();    
    salaryCell.textContent = totalSalary.toLocaleString();

if (totalSalary > 100 || totalSalary < 70) {
  salaryCell.style.color = '#ff6b6b'; // bright red
  salaryCell.style.fontWeight = 'bold';
} else {
  salaryCell.style.color = '#51cf66'; // bright green
  salaryCell.style.fontWeight = 'normal';
}

    // 4–6: Player counts
    const forwards = poolerPlayers.filter(j => [1, 2, 3, 6].includes(Number(j.FKPosition))).length;
    const defense  = poolerPlayers.filter(j => [4, 5, 7].includes(Number(j.FKPosition))).length;
    const goalies  = poolerPlayers.filter(j => Number(j.FKPosition) === 8).length;

    row.insertCell().textContent = forwards;
    row.insertCell().textContent = defense;
    row.insertCell().textContent = goalies;

    // 7. Total
    row.insertCell().textContent = poolerPlayers.length;

    // 8. Email
    const emailCell = row.insertCell();
    emailCell.textContent = pooler.Courriel;
  });
})
.catch(err => console.error('Error loading data:', err));

function fillLeagueTrades() {
  const tbody = document.getElementById("leagueTradesList");
  if (!tbody) return;

  Promise.all([
    fetch("data/Echanges.json").then(r => r.json()),
    fetch("data/TradeItems.json").then(r => r.json()),
    fetch("data/PLF.json").then(r => r.json()),
    fetch("data/Equipes.json").then(r => r.json()),
    fetch("data/Choix.json").then(r => r.json()),
    fetch("data/Annees.json").then(r => r.json()),
    fetch("data/Joueurs.json").then(r => r.json())
  ])
  .then(([Echanges, TradeItems, PLF, Equipes, Choix, Annees, Joueurs]) => {

    // Sort latest first, keep last 20
    const trades = Echanges.sort((a, b) => new Date(b.DateEchange) - new Date(a.DateEchange)).slice(0, 20);

    const numEq = (a, b) => Number(a) === Number(b);
    const getNum = (o, keys) => {
      for (const k of keys) {
        if (o[k] != null && !isNaN(o[k])) return Number(o[k]);
      }
      return NaN;
    };

    trades.forEach(trade => {
      const tradePk = getNum(trade, ["PkEchange"]);
      const items = TradeItems.filter(it => numEq(getNum(it, ["FkTrade"]), tradePk));

      const p1 = getNum(trade, ["FkPooler1"]);
      const p2 = getNum(trade, ["FkPooler2"]);

      const itemsByTeam = { [p1]: [], [p2]: [] };

      // Build text for each traded item
      items.forEach(it => {
        let text = "";
        const fkJ = getNum(it, ["FkJoueur"]);
        if (fkJ) {
          const j = Joueurs.find(j => numEq(getNum(j, ["PkJoueur", "PKJoueurs"]), fkJ));
          if (j) text = `${(j.Prenom || "").charAt(0)}. ${j.Nom || ""}`;
        }
        const fkC = getNum(it, ["FkChoix"]);
        if (fkC) {
          const c = Choix.find(c => numEq(getNum(c, ["PkChoix"]), fkC));
          if (c) {
            const a = Annees.find(a => numEq(getNum(a, ["PkAnnee", "PKAnnee"]), getNum(c, ["FkAnnee"])));
            const year = a?.Annee?.slice(0, 4) || "";
            const r = Number(c.Ronde);
            const rondeTxt = isNaN(r) ? "" : `${r}${r === 1 ? "er" : "e"}`;
            text = `${rondeTxt} ${year}`;
          }
        }
        if (text) itemsByTeam[getNum(it, ["FkPooler"])].push(text);
      });

      // --- new styled layout block ---
      const block = document.createElement("div");
      block.className = "trade-block";

      // Date
      const dateDiv = document.createElement("div");
      dateDiv.className = "trade-date";
      dateDiv.textContent = trade.DateEchange;

      // Teams (Equipe.ShortName + PLF.LogoString)
      const teamsDiv = document.createElement("div");
      teamsDiv.className = "trade-teams";

      function buildTeamBlock(pk) {
        const plf = PLF.find(p => numEq(getNum(p, ["PkPLF"]), pk));
        if (!plf) return `<span>PLF#${pk}</span>`;

        const eq = Equipes.find(e => numEq(getNum(e, ["PkEquipe"]), getNum(plf, ["FkEquipe"])));
        const name = eq?.ShortName || eq?.Shortname || eq?.Nom || `PLF#${pk}`;
        const logo = plf.LogoString ? `files/${plf.LogoString}` : null;

        const html = logo
          ? `<img src="${logo}" alt="${name}" 
               style="height:22px;width:22px;border-radius:50%;
                      vertical-align:middle;margin-right:6px;">${name}`
          : name;

        return `<span>${html}</span>`;
      }

      teamsDiv.innerHTML = `
        ${buildTeamBlock(p1)}
        ${buildTeamBlock(p2)}
      `;

      // Players
      const playersDiv = document.createElement("div");
      playersDiv.className = "trade-players";
      playersDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <div>${itemsByTeam[p1].join("<br>") || "&nbsp;"}</div>
          <div style="text-align:right;">${itemsByTeam[p2].join("<br>") || "&nbsp;"}</div>
        </div>`;

      // Assemble and append
      block.appendChild(dateDiv);
      block.appendChild(teamsDiv);
      block.appendChild(playersDiv);
      tbody.appendChild(block);
    });
  })
  .catch(err => console.error("Error loading league trades:", err));
}

fillLeagueTrades();