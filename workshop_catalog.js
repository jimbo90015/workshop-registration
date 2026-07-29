(function (root) {
  function textValue(value) {
    if (Array.isArray(value)) return value.map((item) => item.text || "").join("");
    return value || "";
  }

  function publicWorkshops(records) {
    return records
      .filter((record) => record.fields["場次狀態"] === "開放報名")
      .map((record) => ({
        id: record.record_id,
        name: textValue(record.fields["場次名稱"]),
        date: record.fields["日期"],
        startTime: textValue(record.fields["開始時間"]),
        location: textValue(record.fields["地點"]),
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
        maxSeats: Math.max(1, Number(record.fields["每單最多席位"] || 1)),
      }))
      .filter((plan) => plan.workshopId && Number.isFinite(plan.unitPrice));
  }

  function workshopDisplay(workshop) {
    const date = workshop.date ? new Date(workshop.date).toISOString().slice(0, 10).replaceAll("-", "/") : "";
    return [workshop.name, date, workshop.startTime, workshop.location].filter(Boolean).join(" · ");
  }

  root.WorkshopCatalog = {
    publicWorkshops,
    publicTicketPlans,
    workshopDisplay,
  };
})(window);
