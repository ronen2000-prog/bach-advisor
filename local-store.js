// מחליף את backend/db.py: אותה סמנטיקה לכל פונקציה, אך עם התמדה ב-IndexedDB
// (בדפדפן) או backend מוזרק (בבדיקות Node) במקום SQLite.
(function (global) {
  "use strict";

  var DB_NAME = "bach-advisor";
  var STORE_NAME = "state";
  var RECORD_KEY = "db";

  function emptyState() {
    return {
      version: 1,
      nextPatientId: 1,
      nextSessionId: 1,
      patients: [],
      sessions: [],
    };
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -- backend הניתן להזרקה (לצורך בדיקות Node, ללא IndexedDB) --------------
  var injectedBackend = null;

  function setStorageBackend(backend) {
    injectedBackend = backend;
  }

  // -- backend IndexedDB אמיתי (בדפדפן) --------------------------------------
  function openIndexedDb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB אינו זמין בסביבה זו"));
        return;
      }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function indexedDbBackend() {
    return {
      load: function () {
        return openIndexedDb().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE_NAME, "readonly");
            var store = tx.objectStore(STORE_NAME);
            var req = store.get(RECORD_KEY);
            req.onsuccess = function () { resolve(req.result || null); };
            req.onerror = function () { reject(req.error); };
          });
        });
      },
      save: function (state) {
        return openIndexedDb().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE_NAME, "readwrite");
            var store = tx.objectStore(STORE_NAME);
            store.put(state, RECORD_KEY);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
          });
        });
      },
    };
  }

  function getBackend() {
    if (injectedBackend) return injectedBackend;
    return indexedDbBackend();
  }

  // -- מצב בזיכרון, נטען פעם אחת בעצלנות --------------------------------------
  var stateCache = null;
  var loadPromise = null;

  function ensureLoaded() {
    if (stateCache) return Promise.resolve(stateCache);
    if (loadPromise) return loadPromise;
    loadPromise = getBackend().load().then(function (loaded) {
      stateCache = loaded && typeof loaded === "object" ? loaded : emptyState();
      if (typeof stateCache.nextPatientId !== "number") stateCache.nextPatientId = 1;
      if (typeof stateCache.nextSessionId !== "number") stateCache.nextSessionId = 1;
      if (!Array.isArray(stateCache.patients)) stateCache.patients = [];
      if (!Array.isArray(stateCache.sessions)) stateCache.sessions = [];
      return stateCache;
    });
    return loadPromise;
  }

  function persist() {
    return getBackend().save(stateCache);
  }

  // תאריך-שעה UTC בפורמט זהה ל-datetime.now(timezone.utc).isoformat() של
  // פייתון, למשל "2026-09-21T17:52:31.727129+00:00". ל-JS יש דיוק של
  // מילישניות בלבד (Date.now()), ולכן שלוש הספרות האחרונות של המיקרו-שניות
  // מרופדות באפסים - סטייה מכוונת ומתועדת (ר' דוח המסירה).
  function now_iso() {
    var d = new Date();
    var pad = function (n, len) { return String(n).padStart(len, "0"); };
    var year = d.getUTCFullYear();
    var month = pad(d.getUTCMonth() + 1, 2);
    var day = pad(d.getUTCDate(), 2);
    var hours = pad(d.getUTCHours(), 2);
    var minutes = pad(d.getUTCMinutes(), 2);
    var seconds = pad(d.getUTCSeconds(), 2);
    var millis = pad(d.getUTCMilliseconds(), 3);
    var micros = millis + "000";
    return year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "." + micros + "+00:00";
  }

  function sessionPublicShape(s) {
    return {
      id: s.id,
      patient_id: s.patient_id,
      created_at: s.created_at,
      initial_description: s.initial_description,
      transcript: deepCopy(s.transcript),
      status: s.status,
      proposed_remedies: s.proposed_remedies == null ? null : deepCopy(s.proposed_remedies),
      general_notes: s.general_notes == null ? null : s.general_notes,
      usage_instructions: s.usage_instructions == null ? null : s.usage_instructions,
      final_remedies: s.final_remedies == null ? null : deepCopy(s.final_remedies),
      practitioner_notes: s.practitioner_notes == null ? null : s.practitioner_notes,
    };
  }

  function patientPublicShape(p) {
    return { id: p.id, name: p.name, created_at: p.created_at };
  }

  // -- API (הכול async, כי IndexedDB אסינכרוני) -------------------------------

  function create_patient(name) {
    return ensureLoaded().then(function (state) {
      var id = state.nextPatientId++;
      var patient = { id: id, name: name, created_at: now_iso() };
      state.patients.push(patient);
      return persist().then(function () { return id; });
    });
  }

  // ORDER BY name COLLATE NOCASE: השוואה שלא תלויה ברישיות (כמו SQLite NOCASE,
  // שמשפיע רק על אותיות A-Z; לעברית אין רישיות ולכן לא מושפעת). Array.prototype.sort
  // ב-V8/Node הוא יציב, וקלט ה-state.patients שמור בסדר יצירה (מפתח id עולה),
  // כך ששוויונות בשם נשארים בסדר היצירה - כמו ההתנהגות בפועל של SQLite כאן.
  function nocaseKey(s) {
    return s.replace(/[A-Z]/g, function (c) { return c.toLowerCase(); });
  }

  function list_patients() {
    return ensureLoaded().then(function (state) {
      var arr = state.patients.slice();
      arr.sort(function (a, b) {
        var ka = nocaseKey(a.name), kb = nocaseKey(b.name);
        if (ka < kb) return -1;
        if (ka > kb) return 1;
        return 0;
      });
      return arr.map(patientPublicShape);
    });
  }

  function get_patient(patientId) {
    return ensureLoaded().then(function (state) {
      var p = state.patients.find(function (x) { return x.id === patientId; });
      return p ? patientPublicShape(p) : null;
    });
  }

  function rename_patient(patientId, name) {
    return ensureLoaded().then(function (state) {
      var p = state.patients.find(function (x) { return x.id === patientId; });
      if (p) p.name = name;
      return persist();
    });
  }

  function list_sessions_for_patient(patientId) {
    return ensureLoaded().then(function (state) {
      var arr = state.sessions.filter(function (s) { return s.patient_id === patientId; });
      // ORDER BY created_at DESC - מחרוזות ISO-8601 ניתנות להשוואה לקסיקוגרפית.
      arr.sort(function (a, b) {
        if (a.created_at < b.created_at) return 1;
        if (a.created_at > b.created_at) return -1;
        return 0;
      });
      return arr.map(sessionPublicShape);
    });
  }

  function get_session(sessionId) {
    return ensureLoaded().then(function (state) {
      var s = state.sessions.find(function (x) { return x.id === sessionId; });
      return s ? sessionPublicShape(s) : null;
    });
  }

  function create_session(patientId, initialDescription, createdAt) {
    return ensureLoaded().then(function (state) {
      var id = state.nextSessionId++;
      var session = {
        id: id,
        patient_id: patientId,
        created_at: createdAt || now_iso(),
        initial_description: initialDescription,
        transcript: [],
        status: "in_progress",
        proposed_remedies: null,
        general_notes: null,
        usage_instructions: null,
        final_remedies: null,
        practitioner_notes: null,
      };
      state.sessions.push(session);
      return persist().then(function () { return id; });
    });
  }

  function update_transcript(sessionId, transcript) {
    return ensureLoaded().then(function (state) {
      var s = state.sessions.find(function (x) { return x.id === sessionId; });
      if (s) s.transcript = deepCopy(transcript);
      return persist();
    });
  }

  function mark_in_progress(sessionId) {
    return ensureLoaded().then(function (state) {
      var s = state.sessions.find(function (x) { return x.id === sessionId; });
      if (s) s.status = "in_progress";
      return persist();
    });
  }

  function set_proposal(sessionId, remedies, generalNotes, usageInstructions) {
    return ensureLoaded().then(function (state) {
      var s = state.sessions.find(function (x) { return x.id === sessionId; });
      if (s) {
        s.status = "proposed";
        s.proposed_remedies = deepCopy(remedies);
        s.general_notes = generalNotes;
        s.usage_instructions = usageInstructions;
      }
      return persist();
    });
  }

  function save_final(sessionId, finalRemedies, practitionerNotes, usageInstructions) {
    return ensureLoaded().then(function (state) {
      var s = state.sessions.find(function (x) { return x.id === sessionId; });
      if (s) {
        s.status = "saved";
        s.final_remedies = deepCopy(finalRemedies);
        s.practitioner_notes = practitionerNotes;
        if (usageInstructions !== null && usageInstructions !== undefined) {
          s.usage_instructions = usageInstructions;
        }
      }
      return persist();
    });
  }

  function delete_session(sessionId) {
    return ensureLoaded().then(function (state) {
      state.sessions = state.sessions.filter(function (x) { return x.id !== sessionId; });
      return persist();
    });
  }

  function delete_patient(patientId) {
    return ensureLoaded().then(function (state) {
      state.sessions = state.sessions.filter(function (x) { return x.patient_id !== patientId; });
      state.patients = state.patients.filter(function (x) { return x.id !== patientId; });
      return persist();
    });
  }

  // -- ייצוא/ייבוא + הרשאת התמדה ----------------------------------------------

  function exportData() {
    return ensureLoaded().then(function (state) { return deepCopy(state); });
  }

  function importData(obj) {
    // תמיד מחזיר Promise (גם לשגיאות ולידציה) כדי שקוד קורא יוכל תמיד להשתמש
    // ב-.catch() באופן אחיד, בלי חשש מ-throw סינכרוני שיישמט מהשרשרת.
    return Promise.resolve().then(function () {
      if (!obj || typeof obj !== "object") {
        throw new Error("קובץ הגיבוי אינו תקין");
      }
      if (obj.version !== 1) {
        throw new Error("גרסת קובץ הגיבוי אינה נתמכת");
      }
      if (!Array.isArray(obj.patients) || !Array.isArray(obj.sessions)) {
        throw new Error("קובץ הגיבוי אינו תקין");
      }
      var next = {
        version: 1,
        nextPatientId: typeof obj.nextPatientId === "number" ? obj.nextPatientId : 1,
        nextSessionId: typeof obj.nextSessionId === "number" ? obj.nextSessionId : 1,
        patients: deepCopy(obj.patients),
        sessions: deepCopy(obj.sessions),
      };
      return ensureLoaded().then(function () {
        stateCache = next;
        return persist();
      });
    });
  }

  function requestPersistence() {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      return navigator.storage.persist().catch(function () { return false; });
    }
    return Promise.resolve(false);
  }

  var api = {
    now_iso: now_iso,
    create_patient: create_patient,
    list_patients: list_patients,
    get_patient: get_patient,
    rename_patient: rename_patient,
    list_sessions_for_patient: list_sessions_for_patient,
    get_session: get_session,
    create_session: create_session,
    update_transcript: update_transcript,
    mark_in_progress: mark_in_progress,
    set_proposal: set_proposal,
    save_final: save_final,
    delete_session: delete_session,
    delete_patient: delete_patient,
    exportData: exportData,
    importData: importData,
    requestPersistence: requestPersistence,
    setStorageBackend: setStorageBackend,
  };

  var ns = global.BachApp = global.BachApp || {};
  ns.store = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
