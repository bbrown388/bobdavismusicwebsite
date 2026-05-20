# Retrospective: Game 61 — Snake Eyes

**Built:** 2026-05-20  
**File:** `snake-eyes.html`  
**Tests:** 51 pass  
**Mechanic:** Liar's Dice hidden-information duel / binomial probability display / 4-personality sheriff AI / 5-round escalating bounties

---

## What This Game Did

Liar's Dice (Perudo) as a bounty-stakes duel against a sheriff. Both players secretly roll 5 dice. The active player bids on how many of a given face value exist across both hands. The opponent either raises the bid or calls "bluff". If you call and the actual count is less than the bid, the caller wins; if the count meets or exceeds the bid, the bidder wins. Five rounds with bounties climbing from $200 to $1000. The sheriff has one of four personality modes — Cautious, Aggressive, Calculating, Reckless — that control bluff rate, call threshold, and aggression factor. A live probability bar tells the player how likely the current bid is valid based on their own dice plus binomial estimates for the hidden ones.

---

## Techniques Proven

### Binomial Probability (Exact Tail Sum)
```javascript
function binomialGTE(n, k) {
  if (k <= 0) return 1;
  if (k > n) return 0;
  let prob = 0;
  const p = 1 / 6, q = 5 / 6;
  for (let i = k; i <= n; i++) {
    prob += binomCoeff(n, i) * Math.pow(p, i) * Math.pow(q, n - i);
  }
  return Math.min(1, Math.max(0, prob));
}
const _memo = {};
function binomCoeff(n, k) {
  const key = n + ',' + k;
  if (_memo[key] !== undefined) return _memo[key];
  if (k === 0 || k === n) return (_memo[key] = 1);
  return (_memo[key] = binomCoeff(n - 1, k - 1) + binomCoeff(n - 1, k));
}
```
Memoized Pascal's triangle approach. For n≤10 the recursion never blows the stack and the memo prevents redundant calls across multiple probability checks per frame.

### Bid Probability Display
```javascript
function bidProbability(bid, playerDice, totalDice) {
  const playerCount = countFace(playerDice, bid.face);
  const unknownDice = totalDice - playerDice.length;
  const needed = bid.qty - playerCount;
  return binomialGTE(unknownDice, needed);
}
```
The player's own dice are "known" — the sheriff's 5 are unknown. The bar shows P(sheriff's hidden dice contribute enough to make the bid true). Colored green/orange/red at 60%/35% thresholds.

### 4-Personality Sheriff AI
```javascript
const PERSONALITIES = [
  { name: 'Cautious',    bluffRate: 0.12, callThreshold: 0.22, aggression: 0.30 },
  { name: 'Aggressive',  bluffRate: 0.52, callThreshold: 0.12, aggression: 0.82 },
  { name: 'Calculating', bluffRate: 0.28, callThreshold: 0.28, aggression: 0.52 },
  { name: 'Reckless',    bluffRate: 0.65, callThreshold: 0.42, aggression: 0.88 }
];
```
Each personality uses the same `sheriffMakeBid` function but with different parameters:
- `bluffRate`: probability sheriff picks a random face (bluff) vs honest best face
- `callThreshold`: probability threshold below which sheriff calls instead of bidding
- `aggression`: probability sheriff bumps bid quantity by +1 beyond expected

### Bid Validation Logic
```javascript
function isValidBid(newBid, currentBid) {
  if (currentBid.qty === 0) return newBid.qty >= 1 && newBid.face >= 1 && newBid.face <= 6;
  if (newBid.qty > currentBid.qty) return true;
  if (newBid.qty === currentBid.qty && newBid.face > currentBid.face) return true;
  return false;
}
```
Standard Perudo rule: higher qty is always valid regardless of face; equal qty requires higher face.

---

## Sheriff AI Fallback Chain

When the sheriff's natural bid doesn't beat the current bid, a fallback chain ensures the sheriff always produces a valid move or calls:
1. Try honest face at estimated qty
2. If same face, raise qty to `currentBid.qty + 1`
3. If lower face, jump to current bid face and raise qty by 1
4. If resulting qty > totalDice: call (impossible bid)

---

## Test Suite Notes (51 tests)

- Bid validation covers all 6 cases: first bid, same qty higher face, higher qty any face, same qty same face (invalid), same qty lower face (invalid), lower qty (invalid)
- `sheriffMakeBid calls when bid probability is too low` uses qty=10 face=6 (all 10 dice must be sixes) which is essentially impossible — confirms the call fallback at maxed bids
- `playerCall fails if player made last bid` guards the anti-call-own-bid rule
- Score accumulation test wins rounds 0 and 1 (bounties $200 + $400 = $600) using forced dice

---

## Round Config Summary

| Round | Bounty | Label           |
|-------|--------|-----------------|
| 1     | $200   | Two-Bit Brawl   |
| 2     | $400   | Silver Spur     |
| 3     | $600   | Deputy's Gold   |
| 4     | $800   | Marshal's Purse |
| 5     | $1000  | Outlaw's Crown  |

---

## What Raised the Bar

- First dice-based probability game in series (all prior games were skill or strategy)
- First Liar's Dice hidden-information bidding mechanic
- First game with live per-decision probability display (player sees exact odds on every bid)
- First AI opponent with 4 distinct probability-parameterized personality modes

---

## Action Items for Game 62 (Texas Twister)

- Vortex physics: objects should spiral inward with decreasing radius over time, not just move in circles
- Drag-to-carry: use a spring-follow offset from touch position (like a leash) so items feel physically carried
- Expand the "safe zone" (cellar door) to be large enough to be satisfying to target under pressure
- Angular velocity for debris should accelerate as vortex grows — faster outer ring, chaotic near center
