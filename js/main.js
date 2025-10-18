
// ✅ Only declare if not already declared
if (typeof window.currentPkPLF === "undefined") {
  window.currentPkPLF = null;
}



import { loadTeamsMenu } from "./menuLoader.js";


// Toggle submenu on click
const teamsMenuLink = document.querySelector(".menu-item.has-submenu > a");

teamsMenuLink.addEventListener("click", (e) => {
  e.preventDefault();
  const parentLi = teamsMenuLink.parentElement;
  parentLi.classList.toggle("open"); // this will show/hide submenu
});

// Debug
//console.log("Script loaded, starting menu load...");

// Load Teams submenu
loadTeamsMenu("data/PLF.json","data/Equipes.json", "teamsSubmenu", (key, name) => {
  const display = document.getElementById("selectedTeam");
});


// Load main.html on page load
document.addEventListener('DOMContentLoaded', () => {
  loadPage('content/main.html');
});

// Function to load any HTML file into #mainContent
function loadPage(url) {
  fetch(url)
    .then(res => res.text())
    .then(html => {
      document.getElementById('mainContent').innerHTML = html;

      // 🟢 Only load mainTableLoader.js when loading main.html
      if (url.includes('main.html')) {
        const script = document.createElement('script');
        script.src = 'js/mainTableLoader.js';
        document.body.appendChild(script);
      }
    })
    .catch(err => console.error('Error loading page:', err));
}

// Example: attach clicks for menu items
document.getElementById('tradesMenu').addEventListener('click', e => {
  e.preventDefault();
  loadPage('content/trades.html'); // or any other page
});


// 🔹 Define loadTeams globally
/*function loadTeams(pk) {
  fetch(`content/teams.html?pk=${pk}`)
    .then(res => res.text())
    .then(html => {
      const container = document.querySelector('#mainContent');
      if (container) {
        container.innerHTML = html;
        window.currentPkPLF = pk;
        const script = document.createElement('script');
        script.src = 'js/teamLoader.js';
        document.body.appendChild(script);
      } else {
        console.error('#mainContent not found');
      }
    })
    .catch(err => console.error('Error loading teams.html:', err));
}*/
window.pkPLF = Number(window.currentPkPLF) || Number(window.pkPLF) || null;
// 🔹 Make it accessible everywhere
window.loadTeams = loadTeams;

function loadTeams(pk) {
  window.currentPkPLF = pk; // store the selected team globally
  console.log("🏒 Selected team:", pk);

  fetch("content/teams.html")
    .then(res => res.text())
    .then(html => {
      const container = document.getElementById("mainContent");
      if (container) {
        container.innerHTML = html;

        // after teams.html is loaded, run its script
        const script = document.createElement("script");
        script.src = "js/teamLoader.js";
        document.body.appendChild(script);
      }
    })
    .catch(err => console.error("Error loading teams.html:", err));
}