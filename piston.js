// ===== CodeGuru — code runner (Piston public API, free, no key needed) =====
// Docs: https://github.com/engineer-man/piston
const PISTON_BASE = "https://emkc.org/api/v2/piston";

// Map our language dropdown values -> Piston's language names.
// Piston versions change over time, so we always ask it for the
// latest available version instead of hardcoding one.
const LANGUAGE_MAP = {
  "C": "c",
  "C++": "cpp",
  "Java": "java",
  "Python": "python",
  "JavaScript": "javascript",
  "PHP": "php",
  "Kotlin": "kotlin",
  "Swift": "swift",
  "Dart": "dart",
  "C#": "csharp",
  "Go": "go",
  "Rust": "rust",
  "SQL": "sqlite3"
};

// Languages that Piston can't meaningfully "run" — no compiler check.
const NOT_RUNNABLE = ["HTML", "CSS"];

let runtimesCache = null;

async function getRuntimes() {
  if (runtimesCache) return runtimesCache;
  const res = await fetch(`${PISTON_BASE}/runtimes`);
  runtimesCache = await res.json();
  return runtimesCache;
}

// filename Piston needs per language so it compiles correctly
function fileNameFor(pistonLang) {
  const map = {
    c: "main.c", cpp: "main.cpp", java: "Main.java", python: "main.py",
    javascript: "main.js", php: "main.php", kotlin: "main.kt",
    swift: "main.swift", dart: "main.dart", csharp: "main.cs",
    go: "main.go", rust: "main.rs", sqlite3: "main.sql"
  };
  return map[pistonLang] || "main.txt";
}

// Returns { runnable, ok, output, error }
export async function testRunCode(ourLanguage, code) {
  if (NOT_RUNNABLE.includes(ourLanguage)) {
    return { runnable: false };
  }

  const pistonLang = LANGUAGE_MAP[ourLanguage];
  if (!pistonLang) return { runnable: false };

  const runtimes = await getRuntimes();
  const match = runtimes.find(r => r.language === pistonLang || (r.aliases || []).includes(pistonLang));
  if (!match) return { runnable: false };

  const res = await fetch(`${PISTON_BASE}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: match.language,
      version: match.version,
      files: [{ name: fileNameFor(pistonLang), content: code }]
    })
  });

  if (!res.ok) {
    return { runnable: true, ok: false, output: "", error: "Test-run service abhi available nahi hai, thodi der me try karo." };
  }

  const data = await res.json();
  const compileErr = data.compile && data.compile.stderr ? data.compile.stderr.trim() : "";
  const runErr = data.run && data.run.stderr ? data.run.stderr.trim() : "";
  const output = data.run && data.run.stdout ? data.run.stdout.trim() : "";

  if (compileErr) {
    return { runnable: true, ok: false, output, error: compileErr };
  }
  // A non-zero exit with stderr usually means a real bug; stdin-dependent
  // programs may legitimately show stderr-free non-zero exits, so we only
  // flag it as an error when stderr actually has content.
  if (runErr) {
    return { runnable: true, ok: false, output, error: runErr };
  }
  return { runnable: true, ok: true, output, error: "" };
}
