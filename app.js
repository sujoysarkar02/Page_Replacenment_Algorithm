// =======================
//  YEAR AUTO UPDATE
// =======================
const yearEl = document.getElementById("year");
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}

// =======================
//  SMOOTH SCROLL
// =======================
const scrollBtn = document.getElementById("scrollToAlgos");
if (scrollBtn) {
  scrollBtn.addEventListener("click", () => {
    const section = document.getElementById("algos");
    section?.scrollIntoView({ behavior: "smooth" });
  });
}

// =======================
//  ALGO SELECTION
// =======================
const cards = document.querySelectorAll(".algo-card");
const selectedAlgoEl = document.getElementById("selectedAlgo");
const continueBtn = document.getElementById("continueBtn");

// Display names
const labelMap = {
  FIFO: "FIFO",
  LRU: "LRU",
  OPTIMAL: "Optimal"
};

// Page mapping
const pageMap = {
  LRU: "lru.html",
  FIFO: "fifo.html",
  OPTIMAL: "optimal.html"
};

// Load previous selection
let selected = localStorage.getItem("selectedAlgo") || "LRU";
setSelected(selected);

// Click events for cards
cards.forEach((card) => {
  card.addEventListener("click", () => {
    const algo = card.dataset.algo || "LRU";
    selected = algo;
    setSelected(algo);
    localStorage.setItem("selectedAlgo", algo);
  });
});

// =======================
//  UPDATE UI
// =======================
function setSelected(algo) {
  // Remove active class from all cards
  cards.forEach(c => c.classList.remove("active"));

  // Add active class to selected card
  const activeCard = Array.from(cards).find(c => c.dataset.algo === algo);
  if (activeCard) activeCard.classList.add("active");

  // Update selected label
  if (selectedAlgoEl) {
    selectedAlgoEl.textContent = labelMap[algo] || algo;

    // Style label like a highlighted card
    Object.assign(selectedAlgoEl.style, {
      display: "inline-block",
      background: "linear-gradient(135deg, rgba(124,77,255,0.2), rgba(179,136,255,0.2))",
      color: "#ffffff",
      fontWeight: "900",
      fontSize: "16px",
      padding: "6px 12px",
      borderRadius: "12px",
      border: "1px solid rgba(124,77,255,0.25)",
      marginTop: "10px",
      transition: "all 0.25s ease"
    });
  }

  // Update continue button
  if (continueBtn) {
    continueBtn.href = pageMap[algo] || "lru.html";

    Object.assign(continueBtn.style, {
      display: "block",          // New line
      marginTop: "16px",
      background: "linear-gradient(135deg, rgba(124,77,255,0.6), rgba(179,136,255,0.6))",
      color: "#ffffff",
      fontWeight: "950",
      fontSize: "18px",
      padding: "14px 20px",
      border: "1px solid rgba(124,77,255,0.45)",
      borderRadius: "14px",
      cursor: "pointer",
      transition: "all 0.25s ease",
      textAlign: "center",
      width: "100%",            // Full container width (responsive)
      maxWidth: "280px"          // Optional max width
    });
  }
}
