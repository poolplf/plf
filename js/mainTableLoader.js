/* mainTableLoader.js – Populates PLF summary table dynamically
   Targets #plfTable inside main.html
   Consistent with team-page dynamic loaders
*/

Promise.all([
  fetch('data/PLF.json').then(r => r.json()),
  fetch('data/Equipes.json').then(r => r.json()),
  fetch('data/Joueurs.json').then(r => r.json()),
  fetch('data/Injured.json').then(r => r.json()),
  fetch('data/Salaires.json').then(r => r.json())
])
.then(([plf, equipes, joueurs,injured, salaires]) => {

  plf = plf.filter(item => Number(item.PkPLF) !== 27);
  plf.sort((a, b) => (a.LogoString || '').localeCompare(b.LogoString || ''));

  const tableBody = document.getElementById("plfTableBody");
  if (!tableBody) return console.error("❌ tbody not found");

  plf.forEach(pooler => {
    const row = tableBody.insertRow();
    const eq = equipes.find(e => e.PkEquipe === pooler.FkEquipe);

    // Logo
    const logoCell = row.insertCell();
    if (eq && eq.Logo) {
      const img = document.createElement('img');
      img.src = `files/${eq.Logo}`;
      img.height = 20;
      img.alt = pooler.Pooler;
      img.style.cursor = "pointer";
      img.addEventListener('click', () => loadTeams(pooler.PkPLF));
      logoCell.appendChild(img);
    }

    // Pooler link
    const poolerCell = row.insertCell();
    const link = document.createElement('a');
    link.textContent = pooler.Pooler;
    link.href = '#';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadTeams(pooler.PkPLF);
    });
    poolerCell.appendChild(link);

    // Salary
    const poolerPlayers = joueurs.filter(j => j.FKPLF === pooler.PkPLF);
    let totalSalary = 0;
    poolerPlayers.forEach(j => {
      const sal = salaires.find(s => s.PKSalaire === j.FKPLFSalaire);
      if (sal && sal.Salaire) {
        const clean = parseFloat(String(sal.Salaire).replace(/[^0-9.-]+/g, ""));
        totalSalary += isNaN(clean) ? 0 : clean;
      }
    });

    const totalInjured = getTotalInjuredSalaryByPLF(pooler.PkPLF, injured, joueurs, salaires);
    totalSalary = totalSalary - totalInjured;

    const salaryCell = row.insertCell();    
    salaryCell.textContent = totalSalary.toLocaleString();

    if (totalSalary > 100 || totalSalary < 70) {
      salaryCell.style.color = '#ff6b6b';
      salaryCell.style.fontWeight = 'bold';
    } else {
      salaryCell.style.color = '#51cf66';
      salaryCell.style.fontWeight = 'normal';
    }

    // Player counts
    const forwards = poolerPlayers.filter(j => [1, 2, 3, 6].includes(Number(j.FKPosition))).length;
    const defense  = poolerPlayers.filter(j => [4, 5, 7].includes(Number(j.FKPosition))).length;
    const goalies  = poolerPlayers.filter(j => Number(j.FKPosition) === 8).length;

    row.insertCell().textContent = forwards;
    row.insertCell().textContent = defense;
    row.insertCell().textContent = goalies;

    // Total players
    row.insertCell().textContent = poolerPlayers.length;

    // Email
    const emailCell = row.insertCell();
    emailCell.textContent = pooler.Courriel;
  });
})
.catch(err => console.error('Error loading data:', err));

/* --------------------------------------------------------------------------
   LEAGUE TRADES — UPDATED WITH ORIGINAL OWNER SHORT NAME FOR PICKS
-------------------------------------------------------------------------- */

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

    const trades = Echanges
      .sort((a, b) => {
        const d = new Date(b.DateEchange) - new Date(a.DateEchange);
        if (d !== 0) return d;
        return Number(b.PkEchange) - Number(a.PkEchange);
      })
      .slice(0, 20);

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

      // Build text for traded items
      items.forEach(it => {
        let text = "";

        // Player
        const fkJ = getNum(it, ["FkJoueur"]);
        if (fkJ) {
          const j = Joueurs.find(j => numEq(getNum(j, ["PkJoueur", "PKJoueurs"]), fkJ));
          if (j) {
            const short = `${(j.Prenom || "").charAt(0)}. ${j.Nom || ""}`;
            text = j.LienElite
              ? `<a href="${j.LienElite}" target="_blank">${short}</a>`
              : short;
          }
        }

        // Pick
        const fkC = getNum(it, ["FkChoix"]);
        if (fkC) {
          const c = Choix.find(c => numEq(getNum(c, ["PkChoix"]), fkC));
          if (c) {
            const a = Annees.find(a => numEq(getNum(a, ["PkAnnee", "PKAnnee"]), getNum(c, ["FkAnnee"])));
            const year = a?.Annee?.slice(0, 4) || "";
            const r = Number(c.Ronde);
            const rondeTxt = isNaN(r) ? "" : `${r}${r === 1 ? "er" : "e"}`;

            // ⭐ NEW: original owner short name
            let ownerShort = "?";
            const plfOwner = PLF.find(p => numEq(getNum(p, ["PkPLF"]), getNum(c, ["FKPLF_OR_Owner"])));
            if (plfOwner) {
              const ownerEq = Equipes.find(e => numEq(getNum(e, ["PkEquipe"]), getNum(plfOwner, ["FkEquipe"])));
              if (ownerEq) ownerShort = ownerEq.ShortName || ownerEq.Shortname || ownerEq.Nom || ownerShort;
            }

            text = `${rondeTxt} ${year} (${ownerShort})`;
          }
        }

        if (text)
          itemsByTeam[getNum(it, ["FkPooler"])].push(text);
      });

      // Build the HTML block
      const block = document.createElement("div");
      block.className = "trade-block";

      const dateDiv = document.createElement("div");
      dateDiv.className = "trade-date";
      dateDiv.textContent = trade.DateEchange;

      const teamsDiv = document.createElement("div");
      teamsDiv.className = "trade-teams";

      function buildTeamBlock(pk) {
        const plf = PLF.find(p => numEq(getNum(p, ["PkPLF"]), pk));
        if (!plf) return `<span>PLF#${pk}</span>`;

        const eq = Equipes.find(e => numEq(getNum(e, ["PkEquipe"]), getNum(plf, ["FkEquipe"])));
        const name = eq?.ShortName || eq?.Shortname || eq?.Nom || `PLF#${pk}`;
        const logo = plf.LogoString ? `files/${plf.LogoString}` : null;

        return logo
          ? `<a href="#" onclick="loadTeams(${pk})">
              <img src="${logo}" height="18" width="18" style="vertical-align:middle;margin-right:6px;">
              ${name}
            </a>`
          : `<a href="#" onclick="loadTeams(${pk})">${name}</a>`;
      }

      teamsDiv.innerHTML = `${buildTeamBlock(p1)} ${buildTeamBlock(p2)}`;

      const playersDiv = document.createElement("div");
      playersDiv.className = "trade-players";
      playersDiv.innerHTML = `
        <div style="display:flex;justify-content:space-between;">
          <div>${itemsByTeam[p1].join("<br>") || "&nbsp;"}</div>
          <div style="text-align:right;">${itemsByTeam[p2].join("<br>") || "&nbsp;"}</div>
        </div>`;

      block.appendChild(dateDiv);
      block.appendChild(teamsDiv);
      block.appendChild(playersDiv);

      tbody.appendChild(block);
    });
  })
  .catch(err => console.error("Error loading league trades:", err));
}

function getTotalInjuredSalaryByPLF(pkPLF, Injured, Joueurs, Salaires) {
  if (!Array.isArray(Injured) || !Array.isArray(Joueurs) || !Array.isArray(Salaires)) {
    console.warn("Missing arrays in getTotalInjuredSalaryByPLF");
    return 0;
  }

  const injuredPlayers = Injured.filter(inj => inj.FkPooler === pkPLF);
  let total = 0;

  for (const inj of injuredPlayers) {
    const joueur = Joueurs.find(j => j.PKJoueurs === inj.FkJoueur);
    if (joueur && joueur.FKPLFSalaire) {
      const sal = Salaires.find(s => s.PKSalaire === joueur.FKPLFSalaire);
      if (sal && !isNaN(Number(sal.Salaire))) {
        total += Number(sal.Salaire);
      }
    }
  }

  return total > 10 ? 10 : total;
}

fillLeagueTrades();
