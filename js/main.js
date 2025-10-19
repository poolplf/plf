
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


// Load Teams submenu
loadTeamsMenu("data/PLF.json","data/Equipes.json", "teamsSubmenu", (key, name) => {
  const display = document.getElementById("selectedTeam");
});

const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");

toggleBtn.textContent = "◀"; // open by default

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  document.body.classList.toggle("sidebar-collapsed");
  toggleBtn.textContent = sidebar.classList.contains("collapsed") ? "▶" : "◀";
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