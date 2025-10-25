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
