(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GroupRegistration = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function organizerOccupiesSeat(seatCount, organizerAttends) {
    return Number(seatCount) <= 1 || organizerAttends !== false;
  }

  function requiredCompanionCount(seatCount, organizerAttends) {
    const seats = Math.max(1, Number(seatCount) || 1);
    return seats - (organizerOccupiesSeat(seats, organizerAttends) ? 1 : 0);
  }

  function validateCompanions({
    seatCount,
    organizerAttends,
    organizerEmail,
    companions,
  }) {
    const expected = requiredCompanionCount(seatCount, organizerAttends);
    const entries = Array.isArray(companions) ? companions : [];
    if (entries.length !== expected) {
      return { ok: false, code: "ATTENDEE_COUNT_MISMATCH", expected };
    }

    const organizer = normalizeEmail(organizerEmail);
    const seen = new Set(organizer ? [organizer] : []);
    for (const companion of entries) {
      const name = String(companion?.name || "").trim();
      const email = normalizeEmail(companion?.email);
      if (!name || !email) {
        return { ok: false, code: "ATTENDEE_DETAILS_REQUIRED", expected };
      }
      if (seen.has(email)) {
        return { ok: false, code: "DUPLICATE_ATTENDEE_EMAIL", expected };
      }
      seen.add(email);
    }
    return { ok: true, expected };
  }

  function fragmentToken(hash, key) {
    const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
    return params.get(key) || "";
  }

  return {
    fragmentToken,
    normalizeEmail,
    organizerOccupiesSeat,
    requiredCompanionCount,
    validateCompanions,
  };
});
