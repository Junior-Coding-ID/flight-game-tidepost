// landingEvaluator — what the touchdown was, in plain words.
// Good: VS <= 300 fpm, ground speed 38-72 kt, heading error <= 10 deg,
// bank <= 10 deg. Hard: VS <= 650 fpm, ground speed 25-85 kt, heading
// error <= 25 deg. Anything else is a crash, and the reason says exactly
// why — the pilot should never wonder what went wrong.
//
// The evaluator never touches game state: it classifies one touchdown.

export function classifyTouchdown(touchdown) {
  const vs = Math.abs(touchdown.vsFpm);
  const gs = touchdown.groundSpeedKt;
  const heading = touchdown.headingErrorDeg;
  const bank = touchdown.bankDeg;

  // Crash reasons, checked most specific first so the message is useful.
  if (!touchdown.onRunway) {
    return { kind: 'crash', label: 'OFF RUNWAY', reason: 'LANDED OFF THE RUNWAY' };
  }
  if (vs > 650) {
    return {
      kind: 'crash',
      label: 'TOO HARD',
      reason: `TOUCHDOWN TOO HARD — ${Math.round(vs)} FPM`,
    };
  }
  if (gs > 85) {
    return {
      kind: 'crash',
      label: 'TOO FAST',
      reason: `TOUCHDOWN TOO FAST — ${Math.round(gs)} KT`,
    };
  }
  if (gs < 25) {
    return {
      kind: 'crash',
      label: 'TOO SLOW',
      reason: `TOUCHDOWN TOO SLOW — ${Math.round(gs)} KT (STALLED IN)`,
    };
  }
  if (heading > 25) {
    return {
      kind: 'crash',
      label: 'WRONG DIRECTION',
      reason: `HEADING ${Math.round(heading)}° OFF THE RUNWAY`,
    };
  }
  if (bank > 25) {
    return {
      kind: 'crash',
      label: 'WING LOW',
      reason: `BANKED ${Math.round(bank)}° AT TOUCHDOWN`,
    };
  }

  if (vs <= 300 && gs >= 38 && gs <= 72 && heading <= 10 && bank <= 10) {
    const smooth = vs <= 150 && gs >= 45 && gs <= 65 && heading <= 5 && bank <= 5;
    return {
      kind: smooth ? 'perfect' : 'good',
      label: smooth ? 'BUTTER' : 'GOOD LANDING',
      reason: smooth ? 'GREASED IT — TEXTBOOK TOUCHDOWN' : 'SOLID TOUCHDOWN, WELL FLOWN',
    };
  }
  return {
    kind: 'hard',
    label: 'HARD LANDING',
    reason: `HARD LANDING — ${Math.round(vs)} FPM AT ${Math.round(gs)} KT`,
  };
}

// A touchdown's raw numbers, for the delivery report and the HUD flash.
export function touchdownSummary(touchdown) {
  return {
    vsFpm: Math.round(Math.abs(touchdown.vsFpm)),
    groundSpeedKt: Math.round(touchdown.groundSpeedKt),
    headingErrorDeg: Math.round(touchdown.headingErrorDeg),
    bankDeg: Math.round(touchdown.bankDeg),
  };
}
