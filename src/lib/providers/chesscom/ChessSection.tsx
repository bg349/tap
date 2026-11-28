import type { ChessData, ChessGame, ChessMode } from "./api";

const MODE_LABEL: Record<ChessMode, string> = {
  rapid: "Rapid",
  blitz: "Blitz",
  bullet: "Bullet",
  daily: "Daily",
};

const MODE_GLYPH: Record<ChessMode, string> = {
  rapid: "◷",
  blitz: "⚡",
  bullet: "•",
  daily: "☀",
};

function pct(n: number, total: number) {
  return total === 0 ? 0 : Math.round((n / total) * 100);
}

function timeAgo(unixSeconds: number) {
  const diff = Date.now() / 1000 - unixSeconds;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.round(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatTimeControl(tc: string) {
  if (tc.includes("/")) return "Daily";
  const [base, inc] = tc.split("+").map(Number);
  const mins = base >= 60 ? `${base / 60}` : `${base}s`;
  return inc ? `${mins}+${inc}` : `${mins} min`;
}

function RecordBar({ win, loss, draw }: { win: number; loss: number; draw: number }) {
  const total = win + loss + draw;
  return (
    <div>
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
        role="img"
        aria-label={`${win} wins, ${loss} losses, ${draw} draws`}
      >
        <div className="bg-[var(--win)]" style={{ width: `${pct(win, total)}%` }} />
        <div className="bg-[var(--draw)]" style={{ width: `${pct(draw, total)}%` }} />
        <div className="bg-[var(--loss)]" style={{ width: `${pct(loss, total)}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--muted)] tabular-nums">
        <span>
          <b className="font-semibold text-[var(--win)]">{win.toLocaleString()}</b> W ·{" "}
          {pct(win, total)}%
        </span>
        <span>
          <b className="font-semibold text-[var(--draw-text)]">{draw.toLocaleString()}</b> D
        </span>
        <span>
          <b className="font-semibold text-[var(--loss)]">{loss.toLocaleString()}</b> L
        </span>
      </div>
    </div>
  );
}

const OUTCOME_STYLE: Record<ChessGame["outcome"], string> = {
  win: "bg-[var(--win)] text-white",
  loss: "bg-[var(--loss)] text-white",
  draw: "bg-[var(--draw)] text-[var(--fg)]",
};

function GameRow({ game }: { game: ChessGame }) {
  return (
    <li>
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
      >
        <span
          className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${OUTCOME_STYLE[game.outcome]}`}
          aria-label={game.outcome}
        >
          {game.outcome === "win" ? "W" : game.outcome === "loss" ? "L" : "D"}
        </span>
        <span
          className={`size-3 shrink-0 rounded-sm border border-[var(--border)] ${
            game.color === "white" ? "bg-white" : "bg-neutral-900"
          }`}
          title={`Played as ${game.color}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            vs {game.opponent}{" "}
            <span className="font-normal text-[var(--muted)] tabular-nums">
              ({game.opponentRating})
            </span>
          </span>
          <span className="block text-xs text-[var(--muted)]">
            {formatTimeControl(game.timeControl)} · {game.result}
            {game.rated ? "" : " · casual"}
          </span>
        </span>
        <span className="shrink-0 text-right text-xs text-[var(--muted)] tabular-nums">
          {timeAgo(game.endTime)}
        </span>
      </a>
    </li>
  );
}

export function ChessSection({ data }: { data: ChessData }) {
  const { modes, totals, puzzles, puzzleRushBest, recentGames } = data;
  return (
    <div className="space-y-6">
      {modes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {modes.map((m) => (
            <div
              key={m.mode}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
            >
              <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                <span aria-hidden>{MODE_GLYPH[m.mode]}</span>
                {MODE_LABEL[m.mode]}
              </div>
              <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {m.rating}
              </div>
              {m.best ? (
                <div className="mt-0.5 text-xs text-[var(--muted)] tabular-nums">
                  Peak {m.best}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">No rated games yet.</p>
      )}

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <h3 className="mb-3 text-sm font-semibold">
            Record{" "}
            <span className="font-normal text-[var(--muted)] tabular-nums">
              · {(totals.win + totals.loss + totals.draw).toLocaleString()} games
            </span>
          </h3>
          <RecordBar {...totals} />
        </div>
        {(puzzles || puzzleRushBest) && (
          <div className="flex gap-3">
            {puzzles && (
              <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="text-xs text-[var(--muted)]">Puzzle rating</div>
                <div className="text-xl font-semibold tabular-nums">{puzzles.highest}</div>
                <div className="text-[10px] text-[var(--muted)]">peak</div>
              </div>
            )}
            {puzzleRushBest ? (
              <div className="rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="text-xs text-[var(--muted)]">Puzzle Rush</div>
                <div className="text-xl font-semibold tabular-nums">{puzzleRushBest}</div>
                <div className="text-[10px] text-[var(--muted)]">best</div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {recentGames.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Recent games</h3>
          <ul className="-mx-3">
            {recentGames.map((g) => (
              <GameRow key={g.url} game={g} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
