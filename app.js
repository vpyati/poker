const state = {
  handsPlayed: 0,
  wins: 0,
  stack: 1000,
  pot: 0,
  roundIndex: 0,
  deck: [],
  playerCards: [],
  opponentCards: [],
  communityCards: [],
  history: [],
  recommendations: [],
  roundActions: [],
  isHandActive: false,
};

const rounds = [
  { name: "Pre-flop", community: 0 },
  { name: "Flop", community: 3 },
  { name: "Turn", community: 1 },
  { name: "River", community: 1 },
];

const handLog = document.getElementById("timeline");
const report = document.getElementById("report");
const roundLabel = document.getElementById("roundLabel");
const playerCards = document.getElementById("playerCards");
const communityCards = document.getElementById("communityCards");
const actionPrompt = document.getElementById("actionPrompt");
const startHandButton = document.getElementById("startHand");
const nextRoundButton = document.getElementById("nextRound");
const actionFold = document.getElementById("actionFold");
const actionCall = document.getElementById("actionCall");
const actionRaise = document.getElementById("actionRaise");
const handsPlayedLabel = document.getElementById("handsPlayed");
const winRateLabel = document.getElementById("winRate");
const lastResultLabel = document.getElementById("lastResult");
const stackLabel = document.getElementById("stackLabel");
const potLabel = document.getElementById("potLabel");

const seatStatus = Array.from({ length: 5 }, (_, index) =>
  document.getElementById(`seatStatus${index + 1}`)
);

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const opponentNames = ["Avery", "Jordan", "Blake", "Harper", "Quinn"];
const showdownSection = document.getElementById("showdownSection");
const showdownGrid = document.getElementById("showdownGrid");

const buildDeck = () => {
  const deck = [];
  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      deck.push({ rank, suit, code: `${rank}${suit}` });
    });
  });
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

const dealCards = (count) => state.deck.splice(0, count);

const renderCards = (container, cards, emptyCount = 0) => {
  container.innerHTML = "";
  cards.forEach((card) => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.textContent = card.code;
    container.appendChild(cardEl);
  });
  for (let i = 0; i < emptyCount; i += 1) {
    const cardEl = document.createElement("div");
    cardEl.className = "card muted";
    cardEl.textContent = "?";
    container.appendChild(cardEl);
  }
};

const updateStats = (resultText) => {
  handsPlayedLabel.textContent = state.handsPlayed;
  const winRate = state.handsPlayed === 0 ? 0 : Math.round((state.wins / state.handsPlayed) * 100);
  winRateLabel.textContent = `${winRate}%`;
  lastResultLabel.textContent = resultText || "—";
  stackLabel.textContent = `Stack: $${state.stack}`;
  potLabel.textContent = `Pot: $${state.pot}`;
};

const estimateStrength = () => {
  const rankValue = (rank) => ranks.length - ranks.indexOf(rank);
  const strengthFromCards = state.playerCards.reduce((sum, card) => sum + rankValue(card.rank), 0);
  const communityValue = state.communityCards.reduce((sum, card) => sum + rankValue(card.rank), 0);
  const base = strengthFromCards + communityValue / 3;
  const normalized = base / 30;
  return Math.min(0.95, Math.max(0.1, normalized + Math.random() * 0.15));
};

const getRecommendation = (strength, potOdds) => {
  if (strength > 0.7 || (strength > 0.55 && potOdds < 0.3)) {
    return { action: "Raise", reason: "Strong equity for building the pot." };
  }
  if (strength > 0.45 && potOdds <= 0.45) {
    return { action: "Call", reason: "Playable strength with reasonable pot odds." };
  }
  return { action: "Fold", reason: "Low equity relative to price." };
};

const updateSeatStatuses = () => {
  seatStatus.forEach((status) => {
    const actions = ["Calls", "Raises", "Checks", "Folds"];
    status.textContent = actions[Math.floor(Math.random() * actions.length)];
  });
};

const updateTimeline = (label, detail) => {
  const item = document.createElement("div");
  item.className = "timeline-item";
  item.innerHTML = `<strong>${label}</strong>${detail}`;
  handLog.appendChild(item);
};

const resetTimeline = () => {
  handLog.innerHTML = "";
};

const resetReport = () => {
  report.className = "report empty";
  report.textContent = "Finish a hand to receive feedback on each decision.";
};

const renderShowdownHands = (shouldShow) => {
  showdownSection.classList.toggle("is-visible", shouldShow);
  showdownGrid.innerHTML = "";

  if (!shouldShow) return;

  const participants = [
    { name: "You", cards: state.playerCards },
    ...opponentNames.map((name, index) => ({
      name,
      cards: state.opponentCards[index] || [],
    })),
  ];

  participants.forEach(({ name, cards }) => {
    const row = document.createElement("div");
    row.className = "showdown-row";

    const label = document.createElement("span");
    label.className = "showdown-name";
    label.textContent = name;
    row.appendChild(label);

    const cardsWrap = document.createElement("div");
    cardsWrap.className = "cards";
    row.appendChild(cardsWrap);
    renderCards(cardsWrap, cards);

    showdownGrid.appendChild(row);
  });
};

const renderReport = () => {
  report.className = "report";
  report.innerHTML = "";

  state.roundActions.forEach((round, index) => {
    const item = document.createElement("div");
    item.className = `report-item ${round.isGood ? "good" : "bad"}`;
    const header = `${round.roundName}: ${round.action}`;
    const verdict = round.isGood ? "Good decision" : "Missed opportunity";
    item.innerHTML = `
      <h4>${header}</h4>
      <p>${verdict} — ${round.reason}</p>
      <p class="muted">Coach: ${state.recommendations[index].reason}</p>
    `;
    report.appendChild(item);
  });

  const summary = document.createElement("div");
  summary.className = "report-item";
  summary.innerHTML = `<h4>Overall takeaway</h4>
    <p>${state.wins === state.handsPlayed ? "Momentum is strong" : "Focus on consistent discipline"} — you followed ${state.roundActions.filter((round) => round.isGood).length} of ${state.roundActions.length} optimal decisions.</p>`;
  report.appendChild(summary);
};

const endHand = (result) => {
  state.handsPlayed += 1;
  if (result === "Win") {
    state.wins += 1;
    state.stack += state.pot;
  } else {
    state.stack -= Math.min(state.pot, 120);
  }
  state.isHandActive = false;
  actionFold.disabled = true;
  actionCall.disabled = true;
  actionRaise.disabled = true;
  nextRoundButton.disabled = true;
  startHandButton.disabled = false;
  updateStats(result);
  renderReport();
};

const revealRound = ({ enableActions = true, setPrompt = true } = {}) => {
  const round = rounds[state.roundIndex];
  const newCards = dealCards(round.community);
  state.communityCards.push(...newCards);
  renderCards(communityCards, state.communityCards, 5 - state.communityCards.length);
  roundLabel.textContent = round.name;
  updateSeatStatuses();

  const strength = estimateStrength();
  const potOdds = Math.random() * 0.6;
  const recommendation = getRecommendation(strength, potOdds);
  state.recommendations.push(recommendation);

  updateTimeline(round.name, `Pot odds ${Math.round(potOdds * 100)}% — Coach suggests ${recommendation.action}.`);
  if (setPrompt) {
    actionPrompt.textContent = `Coach suggests: ${recommendation.action}. Choose your action.`;
  }

  actionFold.disabled = !enableActions;
  actionCall.disabled = !enableActions;
  actionRaise.disabled = !enableActions;
};

const resolveFold = () => {
  actionPrompt.textContent = "You folded. The table plays on to a showdown.";
  nextRoundButton.disabled = true;

  while (state.roundIndex < rounds.length - 1) {
    state.roundIndex += 1;
    revealRound({ enableActions: false, setPrompt: false });
  }

  renderShowdownHands(true);
  updateTimeline("Showdown", "You folded — another player won the pot.");
  endHand("Loss");
};

const startHand = () => {
  state.deck = buildDeck();
  state.playerCards = dealCards(2);
  state.opponentCards = opponentNames.map(() => dealCards(2));
  state.communityCards = [];
  state.roundIndex = 0;
  state.history = [];
  state.recommendations = [];
  state.roundActions = [];
  state.isHandActive = true;
  state.pot = 60;

  renderCards(playerCards, state.playerCards);
  renderCards(communityCards, state.communityCards, 5);
  resetTimeline();
  resetReport();
  renderShowdownHands(false);
  updateSeatStatuses();

  startHandButton.disabled = true;
  nextRoundButton.disabled = true;
  actionPrompt.textContent = "Pre-flop decision time.";
  roundLabel.textContent = "Pre-flop";
  updateStats();

  revealRound();
};

const chooseAction = (action) => {
  if (!state.isHandActive) return;
  const recommendation = state.recommendations[state.roundIndex];
  const isGood = recommendation.action === action;
  const reasons = {
    Fold: "You avoided costly variance with marginal strength.",
    Call: "You kept the pot manageable while realizing equity.",
    Raise: "You applied pressure to maximize value.",
  };

  state.roundActions.push({
    roundName: rounds[state.roundIndex].name,
    action,
    isGood,
    reason: reasons[action],
  });

  updateTimeline("You", `${action} — ${isGood ? "Aligned with coach" : "Deviated from coach"}.`);

  actionFold.disabled = true;
  actionCall.disabled = true;
  actionRaise.disabled = true;

  if (action === "Fold") {
    resolveFold();
    return;
  }

  actionPrompt.textContent = "Action recorded. Advance to the next round.";
  nextRoundButton.disabled = false;
};

const nextRound = () => {
  state.roundIndex += 1;
  if (state.roundIndex >= rounds.length) {
    const strength = estimateStrength();
    const result = Math.random() < strength ? "Win" : "Loss";
    renderShowdownHands(true);
    updateTimeline("Showdown", `You ${result === "Win" ? "won" : "lost"} the pot.`);
    endHand(result);
    return;
  }
  nextRoundButton.disabled = true;
  revealRound();
};

startHandButton.addEventListener("click", startHand);
nextRoundButton.addEventListener("click", nextRound);

[actionFold, actionCall, actionRaise].forEach((button) => {
  button.addEventListener("click", (event) => {
    chooseAction(event.target.textContent.trim());
  });
});

updateStats();
renderCards(communityCards, [], 5);
