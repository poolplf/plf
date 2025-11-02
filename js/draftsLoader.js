// === draftsLoader.js ===
Promise.all([
  fetch("./data/Choix.json").then(r => r.json()),
  fetch("./data/Annees.json").then(r => r.json()),
  fetch("./data/Joueurs.json").then(r => r.json()),
  fetch("./data/PLF.json").then(r => r.json()),
  fetch("./data/Equipes.json").then(r => r.json())
])
.then(([Choix, Annees, Joueurs, PLF, Equipes]) => {
  const getPkAnnee = a => Number(a.PKAnnee ?? a.PKANNEE ?? a.pkAnnee);
  const getShortName = (FkPLF) => {
    const plf = PLF.find(p => Number(p.PkPLF) === Number(FkPLF));
    if (!plf) return "";
    const eq = Equipes.find(e => Number(e.PkEquipe) === Number(plf.FkEquipe));
    return eq ? (eq.ShortName || "") : "";
  };
  const getPlayerName = (FkJoueurs) => {
    const j = Joueurs.find(p => Number(p.PkJoueurs ?? p.PKJOUEUR ?? p.PKJoueurs) === Number(FkJoueurs));
    return j ? `${j.Prenom || ""} ${j.Nom || ""}`.trim() : "";
  };

//console.table(Annees)
// robust detection of "IsCurrent"
const currentYear = Annees.find(a => {
  const val = a.IsCurrent ?? a.isCurrent ?? a.ISCURRENT;
  return String(val).toLowerCase() === "true";
});

//console.log("current year", currentYear);

if (!currentYear) {
  console.error("❌ No IsCurrent year in Annees");
  return;
}

const currentPk = getPkAnnee(currentYear);

  const yearsAfter = Annees
    .filter(a => getPkAnnee(a) > currentPk)
    .sort((a,b) => getPkAnnee(a) - getPkAnnee(b))
    .slice(0,3);

    //console.table(yearsAfter)

// Show only past years that actually have picks in Choix
const yearsBefore = Annees
  .filter(a =>
    getPkAnnee(a) < currentPk &&
    Choix.some(c => Number(c.FkAnnee ?? c.FKANNEE) === getPkAnnee(a))
  )
  .sort((a,b) => getPkAnnee(b) - getPkAnnee(a));

    //console.table(yearsBefore)

  // ❌ DO NOT filter by Choix here — we want future years even if empty
  const displayYears = [...yearsAfter, currentYear, ...yearsBefore];

  const base = document.getElementById("draftTable");
  if (!base) return console.error("draftTable not found");
  const container = base.parentNode;

  // remove the static template; we'll insert a clone for every year
  base.remove();

  const buildMini = (list) => {
    const mini = document.createElement("table");
    mini.className = "basicTable";
    mini.id = "rondeTable";
    mini.innerHTML = `
      <thead>
        <tr><th>OV</th><th>Orig</th><th>New</th><th>Joueur</th></tr>
      </thead>
      <tbody></tbody>`;
    const tbody = mini.querySelector("tbody");

    list.slice().sort((a,b)=>Number(a.Overall)-Number(b.Overall)).forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${c.Overall ?? ""}</td>
        <td>${getShortName(c.FKPLF_OR_Owner ?? c.FKPLF_OR_OWNER)}</td>
        <td>${getShortName(c.FKPLF_NEW_Owner ?? c.FKPLF_NEW_OWNER)}</td>
        <td>${getPlayerName(c.FkJoueurs ?? c.FKJOUEURS)}</td>`;
      tbody.appendChild(tr);
    });
    return mini;
  };

  displayYears.forEach(annee => {
    const pkAnnee = getPkAnnee(annee);
    const tbl = base.cloneNode(true);

    // set year title
    const yearNode = tbl.querySelector("#year");
    if (yearNode) yearNode.textContent = annee.Annee;

    // uniquify ids for this table
    [["year","year"],["listRonde1","listRonde1"],["listRonde2","listRonde2"],
     ["listRonde3","listRonde3"],["listRondeX","listRondeX"]].forEach(([oldId, prefix])=>{
      const el = tbl.querySelector(`#${oldId}`);
      if (el) el.id = `${prefix}-${pkAnnee}`;
    });

    container.appendChild(tbl);

    // picks for this year (may be empty for future)
    const yearChoix = Choix.filter(c => Number(c.FkAnnee ?? c.FKANNEE) === pkAnnee);
    const grouped = {1:[],2:[],3:[],X:[]};
    yearChoix.forEach(c => {
      const r = Number(c.Ronde);
      (r>=1 && r<=3 ? grouped[r] : grouped.X).push(c);
    });

    // fill rounds (only append mini table if there are picks)
    ["1","2","3","X"].forEach(r=>{
      const cell = tbl.querySelector(`#listRonde${r}-${pkAnnee}`);
      if (!cell) return;
      cell.innerHTML = "";
      if (grouped[r].length) cell.appendChild(buildMini(grouped[r]));
      // else leave empty cell for future drafts
    });
  });
})
.catch(err => console.error("Error loading draft data:", err));
