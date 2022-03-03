export function pass() {
  console.log(`PASS! (modernBrowser = ${!import.meta.env.LEGACY})`);
}
