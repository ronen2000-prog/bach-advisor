// מחליף את backend/main.py: אותה טבלת נתיבים, אותה ולידציה, אותם קודי שגיאה
// והודעות detail בעברית, ואותה צורת תגובה JSON. פועל כולו מול mobile/local-store.js
// (Bach App.store) ו-mobile/advisor-engine.js (BachApp.engine) - אין קריאות רשת.
(function (global) {
  "use strict";

  var isNode = typeof module !== "undefined" && module.exports;

  var flowersMod = isNode ? require("./bach-flowers.js") : (global.BachApp && global.BachApp.flowers);
  var engineMod = isNode ? require("./advisor-engine.js") : (global.BachApp && global.BachApp.engine);
  var storeMod = isNode ? require("./local-store.js") : (global.BachApp && global.BachApp.store);

  // -- שגיאת HTTP פנימית, עם status ו-detail (הודעה בעברית) -------------------
  function ApiError(status, detail) {
    this.status = status;
    this.detail = detail;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function fail(status, detail) {
    throw new ApiError(status, detail);
  }

  function parseBody(options) {
    if (!options || options.body === undefined || options.body === null) return {};
    if (typeof options.body === "string") {
      if (options.body.trim() === "") return {};
      try {
        return JSON.parse(options.body);
      } catch (e) {
        fail(400, "גוף הבקשה אינו JSON תקין");
      }
    }
    if (typeof options.body === "object") return options.body;
    return {};
  }

  function strField(payload, key, def) {
    var v = payload ? payload[key] : undefined;
    if (v === undefined || v === null) return def !== undefined ? def : "";
    return String(v);
  }

  // -- פענוח created_at: זהה סמנטית ל-
  //    raw = raw[:-1] + "+00:00" אם מסתיים ב-"Z"; datetime.fromisoformat(raw);
  //    parsed.astimezone(timezone.utc).isoformat()
  // תאריך-שעה נאיבי (בלי offset) מתפרש כזמן מקומי של המערכת (כמו בפייתון),
  // וממיר ל-UTC לפי אזור הזמן של המכשיר/תהליך המריץ.
  function parseCreatedAtToUtcIso(rawInput) {
    var raw = rawInput;
    if (raw.endsWith("Z")) raw = raw.slice(0, -1) + "+00:00";

    var m = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?([+-]\d{2}:\d{2})?$/
    );
    if (!m) fail(400, "תאריך או שעה לא תקינים");

    var year = parseInt(m[1], 10);
    var month = parseInt(m[2], 10);
    var day = parseInt(m[3], 10);
    var hour = m[4] !== undefined ? parseInt(m[4], 10) : 0;
    var minute = m[5] !== undefined ? parseInt(m[5], 10) : 0;
    var second = m[6] !== undefined ? parseInt(m[6], 10) : 0;
    var fracStr = m[7] || "";
    var offsetStr = m[8] || null;

    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) {
      fail(400, "תאריך או שעה לא תקינים");
    }

    var microsecond = fracStr ? parseInt((fracStr + "000000").slice(0, 6), 10) : 0;

    var utcMs;
    if (offsetStr) {
      var sign = offsetStr[0] === "-" ? -1 : 1;
      var oh = parseInt(offsetStr.slice(1, 3), 10);
      var om = parseInt(offsetStr.slice(4, 6), 10);
      // Python דוחה offset שהוא 24 שעות ומעלה בערכו המוחלט (timedelta strictly < 24h).
      if (oh > 23 || om > 59) fail(400, "תאריך או שעה לא תקינים");
      var offsetMinutes = sign * (oh * 60 + om);
      utcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0) - offsetMinutes * 60000;
    } else {
      // נאיבי - מתפרש כזמן מקומי של המערכת, כמו astimezone() על datetime נאיבי בפייתון.
      var localDate = new Date(year, month - 1, day, hour, minute, second, 0);
      if (isNaN(localDate.getTime())) fail(400, "תאריך או שעה לא תקינים");
      utcMs = localDate.getTime();
    }

    var utcDate = new Date(utcMs);
    if (isNaN(utcDate.getTime())) fail(400, "תאריך או שעה לא תקינים");

    // ולידציית "גלישה" של תאריך לא חוקי (למשל 2024-02-30) - כמו ש-Python
    // fromisoformat דוחה, בעוד ש-Date של JS מנרמל בשקט. משווים מול הקלט לפני
    // המרת אזור הזמן (שקולה כי הזזה של שעות/דקות שלמות לא יכולה "לתקן" יום
    // לא חוקי בתוך אותו חודש/שנה שצוינו).
    var checkLocal = offsetStr
      ? new Date(Date.UTC(year, month - 1, day))
      : new Date(year, month - 1, day);
    var getY = offsetStr ? checkLocal.getUTCFullYear() : checkLocal.getFullYear();
    var getM = offsetStr ? checkLocal.getUTCMonth() : checkLocal.getMonth();
    var getD = offsetStr ? checkLocal.getUTCDate() : checkLocal.getDate();
    if (getY !== year || getM !== month - 1 || getD !== day) {
      fail(400, "תאריך או שעה לא תקינים");
    }

    var pad = function (n, len) { return String(n).padStart(len, "0"); };
    var out = pad(utcDate.getUTCFullYear(), 4) + "-" + pad(utcDate.getUTCMonth() + 1, 2) + "-" + pad(utcDate.getUTCDate(), 2) +
      "T" + pad(utcDate.getUTCHours(), 2) + ":" + pad(utcDate.getUTCMinutes(), 2) + ":" + pad(utcDate.getUTCSeconds(), 2);
    if (microsecond !== 0) {
      out += "." + pad(microsecond, 6);
    }
    out += "+00:00";
    return out;
  }

  function composeIntakeText(payload, symptoms) {
    var lines = [];
    var age = strField(payload, "age", "").trim();
    var treatmentGoal = strField(payload, "treatment_goal", "").trim();
    var duration = strField(payload, "duration", "").trim();
    var history = strField(payload, "history", "").trim();
    var riskNote = strField(payload, "risk_note", "").trim();

    if (age) lines.push("גיל: " + age);
    if (treatmentGoal) lines.push("מטרת הטיפול: " + treatmentGoal);
    lines.push("תיאור המצב הרגשי: " + symptoms);
    if (duration) lines.push("משך הזמן: " + duration);
    if (history) lines.push("רקע רלוונטי: " + history);
    if (riskNote) lines.push("הערת סיכון מיידי מהמטפל/ת: " + riskNote);
    return lines.join("\n");
  }

  function applyStep(sessionId, transcript, step) {
    if (step.type === "question") {
      var questionEntry = { type: "question", text: step.text };
      // שאלות מהשאלון המובנה נושאות question_id/options/multi; שאלות legacy
      // (אם קורה שהמנוע אי-פעם יחזיר כאלה) לא, וזה בסדר - advisor-engine.js
      // יודע להתמודד עם תמליל בלי השדות האלה (ר' _isLegacyTranscript), בדיוק
      // כמו main.py._apply_step.
      if (step.question_id !== undefined) questionEntry.question_id = step.question_id;
      if (step.options !== undefined) questionEntry.options = step.options;
      if (step.multi !== undefined) questionEntry.multi = step.multi;
      var withQuestion = transcript.concat([questionEntry]);
      return storeMod.update_transcript(sessionId, withQuestion).then(function () {
        return storeMod.mark_in_progress(sessionId);
      });
    }
    var names = step.remedies.map(function (r) { return r.name_he; }).join(", ");
    var proposalSummary = "הרכב מוצע: " + names + ".\n" + step.general_notes;
    var withProposal = transcript.concat([{ type: "proposal", text: proposalSummary }]);
    return storeMod.update_transcript(sessionId, withProposal).then(function () {
      return storeMod.set_proposal(sessionId, step.remedies, step.general_notes, step.usage_instructions);
    });
  }

  function otherSessions(patientId, excludeSessionId) {
    return storeMod.list_sessions_for_patient(patientId).then(function (sessions) {
      return sessions.filter(function (s) { return s.id !== excludeSessionId; });
    });
  }

  // -- מסלולים ------------------------------------------------------------

  function routeFlowers() {
    return Promise.resolve(flowersMod.ALL_REMEDIES);
  }

  function routeHealth() {
    return Promise.resolve({ app: "bach-advisor" });
  }

  function routeListPatients() {
    return storeMod.list_patients();
  }

  function routeCreatePatient(payload) {
    var name = strField(payload, "name", "").trim();
    if (!name) fail(400, "שם המטופל נדרש");
    return storeMod.create_patient(name).then(function (id) {
      return storeMod.get_patient(id);
    });
  }

  function routeGetPatientSessions(patientId) {
    return storeMod.get_patient(patientId).then(function (patient) {
      if (!patient) fail(404, "מטופל לא נמצא");
      return storeMod.list_sessions_for_patient(patientId);
    });
  }

  function routePatchPatient(patientId, payload) {
    return storeMod.get_patient(patientId).then(function (patient) {
      if (!patient) fail(404, "מטופל לא נמצא");
      var name = strField(payload, "name", "").trim();
      if (!name) fail(400, "שם המטופל נדרש");
      return storeMod.rename_patient(patientId, name).then(function () {
        return storeMod.get_patient(patientId);
      });
    });
  }

  function routeDeletePatient(patientId) {
    return storeMod.get_patient(patientId).then(function (patient) {
      if (!patient) fail(404, "מטופל לא נמצא");
      return storeMod.delete_patient(patientId).then(function () { return { ok: true }; });
    });
  }

  function routeCreateSession(payload) {
    var patientId = payload ? payload.patient_id : undefined;
    return storeMod.get_patient(patientId).then(function (patient) {
      if (!patient) fail(404, "מטופל לא נמצא");

      var symptoms = strField(payload, "symptoms", "").trim();
      if (!symptoms) fail(400, "יש להזין תיאור של מצבו הרגשי של המטופל");

      var createdAt = null;
      if (payload.created_at !== undefined && payload.created_at !== null) {
        createdAt = parseCreatedAtToUtcIso(String(payload.created_at));
      }

      var description = composeIntakeText(payload, symptoms);
      return storeMod.create_session(patientId, description, createdAt).then(function (sessionId) {
        return otherSessions(patientId, sessionId).then(function (pastSessions) {
          var historyContext = engineMod.build_history_context(pastSessions);
          var step = engineMod.next_step(description, historyContext, []);
          return applyStep(sessionId, [], step).then(function () {
            return storeMod.get_session(sessionId);
          });
        });
      });
    });
  }

  function routeAnswer(sessionId, payload) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      if (session.status !== "in_progress") fail(400, "המפגש כבר לא בתשאול פעיל");

      var answer = strField(payload, "answer", "").trim();
      if (!answer) fail(400, "יש להזין תשובה");

      var transcript = session.transcript.concat([{ type: "answer", text: answer }]);

      return otherSessions(session.patient_id, sessionId).then(function (pastSessions) {
        var historyContext = engineMod.build_history_context(pastSessions);
        var step = engineMod.next_step(session.initial_description, historyContext, transcript);
        return applyStep(sessionId, transcript, step).then(function () {
          return storeMod.get_session(sessionId);
        });
      });
    });
  }

  function routeChallenge(sessionId, payload) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      if (session.status !== "proposed") fail(400, "אין הצעת הרכב פעילה כדי לערער עליה");

      var message = strField(payload, "message", "").trim();
      if (!message) fail(400, "יש להזין הסתייגות או שאלה");

      var transcript = session.transcript.concat([
        { type: "answer", text: "הערת המטפל/ת על ההרכב שהוצע: " + message },
      ]);

      var explanation = engineMod.explain_if_asked(message, session.proposed_remedies || []);
      if (explanation) {
        var withExplanation = transcript.concat([{ type: "explanation", text: explanation }]);
        return storeMod.update_transcript(sessionId, withExplanation).then(function () {
          return storeMod.get_session(sessionId);
        });
      }

      if (!engineMod.has_signal(message)) {
        var note = "לא זוהו במאגר מילות המפתח ביטויים שתואמים להערה שהוספתם, ולכן ההרכב לא השתנה בעקבותיה. " +
          "אפשר לנסח מחדש בעברית פשוטה יותר, או לציין את הביטוי המדויק שחשוב שייכלל במאגר.";
        var withNote = transcript.concat([{ type: "explanation", text: note }]);
        return storeMod.update_transcript(sessionId, withNote).then(function () {
          return storeMod.get_session(sessionId);
        });
      }

      return otherSessions(session.patient_id, sessionId).then(function (pastSessions) {
        var historyContext = engineMod.build_history_context(pastSessions);
        var step = engineMod.next_step(session.initial_description, historyContext, transcript);
        return applyStep(sessionId, transcript, step).then(function () {
          return storeMod.get_session(sessionId);
        });
      });
    });
  }

  function routeSave(sessionId, payload) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      if (session.status !== "proposed") fail(400, "אין הצעת הרכב ממתינה לשמירה עבור מפגש זה");
      var finalRemedies = payload ? payload.final_remedies : undefined;
      if (!finalRemedies || !finalRemedies.length) fail(400, "יש לבחור לפחות תמצית אחת");

      var practitionerNotes = strField(payload, "practitioner_notes", "").trim();
      var usageInstructions = payload.usage_instructions !== undefined ? payload.usage_instructions : null;

      return storeMod.save_final(sessionId, finalRemedies, practitionerNotes, usageInstructions).then(function () {
        return storeMod.get_session(sessionId);
      });
    });
  }

  function routePutFinal(sessionId, payload) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      if (session.status !== "saved") fail(400, "ניתן לערוך רק מפגש שנשמר");
      var finalRemedies = payload ? payload.final_remedies : undefined;
      if (!finalRemedies || !finalRemedies.length) fail(400, "יש לבחור לפחות תמצית אחת");

      var practitionerNotes = strField(payload, "practitioner_notes", "").trim();
      var usageInstructions = payload.usage_instructions !== undefined ? payload.usage_instructions : null;

      return storeMod.save_final(sessionId, finalRemedies, practitionerNotes, usageInstructions).then(function () {
        return storeMod.get_session(sessionId);
      });
    });
  }

  function routeGetSession(sessionId) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      return session;
    });
  }

  function routeDeleteSession(sessionId) {
    return storeMod.get_session(sessionId).then(function (session) {
      if (!session) fail(404, "מפגש לא נמצא");
      return storeMod.delete_session(sessionId).then(function () { return { ok: true }; });
    });
  }

  // -- ניתוב --------------------------------------------------------------

  var ROUTES = [
    { method: "GET", re: /^\/api\/flowers\/?$/, handler: function () { return routeFlowers(); } },
    { method: "GET", re: /^\/api\/health\/?$/, handler: function () { return routeHealth(); } },
    { method: "GET", re: /^\/api\/patients\/?$/, handler: function () { return routeListPatients(); } },
    { method: "POST", re: /^\/api\/patients\/?$/, handler: function (m, payload) { return routeCreatePatient(payload); } },
    { method: "GET", re: /^\/api\/patients\/(\d+)\/sessions\/?$/, handler: function (m) { return routeGetPatientSessions(parseInt(m[1], 10)); } },
    { method: "PATCH", re: /^\/api\/patients\/(\d+)\/?$/, handler: function (m, payload) { return routePatchPatient(parseInt(m[1], 10), payload); } },
    { method: "DELETE", re: /^\/api\/patients\/(\d+)\/?$/, handler: function (m) { return routeDeletePatient(parseInt(m[1], 10)); } },
    { method: "POST", re: /^\/api\/sessions\/?$/, handler: function (m, payload) { return routeCreateSession(payload); } },
    { method: "POST", re: /^\/api\/sessions\/(\d+)\/answer\/?$/, handler: function (m, payload) { return routeAnswer(parseInt(m[1], 10), payload); } },
    { method: "POST", re: /^\/api\/sessions\/(\d+)\/challenge\/?$/, handler: function (m, payload) { return routeChallenge(parseInt(m[1], 10), payload); } },
    { method: "POST", re: /^\/api\/sessions\/(\d+)\/save\/?$/, handler: function (m, payload) { return routeSave(parseInt(m[1], 10), payload); } },
    { method: "PUT", re: /^\/api\/sessions\/(\d+)\/final\/?$/, handler: function (m, payload) { return routePutFinal(parseInt(m[1], 10), payload); } },
    { method: "GET", re: /^\/api\/sessions\/(\d+)\/?$/, handler: function (m) { return routeGetSession(parseInt(m[1], 10)); } },
    { method: "DELETE", re: /^\/api\/sessions\/(\d+)\/?$/, handler: function (m) { return routeDeleteSession(parseInt(m[1], 10)); } },
  ];

  function localApi(path, options) {
    var method = (options && options.method ? options.method : "GET").toUpperCase();
    var cleanPath = path.split("?")[0];

    var payload;
    try {
      payload = parseBody(options);
    } catch (e) {
      return Promise.reject(new Error(e.detail !== undefined ? e.detail : e.message));
    }

    for (var i = 0; i < ROUTES.length; i++) {
      var route = ROUTES[i];
      if (route.method !== method) continue;
      var m = cleanPath.match(route.re);
      if (m) {
        return Promise.resolve()
          .then(function () { return route.handler(m, payload); })
          .catch(function (err) {
            if (err instanceof ApiError) throw new Error(err.detail);
            throw err;
          });
      }
    }

    return Promise.reject(new Error("Not Found"));
  }

  var ns = global.BachApp = global.BachApp || {};
  ns.api = localApi;

  if (typeof window !== "undefined") {
    window.LOCAL_API = localApi;
    window.BachLocalStore = {
      exportData: storeMod.exportData,
      importData: storeMod.importData,
      requestPersistence: storeMod.requestPersistence,
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = localApi;
    module.exports.localApi = localApi;
    module.exports.ApiError = ApiError;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
