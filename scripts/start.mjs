// Backward-compatible local preview entry. Production uses split containers.
process.argv.push('--production');
await import('./dev.mjs');
