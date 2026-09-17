const url = process.env.SITE_URL || "";
if (
  !url.startsWith("https://") ||
  /example|localhost/.test(url) ||
  !process.env.ICP_NUMBER ||
  process.env.ICP_NUMBER.includes("REPLACE")
) {
  console.error(
    "Production configuration incomplete: set real SITE_URL and ICP_NUMBER.",
  );
  process.exit(1);
}
console.log("Production site configuration is set.");
