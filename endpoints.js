// 所有後端網址集中在這裡。n8n 正逐個搬到 Cloudflare Worker（jimbo90015/breakshell-workflows），
// 某個端點搬好、驗證過，就把它改指 WORKER；頁面本身不用動。
(function (root) {
  const WORKER = "https://hooks.breakshell.com";
  const N8N = "https://darrenaitool.zeabur.app/webhook";

  const ENDPOINTS = {
    catalog: `${WORKER}/workshop-catalog`,
    registration: `${N8N}/workshop-registration`,
    attendee: `${N8N}/workshop-attendee`,
    bookingManage: `${N8N}/workshop-booking-manage`,
    feedback: `${WORKER}/workshop-feedback`,
    discordClaimStart: `${WORKER}/discord-claim-start`,
  };
  if (typeof module !== "undefined") module.exports = ENDPOINTS;
  root.ENDPOINTS = ENDPOINTS;
})(typeof window === "undefined" ? globalThis : window);
