import { type CSSProperties, useEffect, useMemo, useState } from "react";

type Mode = "auto" | "manual";

type WinnerList = {
  id: number;
  winners: string[];
};

type BurstParticle = {
  id: number;
  color: string;
  angle: number;
  distance: number;
  delay: number;
  size: number;
  shape: "circle" | "star";
};

const burstPalette = ["#f43f5e", "#fbbf24", "#22d3ee", "#a855f7", "#34d399", "#f97316", "#eab308", "#38bdf8"];

function randomPick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function parseNames(input: string): string[] {
  return input
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export default function App() {
  const [showLoading, setShowLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("auto");
  const [maxWinners, setMaxWinners] = useState(5);
  const [winnerLists, setWinnerLists] = useState<WinnerList[]>([{ id: 1, winners: [] }]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinCards, setSpinCards] = useState<string[]>([]);
  const [revealedWinner, setRevealedWinner] = useState<string | null>(null);
  const [pendingManualWinner, setPendingManualWinner] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Siapkan nama, lalu tekan Spin.");
  const [burstSeed, setBurstSeed] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLoading(false), 2200);
    return () => window.clearTimeout(timer);
  }, []);

  // Hitung total pemenang untuk counter global.
  const totalWinners = useMemo(
    () => winnerLists.reduce((acc, list) => acc + list.winners.length, 0),
    [winnerLists]
  );

  // Burst dibuat deterministik dari seed supaya animasi stabil di setiap render.
  const burstParticles = useMemo<BurstParticle[]>(() => {
    if (!burstSeed) return [];

    // Lebih banyak partikel untuk efek ledakan game yang epic
    return Array.from({ length: 60 }, (_, i) => ({
      id: burstSeed * 100 + i,
      color: burstPalette[i % burstPalette.length],
      angle: (360 / 60) * i + ((burstSeed * 17) % 360),
      distance: 140 + (i % 3) * 70 + (i % 5) * 30,
      delay: (i % 4) * 15,
      size: 4 + (i % 4) * 3,
      shape: i % 4 === 0 ? "star" : "circle",
    }));
  }, [burstSeed]);

  function addNames() {
    const names = parseNames(nameInput);

    if (!names.length) {
      setStatusText("Masukkan minimal 1 nama dulu.");
      return;
    }

    setParticipants((prev) => {
      const merged = [...prev];
      names.forEach((name) => {
        if (!merged.includes(name)) merged.push(name);
      });
      return merged;
    });

    setNameInput("");
    setStatusText(`${names.length} nama ditambahkan ke daftar undian.`);
  }

  function removeParticipant(name: string) {
    setParticipants((prev) => prev.filter((person) => person !== name));
  }

  function saveWinner(name: string, removeFromPool: boolean) {
    setWinnerLists((prev) => {
      const safeMax = Math.max(1, maxWinners);
      const current = [...prev];
      const lastList = current[current.length - 1];

      if (lastList.winners.length >= safeMax) {
        current.push({ id: lastList.id + 1, winners: [name] });
        return current;
      }

      const updatedLast = { ...lastList, winners: [...lastList.winners, name] };
      current[current.length - 1] = updatedLast;
      return current;
    });

    if (removeFromPool) {
      setParticipants((prev) => prev.filter((person) => person !== name));
    }
  }

  function startSpin() {
    if (isSpinning) return;

    if (pendingManualWinner) {
      setStatusText("Selesaikan keputusan mode manual dulu.");
      return;
    }

    if (!participants.length) {
      setStatusText("Daftar nama kosong. Tambahkan nama dulu ya.");
      return;
    }

    setIsSpinning(true);
    setRevealedWinner(null);
    setStatusText("Kartu sedang dikocok...");

    const cards = Array.from({ length: 5 }, (_, index) =>
      participants[index % participants.length] ?? "Mystery"
    );
    setSpinCards(cards);

    window.setTimeout(() => {
      const winner = randomPick(participants);

      setRevealedWinner(winner);
      setBurstSeed((seed) => seed + 1);
      setIsSpinning(false);

      if (mode === "auto") {
        saveWinner(winner, true);
        setStatusText(`Mode Auto: ${winner} jadi pemenang dan nama otomatis dihapus.`);
        return;
      }

      setPendingManualWinner(winner);
      setStatusText(`Mode Manual: Pilih simpan/hapus untuk ${winner}.`);
    }, 2600);
  }

  function handleManualDecision(action: "save_remove" | "save_keep" | "skip") {
    if (!pendingManualWinner) return;

    if (action === "save_remove") {
      saveWinner(pendingManualWinner, true);
      setStatusText(`${pendingManualWinner} disimpan, lalu dihapus dari daftar undian.`);
    }

    if (action === "save_keep") {
      saveWinner(pendingManualWinner, false);
      setStatusText(`${pendingManualWinner} disimpan, nama tetap ada di daftar undian.`);
    }

    if (action === "skip") {
      setStatusText(`${pendingManualWinner} tidak disimpan sebagai pemenang.`);
      setRevealedWinner(null);
    }

    setPendingManualWinner(null);
  }

  function resetAll() {
    setParticipants([]);
    setWinnerLists([{ id: 1, winners: [] }]);
    setPendingManualWinner(null);
    setRevealedWinner(null);
    setStatusText("Semua data di-reset. Siap untuk ronde baru.");
  }

  if (showLoading) {
    return (
      <div className="loading-screen flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-violet-300">Loading Experience</p>
          <h1 className="mt-5 text-3xl font-semibold md:text-5xl">Spin Card Name</h1>
          <p className="mt-3 text-base text-slate-300 md:text-lg">By Evaga (Rouf)</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Interactive Lottery</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">Spin Card Name</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
            Undian nama berbentuk kartu 3D. Tambah nama sesuka kamu, kocok, lalu tentukan pemenangnya.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Input Nama (pisahkan dengan Enter atau koma)</label>
              <textarea
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Contoh: Evaga, Rouf, Anya"
                className="min-h-28 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm outline-none transition focus:border-cyan-300"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={addNames}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Tambah Nama
                </button>
                <button
                  onClick={startSpin}
                  disabled={isSpinning}
                  className="rounded-lg bg-violet-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSpinning ? "Mengocok..." : "Spin Sekarang"}
                </button>
                <button
                  onClick={resetAll}
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold transition hover:border-slate-400"
                >
                  Reset Semua
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Mode</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setMode("auto")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      mode === "auto" ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setMode("manual")}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      mode === "manual" ? "bg-amber-300 text-slate-950" : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    Manual
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Auto: nama pemenang dihapus. Manual: kamu pilih simpan/hapus setelah reveal.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Max Pemenang per List</label>
                <input
                  type="number"
                  min={1}
                  value={maxWinners}
                  onChange={(event) => setMaxWinners(Math.max(1, Number(event.target.value) || 1))}
                  className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-300"
                />
                <p className="mt-3 text-xs text-slate-400">Jika list penuh, sistem otomatis buat list pemenang baru.</p>
              </div>
            </div>

            <p className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-cyan-200">{statusText}</p>

            {mode === "manual" && pendingManualWinner && (
              <div className="rounded-xl border border-amber-300/40 bg-amber-100/10 p-4">
                <p className="text-sm font-semibold text-amber-200">Pemenang sementara: {pendingManualWinner}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleManualDecision("save_remove")}
                    className="rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Simpan + Hapus Nama
                  </button>
                  <button
                    onClick={() => handleManualDecision("save_keep")}
                    className="rounded-lg bg-sky-300 px-3 py-2 text-sm font-semibold text-slate-950"
                  >
                    Simpan Saja
                  </button>
                  <button
                    onClick={() => handleManualDecision("skip")}
                    className="rounded-lg border border-amber-200/60 px-3 py-2 text-sm font-semibold text-amber-100"
                  >
                    Lewati
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Daftar Nama ({participants.length})</h2>
                <span className="text-xs text-slate-400">Tanpa batas</span>
              </div>
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {participants.length === 0 && <p className="text-sm text-slate-400">Belum ada nama.</p>}
                {participants.map((person) => (
                  <div key={person} className="flex items-center justify-between rounded-md bg-slate-800/70 px-3 py-2 text-sm">
                    <span>{person}</span>
                    <button onClick={() => removeParticipant(person)} className="text-xs text-rose-300 transition hover:text-rose-200">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="spin-stage relative flex h-[360px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_center,_#1f2937_0%,_#020617_70%)]">
              {/* Efek burst saat pemenang muncul */}
              <div className="pointer-events-none absolute inset-0">
                {burstSeed > 0 && !isSpinning && (
                  <div key={`shockwave-${burstSeed}`} className="shockwave active" />
                )}
                {burstParticles.map((particle) => (
                  <span
                    key={particle.id}
                    className={`burst-particle shape-${particle.shape}`}
                    style={
                      {
                        "--burst-angle": `${particle.angle}deg`,
                        "--burst-distance": `${particle.distance}px`,
                        "--burst-color": particle.color,
                        "--burst-delay": `${particle.delay}ms`,
                        "--burst-size": `${particle.size}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>

              {isSpinning ? (
                spinCards.map((cardName, index) => (
                  <div
                    key={`${cardName}-${index}`}
                    className="spin-card is-spinning"
                    style={{ "--card-index": index } as CSSProperties}
                  >
                    <div className="card-face card-front">
                      <div className="tarot-frame">
                        <p className="tarot-title">Tarot Fate</p>
                        <p className="tarot-name">{cardName}</p>
                      </div>
                    </div>
                    <div className="card-face card-back">
                      <div className="card-back-content">
                        <div className="mythic-core" />
                        <p className="mythic-text">LEGENDARY</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="spin-card settled">
                  <div className="card-face card-front reveal-face">
                    <div className="tarot-frame">
                      <p className="tarot-title">Winning Fate</p>
                      <p className="tarot-name winner-text">{revealedWinner ?? "?"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Pemenang ({totalWinners})</h2>
                <span className="text-xs text-slate-400">Counter aktif</span>
              </div>

              <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                {winnerLists.map((list) => (
                  <div key={list.id} className="rounded-lg border border-slate-700/70 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">List {list.id}</p>
                    {list.winners.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-400">Belum ada pemenang di list ini.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm text-slate-200">
                        {list.winners.map((winner, index) => (
                          <li key={`${winner}-${index}`}>{index + 1}. {winner}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <footer className="flex items-center gap-4 text-sm text-slate-300">
              <a href="https://www.instagram.com/roufdarkside/" target="_blank" rel="noreferrer" className="transition hover:text-cyan-300" aria-label="Instagram">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm8.5 1.5h-8.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-1.88a1.13 1.13 0 1 1 0 2.26 1.13 1.13 0 0 1 0-2.26Z" />
                </svg>
              </a>
              <a href="https://github.com/Swevaga" target="_blank" rel="noreferrer" className="transition hover:text-cyan-300" aria-label="GitHub">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.1.68-.21.68-.48v-1.68c-2.77.6-3.35-1.18-3.35-1.18-.46-1.14-1.11-1.44-1.11-1.44-.9-.62.07-.6.07-.6 1 .08 1.52 1.01 1.52 1.01.88 1.5 2.32 1.07 2.89.82.09-.64.35-1.07.63-1.32-2.22-.25-4.56-1.09-4.56-4.86 0-1.08.39-1.96 1.02-2.64-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.01A9.75 9.75 0 0 1 12 6.82c.86 0 1.73.12 2.54.35 1.91-1.28 2.75-1.01 2.75-1.01.55 1.38.2 2.4.1 2.65.63.68 1.02 1.56 1.02 2.64 0 3.78-2.35 4.61-4.58 4.85.36.3.68.9.68 1.81v2.68c0 .27.18.59.69.48A10 10 0 0 0 12 2Z" />
                </svg>
              </a>
              <a href="https://discordapp.com/users/1459104242660016155" target="_blank" rel="noreferrer" className="transition hover:text-cyan-300" aria-label="Discord">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.32 4.37A19.8 19.8 0 0 0 15.4 3a13.4 13.4 0 0 0-.63 1.31 18.34 18.34 0 0 0-5.54 0A13.4 13.4 0 0 0 8.6 3a19.8 19.8 0 0 0-4.92 1.37C.58 9 .16 13.46.37 17.88a19.9 19.9 0 0 0 6.03 3.06c.49-.66.93-1.35 1.32-2.06-.72-.27-1.41-.62-2.07-1.03.17-.13.34-.27.5-.41a14.14 14.14 0 0 0 11.7 0c.17.14.33.28.5.41-.66.41-1.35.76-2.07 1.03.39.71.83 1.4 1.32 2.06a19.9 19.9 0 0 0 6.03-3.06c.25-5.12-.43-9.55-3.31-13.51ZM8.86 15.2c-1.14 0-2.07-1.04-2.07-2.33 0-1.28.91-2.33 2.07-2.33 1.16 0 2.08 1.05 2.07 2.33 0 1.29-.91 2.33-2.07 2.33Zm6.28 0c-1.14 0-2.07-1.04-2.07-2.33 0-1.28.91-2.33 2.07-2.33 1.16 0 2.08 1.05 2.07 2.33 0 1.29-.91 2.33-2.07 2.33Z" />
                </svg>
              </a>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
