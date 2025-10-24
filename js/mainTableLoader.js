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
    tbody.innerHTML = "<tr><th>IN</th><th>OUT</th></tr>";

    // Sort all trades by date descending and take the last 20
    const trades = Echanges.sort((a,b)=> new Date(b.DateEchange) - new Date(a.DateEchange)).slice(0,20);

    const numEq = (a,b)=>Number(a)===Number(b);
    const getNum = (o,keys)=>{for(const k of keys){if(o[k]!=null&&!isNaN(o[k]))return Number(o[k]);}return NaN;};

    trades.forEach(trade=>{
      const tradePk = getNum(trade,["PkEchange"]);
      const items = TradeItems.filter(it=>numEq(getNum(it,["FkTrade"]),tradePk));

      // Get both teams
      const p1 = getNum(trade,["FkPooler1"]);
      const p2 = getNum(trade,["FkPooler2"]);

      const getTeamName = pk=>{
        const plf = PLF.find(p=>numEq(getNum(p,["PkPLF"]),pk));
        const eq = plf ? Equipes.find(e=>numEq(getNum(e,["PkEquipe"]),getNum(plf,["FkEquipe"]))) : null;
        return eq?.ShortName || eq?.Shortname || eq?.Nom || `PLF#${pk}`;
      };

      const team1 = getTeamName(p1);
      const team2 = getTeamName(p2);

      // classify by FkPooler
      const itemsByTeam = {[p1]:[], [p2]:[]};

      items.forEach(it=>{
        let text="";
        const fkJ = getNum(it,["FkJoueur"]);
        if(fkJ){
          const j = Joueurs.find(j=>numEq(getNum(j,["PkJoueur","PKJoueurs"]),fkJ));
          if(j) text = `${(j.Prenom||"").charAt(0)}. ${j.Nom||""}`;
        }
        const fkC = getNum(it,["FkChoix"]);
        if(fkC){
          const c = Choix.find(c=>numEq(getNum(c,["PkChoix"]),fkC));
          if(c){
            const a = Annees.find(a=>numEq(getNum(a,["PkAnnee","PKAnnee"]),getNum(c,["FkAnnee"])));
            const year = a?.Annee?.slice(0,4) || "";
            const r = Number(c.Ronde);
            const rondeTxt = isNaN(r)?"":`${r}${r===1?"er":"e"}`;
            text = `${rondeTxt} ${year}`;
          }
        }
        if(text) itemsByTeam[getNum(it,["FkPooler"])].push(text);
      });

      // build mini-table for this trade
      const mini = document.createElement("table");
      mini.className="mini-trade";
      mini.style.width="100%";

      const r1=document.createElement("tr");
      r1.innerHTML=`<td><b>${team1}</b></td><td><b>${team2}</b></td>`;
      mini.appendChild(r1);

      const r2=document.createElement("tr");
      r2.innerHTML=`<td>${itemsByTeam[p1].join("<br>")||"&nbsp;"}</td><td>${itemsByTeam[p2].join("<br>")||"&nbsp;"}</td>`;
      mini.appendChild(r2);

      const row=document.createElement("tr");
      const cell=document.createElement("td");
      cell.colSpan=2;
      cell.innerHTML=`<b>${trade.DateEchange}</b><br>`;
      cell.appendChild(mini);
      row.appendChild(cell);
      tbody.appendChild(row);
    });
  })
  .catch(err=>console.error("Error loading league trades:",err));
}

fillLeagueTrades();
