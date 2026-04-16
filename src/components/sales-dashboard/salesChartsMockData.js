/**
 * Mock data for Sales Dashboard charts.
 * This file is gitignored to allow local-only customization.
 */

export const USE_LOCAL_DEMO_DATA = false;

export const DEMO_REP_NAMES = [
  "Alex Carter",
  "Bianca Santos",
  "Carlos Rivera",
  "Dana Lee",
  "Ethan Cruz",
  "Fatima Noor",
  "Gabriel Tan",
  "Hana Kim",
  "Ivan Petrov",
  "Jasmine Ong",
  "Kenji Sato",
  "Liam Murphy",
  "Mia Lopez",
  "Noah Lim",
  "Olivia Park",
  "Paolo Reyes",
  "Quinn Hall",
  "Rina Gomez",
  "Samir Malik",
  "Talia Brown",
];

export const MOCK_LEADERBOARD = DEMO_REP_NAMES.map((name, i) => {
  const dealsWon = 8 + ((i * 3) % 19);
  const dealsLost = 3 + ((i * 2) % 11);
  const revenueWon = 120000 + i * 47000 + ((i * 16789) % 80000);
  const revenueLost = 15000 + ((i * 9437) % 60000);

  return {
    name,
    dealsWon,
    dealsLost,
    revenueWon,
    revenueLost,
  };
});

export const MOCK_PRODUCT_DATA = Array.from({ length: 16 }, (_, i) => ({
  name: `Product Line ${String(i + 1).padStart(2, "0")}`,
  won: 25000 + i * 22000 + ((i * 8531) % 50000),
  lost: 4000 + ((i * 6113) % 18000),
  count: 6 + ((i * 5) % 18),
})).sort((a, b) => b.won - a.won);
