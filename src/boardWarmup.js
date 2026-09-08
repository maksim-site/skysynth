// Keep prepared instances mounted. Only one new model is prepared at a time,
// and never start that CPU/GPU work during a visible selector transition.
export function selectWarmBoards(boards, activeIndex, ready, pendingIndex, idle) {
  const active = boards[activeIndex];
  const selected = boards.filter((board) => board === active || ready.has(board.model));
  if (!idle || !ready.has(active.model)) return selected;
  const candidates = pendingIndex == null ? [] : [boards[pendingIndex]];
  for (let distance = 1; distance < boards.length; distance += 1) {
    candidates.push(boards[(activeIndex + distance) % boards.length]);
    candidates.push(boards[(activeIndex - distance + boards.length) % boards.length]);
  }
  const next = candidates.find((board) => !ready.has(board.model));
  return next ? [...selected, next] : selected;
}
