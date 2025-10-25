export function loadTeamsMenu(plfPath, equipesPath, submenuId, onTeamClick) {
  //console.log("Loading PLF from:", plfPath);
  //console.log("Loading Equipes from:", equipesPath);

  // Load both JSON files in parallel
  Promise.all([fetch(plfPath), fetch(equipesPath)])
    .then(async ([plfRes, equipesRes]) => {
      if (!plfRes.ok) throw new Error("File not found: " + plfPath);
      if (!equipesRes.ok) throw new Error("File not found: " + equipesPath);
      return [await plfRes.json(), await equipesRes.json()];
    })
    .then(([plfData, equipesData]) => {
      //console.log("PLF data:", plfData);
      //console.log("Equipes data:", equipesData);
      //console.log("Loaded Equipes:", equipesData.length, equipesData);

      // Make a lookup map for faster access by key
      const equipesMap = {};
      equipesData.forEach(eq => {
        equipesMap[eq.PkEquipe] = eq;
      });

      // Remove all PLF entries with PkPLF = 27
      plfData = plfData.filter(item => Number(item.PkPLF) !== 27);

      // Sort PLF by team shortname (via lookup)
      plfData.sort((a, b) => {
        const nameA = equipesMap[a.FkEquipe]?.ShortName || "";
        const nameB = equipesMap[b.FkEquipe]?.ShortName || "";
        return nameA.localeCompare(nameB);
      });

      const submenu = document.getElementById(submenuId);

      submenu.innerHTML = "";
  
      plfData.forEach(plf => {
        const equipe = equipesMap[plf.FkEquipe];

        if (!equipe) return; // skip if no match

        /*console.log("DEBUG:",
          "PLF.FkEquipe =", plf.FkEquipe,
          "| Matching equipe =", equipesMap[plf.FkEquipe],
          "| All equipes keys =", Object.keys(equipesMap)
        );*/

        const li = document.createElement("li");

        // Create link wrapper
        const link = document.createElement("a");
        const linkTopMenu = document.createElement("a");
        link.href = "#";
        linkTopMenu.href = "#";
        link.classList.add("team-logo");
        linkTopMenu.classList.add("team-logo");

        // Add logo image
        const img = document.createElement("img");
        img.src = "./files/" + equipe.Logo;
        img.alt = equipe.ShortName;
        img.classList.add("team-logo");
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.verticalAlign = "middle";
        img.style.marginRight = "8px";

        // Add text
        let text = document.createTextNode(equipe.ShortName);
  
        // Append logo + text to link
        link.appendChild(img);
        link.appendChild(text);

        // Click event
        link.addEventListener("click", (e) => {
          e.preventDefault();
          submenu.querySelectorAll("li").forEach(li => li.classList.remove("selected"));
          li.classList.add("selected");
          // Load teams.html dynamically in mainContent
          if (typeof loadTeams === "function") {            
            loadTeams(plf.PkPLF);
          }
        });

        li.appendChild(link);
        submenu.appendChild(li);
      });
    })
    .catch(error => console.error("Error loading data:", error));
}