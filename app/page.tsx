
import Image from "next/image";
import Link from "next/link";
import fs from "fs";
import path from "path";
import FolderCard from "./components/FolderCard";

function colorFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 70% 55%)`;
}

export default async function Home() {
  const appDir = path.join(process.cwd(), "app");
  let folders: string[] = [];

  try {
    const entries = await fs.promises.readdir(appDir, { withFileTypes: true });
    folders = entries
      .filter((e) => e.isDirectory())
      .map((d) => d.name)
      .filter((name) => !name.startsWith(".") && !["components", "api", "styles", "public"].includes(name));
  } catch {
    folders = [];
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(1000px 600px at 10% 10%, #e6f7ff 0%, transparent 10%), radial-gradient(800px 500px at 90% 90%, #fff0f6 0%, transparent 12%), linear-gradient(135deg,#f8fafc,#fff)",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        padding: 24,
      }}
    >
      <main
        style={{
          width: "100%",
          maxWidth: 980,
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(6px)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(2,6,23,0.08)",
          padding: 28,
        }}
      >
        <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "linear-gradient(135deg,#111827,#1f2937)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            A
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20,color:"black", letterSpacing: "-0.02em" }}>App folders</h1>
            <p style={{ margin: 0, marginTop: 4, color: "#475569", fontSize: 13 }}>
              Buttons are created automatically for each folder in /app
            </p>
          </div>
        </header>

        <section style={{ marginTop: 8 }}>
          {folders.length === 0 ? (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                background: "linear-gradient(180deg,#fff,#f8fafc)",
                border: "1px solid rgba(15,23,42,0.04)",
                color: "#475569",
              }}
            >
              No folders found in app/
            </div>
          ) : (
            <nav style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
              {folders.map((name) => {
                const bg = colorFromName(name);
                return <FolderCard key={name} name={name} bg={bg} />;
              })}
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}