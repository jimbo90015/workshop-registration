(function (root) {
  const BUSINESS_TIME_ZONE = "Europe/London";

  function textValue(value) {
    if (Array.isArray(value)) return value.map((item) => item.text || "").join("");
    return value || "";
  }

  function londonDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: BUSINESS_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  }

  function publicWorkshops(records, now = Date.now()) {
    const today = londonDate(now);
    return records
      .filter((record) => {
        const fields = record.fields || {};
        const date = londonDate(fields["日期"]);
        return fields["場次狀態"] === "開放報名"
          && Boolean(date)
          && (date >= today || fields["允許過期補登"] === true);
      })
      .map((record) => ({
        id: record.record_id,
        name: textValue(record.fields["場次名稱"]),
        date: record.fields["日期"],
        startTime: textValue(record.fields["開始時間"]),
        location: textValue(record.fields["地點"]),
        allowPastRegistration: record.fields["允許過期補登"] === true,
      }));
  }

  function linkedRecordId(value) {
    if (!value) return "";
    if (!Array.isArray(value)) {
      return value.link_record_ids?.[0]
        || value.linkRecordIds?.[0]
        || value.record_id
        || value.recordId
        || "";
    }
    if (!value.length) return "";
    const link = value[0];
    return link.record_id
      || link.recordId
      || link.record_ids?.[0]
      || link.recordIds?.[0]
      || "";
  }

  function publicTicketPlans(records, now = Date.now()) {
    return records
      .filter((record) => {
        const fields = record.fields || {};
        const startsAt = Number(fields["販售開始"] || 0);
        const endsAt = Number(fields["販售結束"] || 0);
        return fields["狀態"] === "開放販售"
          && (!startsAt || startsAt <= now)
          && (!endsAt || endsAt >= now);
      })
      .map((record) => ({
        id: record.record_id,
        workshopId: linkedRecordId(record.fields["工作坊場次"]),
        name: textValue(record.fields["票價方案"]),
        ticketType: textValue(record.fields["票種"]),
        unitPrice: record.fields["單價"] == null || record.fields["單價"] === ""
          ? Number.NaN
          : Number(record.fields["單價"]),
        currency: textValue(record.fields["幣別"]),
        minSeats: Math.max(1, Math.floor(Number(record.fields["每單最少席位"] || 1))),
        maxSeats: Math.max(1, Math.floor(Number(record.fields["每單最多席位"] || 1))),
      }))
      .map((plan) => ({ ...plan, maxSeats: Math.max(plan.minSeats, plan.maxSeats) }))
      .filter((plan) => plan.workshopId && plan.ticketType && Number.isFinite(plan.unitPrice));
  }

  function isSeatCountAllowed(plan, seatCount) {
    return Number.isInteger(seatCount)
      && seatCount >= plan.minSeats
      && seatCount <= plan.maxSeats;
  }

  function workshopDisplay(workshop) {
    const date = londonDate(workshop.date).replaceAll("-", "/");
    return [workshop.name, date, workshop.startTime, workshop.location].filter(Boolean).join(" · ");
  }

  const api = {
    publicWorkshops,
    publicTicketPlans,
    isSeatCountAllowed,
    workshopDisplay,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.WorkshopCatalog = api;
})(typeof window === "undefined" ? globalThis : window);
