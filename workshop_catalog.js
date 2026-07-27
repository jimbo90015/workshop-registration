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

  function workshopDisplay(workshop) {
    const date = workshop.date ? new Date(workshop.date).toISOString().slice(0, 10).replaceAll("-", "/") : "";
    return [workshop.name, date, workshop.startTime, workshop.location].filter(Boolean).join(" · ");
  }

  root.WorkshopCatalog = { publicWorkshops, workshopDisplay };
})(window);
