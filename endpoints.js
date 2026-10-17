// 所有後端網址集中在這裡，全部由 Cloudflare Worker（jimbo90015/breakshell-workflows）提供；
// 換後端只改這個檔，頁面本身不用動。
(function (root) {
  const WORKER = "https://hooks.breakshell.com";

  const ENDPOINTS = {
    catalog: `${WORKER}/workshop-catalog`,
    registration: `${WORKER}/workshop-registration`,
    attendee: `${WORKER}/workshop-attendee`,
    bookingManage: `${WORKER}/workshop-booking-manage`,
    feedback: `${WORKER}/workshop-feedback`,
    discordClaimStart: `${WORKER}/discord-claim-start`,
  };
  if (typeof module !== "undefined") module.exports = ENDPOINTS;
  root.ENDPOINTS = ENDPOINTS;
})(typeof window === "undefined" ? globalThis : window);
