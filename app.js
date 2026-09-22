const state = {
  patients: [],
  selectedPatientId: null,
  flowers: [],
  currentSession: null,
};

const ICONS = {
  leaf: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"></path><path d="M5 19l8-8"></path></svg>',
  plus: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
  printer: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"></path><rect x="3" y="9" width="18" height="8" rx="2"></rect><path d="M6 14h12v7H6z"></path></svg>',
};

const mainEl = document.getElementById("main");
const patientListEl = document.getElementById("patientList");
const printAreaEl = document.getElementById("printArea");

async function api(path, options) {
  if (window.LOCAL_API) return window.LOCAL_API(path, options);
  let res;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (networkErr) {
    throw new Error("לא ניתן להתחבר לשרת המקומי. ודאו שהתוכנה עדיין רצה, ואז רעננו את הדף.");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `שגיאה: ${res.status}`);
  }
  return res.json();
}

function showToast(message, kind = "info") {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${kind}`;
  toast.setAttribute("role", "status");
  const text = document.createElement("span");
  text.textContent = message;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "סגירה");
  closeBtn.textContent = "×";
  closeBtn.onclick = () => toast.remove();
  toast.appendChild(text);
  toast.appendChild(closeBtn);
  region.appendChild(toast);
  const timeout = kind === "error" ? 7000 : 4000;
  setTimeout(() => toast.remove(), timeout);
}

function setButtonBusy(btn, busy, busyText) {
  if (busy) {
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHtml(busyText || "")}`;
  } else {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = btn.dataset.label || btn.textContent;
  }
}

function showFieldError(input, message) {
  clearFieldError(input);
  input.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
  const errId = input.id + "Error";
  input.setAttribute("aria-describedby", errId);
  const err = document.createElement("span");
  err.className = "field-error";
  err.id = errId;
  err.textContent = message;
  input.insertAdjacentElement("afterend", err);
  input.addEventListener("input", function handler() {
    clearFieldError(input);
    input.removeEventListener("input", handler);
  });
  input.focus();
}

function clearFieldError(input) {
  input.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  const errId = input.id + "Error";
  const existing = document.getElementById(errId);
  if (existing) existing.remove();
}

function emptyStateMarkup() {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${ICONS.leaf}</div>
      <p>בחרו מטופל מהרשימה, או צרו מטופל חדש כדי להתחיל.</p>
    </div>
  `;
}

function showFatalError(message) {
  mainEl.innerHTML = `
    <div class="card">
      <h2 class="section-title">משהו השתבש</h2>
      <p>${escapeHtml(message)}</p>
      <button class="btn btn-primary" id="retryBtn" type="button">רעננו את הדף</button>
    </div>
  `;
  document.getElementById("retryBtn").onclick = () => window.location.reload();
}

async function loadPatients() {
  state.patients = await api("/api/patients");
  renderPatientList();
}

async function loadFlowers() {
  state.flowers = await api("/api/flowers");
}

function renderPatientList() {
  patientListEl.innerHTML = "";
  state.patients.forEach((p) => {
    const li = document.createElement("li");
    if (p.id === state.selectedPatientId) li.classList.add("active");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "patient-item";
    btn.textContent = p.name;
    if (p.id === state.selectedPatientId) btn.setAttribute("aria-current", "page");
    btn.onclick = () => selectPatient(p.id);
    li.appendChild(btn);
    patientListEl.appendChild(li);
  });
}

document.getElementById("newPatientBtn").onclick = () => renderNewPatientForm();

function renderNewPatientForm() {
  mainEl.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h2 class="section-title">מטופל חדש</h2>
    <div class="field">
      <label for="newPatientName">שם המטופל/ת *</label>
      <input type="text" id="newPatientName" placeholder="שם המטופל">
    </div>
    <div class="actions-row">
      <button class="btn btn-primary" id="createPatientBtn" type="button">צרו מטופל</button>
      <button class="btn" id="cancelNewPatientBtn" type="button">ביטול</button>
    </div>
  `;
  mainEl.appendChild(card);
  const nameInput = document.getElementById("newPatientName");
  nameInput.focus();

  document.getElementById("cancelNewPatientBtn").onclick = () => {
    mainEl.innerHTML = emptyStateMarkup();
  };

  const createPatientBtn = document.getElementById("createPatientBtn");

  const submit = async () => {
    if (createPatientBtn.disabled) return;
    const name = nameInput.value.trim();
    if (!name) {
      showFieldError(nameInput, "יש להזין שם");
      return;
    }
    setButtonBusy(createPatientBtn, true, "יוצר...");
    try {
      const patient = await api("/api/patients", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadPatients();
      showToast("המטופל/ת נוסף/ה", "success");
      selectPatient(patient.id);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setButtonBusy(createPatientBtn, false);
    }
  };

  createPatientBtn.onclick = submit;
  nameInput.onkeydown = (e) => {
    if (e.key === "Enter") submit();
  };
}

async function selectPatient(patientId) {
  state.selectedPatientId = patientId;
  renderPatientList();
  const patient = state.patients.find((p) => p.id === patientId);
  try {
    const sessions = await api(`/api/patients/${patientId}/sessions`);
    renderPatientHome(patient, sessions);
  } catch (err) {
    showFatalError(err.message);
  }
}

function renderPatientHome(patient, sessions) {
  mainEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "page-header";
  header.innerHTML = `
    <div class="page-header-text">
      <span class="page-eyebrow">${sessions.length} מפגשים</span>
      <h1 class="page-title">${escapeHtml(patient.name)}</h1>
    </div>
  `;
  const newBtn = document.createElement("button");
  newBtn.className = "btn btn-primary";
  newBtn.type = "button";
  newBtn.innerHTML = `${ICONS.plus}מפגש חדש`;
  newBtn.onclick = () => renderNewSessionForm(patient, sessions);

  const editNameBtn = document.createElement("button");
  editNameBtn.className = "btn";
  editNameBtn.type = "button";
  editNameBtn.textContent = "עריכת שם";
  editNameBtn.onclick = async () => {
    const typed = prompt("שם המטופל/ת:", patient.name);
    if (typed === null) return;
    const name = typed.trim();
    if (!name || name === patient.name) return;
    try {
      await api(`/api/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await loadPatients();
      showToast("השם עודכן", "success");
      selectPatient(patient.id);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deletePatientBtn = document.createElement("button");
  deletePatientBtn.className = "btn btn-remove";
  deletePatientBtn.type = "button";
  deletePatientBtn.textContent = "מחיקת מטופל";
  deletePatientBtn.onclick = async () => {
    const typed = prompt(
      `מחיקת המטופל/ת "${patient.name}" תמחק לצמיתות גם את כל ${sessions.length} המפגשים שלו/ה. לא ניתן לשחזר. להמשך, הקלידו את שם המטופל/ת:`
    );
    if (typed === null) return;
    if (typed.trim() !== patient.name) {
      showToast("השם לא תואם — המחיקה בוטלה.", "error");
      return;
    }
    try {
      await api(`/api/patients/${patient.id}`, { method: "DELETE" });
      state.selectedPatientId = null;
      await loadPatients();
      showToast("המטופל/ת נמחק/ה", "success");
      mainEl.innerHTML = emptyStateMarkup();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const headerActions = document.createElement("div");
  headerActions.className = "header-actions";
  headerActions.appendChild(newBtn);
  headerActions.appendChild(editNameBtn);
  headerActions.appendChild(deletePatientBtn);
  header.appendChild(headerActions);
  mainEl.appendChild(header);

  if (sessions.length === 0) {
    const historyCard = document.createElement("div");
    historyCard.className = "card";
    historyCard.innerHTML = `
      <h2 class="section-title">מפגשים קודמים</h2>
      <p class="muted-text">אין עדיין מפגשים למטופל זה.</p>
    `;
    mainEl.appendChild(historyCard);
    return;
  }

  const sectionTitle = document.createElement("h2");
  sectionTitle.className = "section-title";
  sectionTitle.textContent = "מפגשים קודמים";
  mainEl.appendChild(sectionTitle);

  const list = document.createElement("div");
  list.className = "session-list";
  const statusLabels = { in_progress: "בתשאול", proposed: "ממתין לאישור", saved: "נשמר" };
  const statusClasses = { in_progress: "badge-progress", proposed: "badge-proposed", saved: "badge-saved" };
  sessions.forEach((s) => {
    const item = document.createElement("div");
    item.className = "session-card";
    const statusLabel = statusLabels[s.status];
    const statusClass = statusClasses[s.status] || "badge-progress";
    const date = new Date(s.created_at);
    const weekday = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(date);
    const time = new Intl.DateTimeFormat("he-IL", { hour: "2-digit", minute: "2-digit" }).format(date);
    let summary = "תשאול פתוח";
    if (s.final_remedies && s.final_remedies.length) {
      summary = s.final_remedies.map((r) => r.name_he).join(" · ");
    } else if (s.proposed_remedies && s.proposed_remedies.length) {
      summary = s.proposed_remedies.map((r) => r.name_he).join(" · ");
    }
    item.innerHTML = `
      <div class="session-time"><span>${escapeHtml(weekday)}</span><strong>${escapeHtml(time)}</strong></div>
      <div class="session-info">
        <span class="session-date">${formatDateTime(s.created_at)}</span>
        <span class="session-summary">${escapeHtml(summary)}</span>
      </div>
      <span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span>
    `;
    item.onclick = () => openSession(patient, s.id);
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-label", `מפגש מ-${formatDateTime(s.created_at)}, ${statusLabel}`);
    item.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target === item) {
        e.preventDefault();
        openSession(patient, s.id);
      }
    });

    const cardActions = document.createElement("div");
    cardActions.className = "session-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn";
    openBtn.type = "button";
    openBtn.textContent = s.status === "saved" ? "עריכה" : "פתיחה";
    openBtn.onclick = async (e) => {
      e.stopPropagation();
      if (s.status !== "saved") {
        openSession(patient, s.id);
        return;
      }
      try {
        const session = await api(`/api/sessions/${s.id}`);
        state.currentSession = session;
        renderSession(patient, session, { editing: true });
      } catch (err) {
        showToast(err.message, "error");
      }
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-remove";
    deleteBtn.type = "button";
    deleteBtn.textContent = "מחיקה";
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`למחוק לצמיתות את המפגש מ-${formatDateTime(s.created_at)}? לא ניתן לשחזר.`)) return;
      try {
        await api(`/api/sessions/${s.id}`, { method: "DELETE" });
        showToast("המפגש נמחק", "success");
        selectPatient(patient.id);
      } catch (err) {
        showToast(err.message, "error");
      }
    };

    cardActions.appendChild(openBtn);
    cardActions.appendChild(deleteBtn);
    item.appendChild(cardActions);
    list.appendChild(item);
  });
  mainEl.appendChild(list);
}

function renderNewSessionForm(patient, sessions) {
  const savedSessions = (sessions || []).filter((s) => s.status === "saved");
  if (savedSessions.length > 0) {
    renderFollowUpForm(patient, savedSessions);
  } else {
    renderFirstIntakeForm(patient);
  }
}

function renderFirstIntakeForm(patient) {
  mainEl.innerHTML = "";
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <h2 class="section-title">מפגש ראשון עבור ${escapeHtml(patient.name)}</h2>

    <div class="form-grid">
      <div class="field">
        <label for="sessionAtInput">תאריך ושעת הטיפול</label>
        <input type="datetime-local" id="sessionAtInput" value="${getLocalDateTimeValue()}">
      </div>
      <div class="field">
        <label for="ageInput">גיל (לא חובה)</label>
        <input type="text" id="ageInput" placeholder="לדוגמה: 34">
      </div>
      <div class="field field-full">
        <label for="goalInput">מטרת הטיפול (לא חובה)</label>
        <input type="text" id="goalInput" placeholder="לדוגמה: הפחתת חרדה, שיפור ביטחון עצמי...">
      </div>
      <div class="field field-full">
        <label for="symptomsInput">תיאור המצב הרגשי / התסמינים *</label>
        <textarea id="symptomsInput" placeholder="תארו במילים שלכם את המצב הנפשי/רגשי של המטופל..."></textarea>
      </div>
      <div class="field field-full">
        <label for="historyInput">רקע רלוונטי / היסטוריה (לא חובה)</label>
        <textarea id="historyInput" placeholder="אירועים, טיפולים קודמים, הקשר משפחתי..."></textarea>
      </div>
    </div>

    <div class="risk-box">
      <label for="riskInput">הערה על סיכון מיידי, אם יש (לא חובה)</label>
      <input type="text" id="riskInput" placeholder="לדוגמה: ללא, או פירוט אם עולה חשש">
    </div>

    <div class="actions-row">
      <button class="btn btn-primary" id="submitDescBtn" type="button">התחילו תשאול</button>
      <button class="btn" id="backBtn" type="button">חזרה</button>
    </div>
  `;
  mainEl.appendChild(card);

  document.getElementById("backBtn").onclick = () => selectPatient(patient.id);
  document.getElementById("submitDescBtn").onclick = async (e) => {
    const symptomsInput = document.getElementById("symptomsInput");
    const symptoms = symptomsInput.value.trim();
    if (!symptoms) {
      showFieldError(symptomsInput, "יש למלא את השדה הזה");
      return;
    }
    const btn = e.currentTarget;
    setButtonBusy(btn, true, "חושב...");
    try {
      const payload = {
        patient_id: patient.id,
        age: document.getElementById("ageInput").value,
        treatment_goal: document.getElementById("goalInput").value,
        symptoms,
        history: document.getElementById("historyInput").value,
        risk_note: document.getElementById("riskInput").value,
      };
      const sessionAtValue = document.getElementById("sessionAtInput").value;
      if (sessionAtValue) {
        payload.created_at = new Date(sessionAtValue).toISOString();
      }
      const session = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      openSession(patient, session.id, session);
    } catch (err) {
      showToast(err.message, "error");
      setButtonBusy(btn, false);
    }
  };
}

function renderFollowUpForm(patient, savedSessions) {
  mainEl.innerHTML = "";

  const summaryCard = document.createElement("div");
  summaryCard.className = "card";
  summaryCard.innerHTML = `<h2 class="section-title">תקציר המטופל/ת - ${escapeHtml(patient.name)}</h2>`;
  savedSessions.forEach((s) => {
    const entry = document.createElement("div");
    entry.className = "summary-entry";
    const names = (s.final_remedies || []).map((r) => r.name_he).join(", ");
    entry.innerHTML = `
      <div class="summary-entry-date">${formatDateTime(s.created_at)}</div>
      <div class="reason">הרכב שניתן: ${escapeHtml(names)}</div>
      ${s.general_notes ? `<div class="reason">ניתוח: ${escapeHtml(s.general_notes)}</div>` : ""}
      ${s.practitioner_notes ? `<div class="reason">הערות המטפל/ת: ${escapeHtml(s.practitioner_notes)}</div>` : ""}
    `;
    summaryCard.appendChild(entry);
  });
  mainEl.appendChild(summaryCard);

  const formCard = document.createElement("div");
  formCard.className = "card";
  formCard.innerHTML = `
    <h2 class="section-title">מעבר למפגש היום</h2>

    <div class="field">
      <label for="sessionAtInput">תאריך ושעת הטיפול</label>
      <input type="datetime-local" id="sessionAtInput" value="${getLocalDateTimeValue()}">
    </div>
    <div class="field">
      <label for="whatChangedInput">מה השתנה מאז הפגישה האחרונה? איך ההרכב הקודם השפיע, אם בכלל? (לא חובה)</label>
      <textarea id="whatChangedInput" placeholder="לדוגמה: המטופל מדווח שהוא רגוע יותר בעבודה, אבל הקושי לישון נמשך..."></textarea>
    </div>
    <div class="field">
      <label for="symptomsInput">על מה המטופל מדווח היום? *</label>
      <textarea id="symptomsInput" placeholder="תארו את המצב הנוכחי במילים שלכם..."></textarea>
    </div>

    <div class="actions-row">
      <button class="btn btn-primary" id="submitFollowUpBtn" type="button">המשיכו לטיפול היום</button>
      <button class="btn" id="backBtn" type="button">חזרה</button>
    </div>
  `;
  mainEl.appendChild(formCard);

  document.getElementById("backBtn").onclick = () => selectPatient(patient.id);
  document.getElementById("submitFollowUpBtn").onclick = async (e) => {
    const symptomsInput = document.getElementById("symptomsInput");
    const symptoms = symptomsInput.value.trim();
    if (!symptoms) {
      showFieldError(symptomsInput, "יש למלא את השדה הזה");
      return;
    }
    const btn = e.currentTarget;
    setButtonBusy(btn, true, "חושב...");
    try {
      const payload = {
        patient_id: patient.id,
        symptoms,
        history: document.getElementById("whatChangedInput").value,
      };
      const sessionAtValue = document.getElementById("sessionAtInput").value;
      if (sessionAtValue) {
        payload.created_at = new Date(sessionAtValue).toISOString();
      }
      const session = await api("/api/sessions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      openSession(patient, session.id, session);
    } catch (err) {
      showToast(err.message, "error");
      setButtonBusy(btn, false);
    }
  };
}

async function openSession(patient, sessionId, preloaded) {
  try {
    const session = preloaded || (await api(`/api/sessions/${sessionId}`));
    state.currentSession = session;
    renderSession(patient, session);
  } catch (err) {
    showFatalError(err.message);
  }
}

function renderSession(patient, session, options = {}) {
  mainEl.innerHTML = "";

  const statusTitles = {
    in_progress: "תשאול",
    proposed: "ההרכב המוצע",
    saved: "הרכב סופי",
  };
  const pageTitle = options.editing ? "עריכת הטיפול" : statusTitles[session.status] || "תשאול";

  const header = document.createElement("div");
  header.className = "page-header";
  header.innerHTML = `
    <div class="page-header-text">
      <span class="page-eyebrow">${escapeHtml(patient.name)} · ${formatDateTime(session.created_at)}</span>
      <h1 class="page-title">${escapeHtml(pageTitle)}</h1>
    </div>
  `;

  const deleteSessionBtn = document.createElement("button");
  deleteSessionBtn.className = "btn btn-remove";
  deleteSessionBtn.type = "button";
  deleteSessionBtn.textContent = "מחיקת המפגש";
  deleteSessionBtn.onclick = async () => {
    if (!confirm(`למחוק לצמיתות את המפגש מ-${formatDateTime(session.created_at)}? לא ניתן לשחזר.`)) return;
    try {
      await api(`/api/sessions/${session.id}`, { method: "DELETE" });
      showToast("המפגש נמחק", "success");
      selectPatient(patient.id);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const headerActions = document.createElement("div");
  headerActions.className = "header-actions";
  headerActions.appendChild(deleteSessionBtn);
  header.appendChild(headerActions);
  mainEl.appendChild(header);

  const chatCard = document.createElement("div");
  chatCard.className = "card";
  chatCard.innerHTML = `<h2 class="section-title">תיאור פתיחה</h2><p class="multiline">${escapeHtml(session.initial_description)}</p>`;

  const chat = document.createElement("div");
  chat.className = "chat";
  let questionNumber = 0;
  session.transcript.forEach((entry) => {
    if (entry.type === "answer") {
      const bubble = document.createElement("div");
      bubble.className = "msg answer";
      bubble.textContent = entry.text;
      chat.appendChild(bubble);
      return;
    }
    let label = "";
    if (entry.type === "question") {
      questionNumber += 1;
      label = `שאלת הבהרה ${questionNumber}`;
    } else if (entry.type === "explanation") {
      label = "הסבר";
    } else if (entry.type === "proposal") {
      label = "הצעת הרכב";
    }
    const row = document.createElement("div");
    row.className = "msg-row question";
    row.innerHTML = `
      <div class="msg-avatar">${ICONS.leaf}</div>
      <div class="msg question">
        ${label ? `<span class="msg-label">${escapeHtml(label)}</span>` : ""}
        <span class="multiline">${escapeHtml(entry.text)}</span>
      </div>
    `;
    chat.appendChild(row);
  });
  chatCard.appendChild(chat);
  mainEl.appendChild(chatCard);

  if (options.editing) {
    renderProposalEditor(patient, session, { editMode: true });
  } else if (session.status === "in_progress") {
    renderAnswerForm(patient, session, mainEl);
  } else if (session.status === "proposed") {
    renderProposalEditor(patient, session);
  } else if (session.status === "saved") {
    renderSavedSummary(patient, session);
  }

  const backBtn = document.createElement("button");
  backBtn.className = "btn back-link";
  backBtn.type = "button";
  backBtn.textContent = "חזרה לרשימת המפגשים";
  backBtn.onclick = () => selectPatient(patient.id);
  mainEl.appendChild(backBtn);
}

function renderAnswerForm(patient, session, container) {
  const lastQuestion = [...session.transcript].reverse().find((entry) => entry.type === "question");
  if (lastQuestion && Array.isArray(lastQuestion.options) && lastQuestion.options.length) {
    renderOptionAnswerForm(patient, session, container, lastQuestion);
    return;
  }

  // שאלה בלי options (שיחה legacy, לפני השדרוג לשאלון המובנה) - קומפוזר טקסט
  // חופשי ישן, בדיוק כמו קודם.
  const card = document.createElement("div");
  card.className = "card composer-card";
  card.innerHTML = `
    <div class="composer">
      <div class="field">
        <label for="answerInput">התשובה שלכם</label>
        <textarea id="answerInput" placeholder="תשובתכם לשאלת ההבהרה..."></textarea>
      </div>
      <button class="btn btn-primary" id="submitAnswerBtn" type="button">שלחו תשובה</button>
    </div>
  `;
  container.appendChild(card);

  document.getElementById("submitAnswerBtn").onclick = async (e) => {
    const answerInput = document.getElementById("answerInput");
    const answer = answerInput.value.trim();
    if (!answer) {
      showFieldError(answerInput, "יש למלא את השדה הזה");
      return;
    }
    const btn = e.currentTarget;
    setButtonBusy(btn, true, "חושב...");
    try {
      const updated = await api(`/api/sessions/${session.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });
      openSession(patient, session.id, updated);
    } catch (err) {
      showToast(err.message, "error");
      setButtonBusy(btn, false);
    }
  };
}

function renderOptionAnswerForm(patient, session, container, question) {
  const card = document.createElement("div");
  card.className = "card composer-card";

  const optionsHtml = question.options
    .map(
      (opt) => `
        <label class="option-row" data-option-id="${escapeHtml(opt.id)}">
          <input type="checkbox" class="option-checkbox" value="${escapeHtml(opt.id)}" ${opt.suggested ? "checked" : ""}>
          <span class="option-label">${escapeHtml(opt.label)}</span>
          ${opt.suggested ? `<span class="suggest-tag">עלה מהתיאור</span>` : ""}
        </label>
      `
    )
    .join("");

  card.innerHTML = `
    <div class="option-list">${optionsHtml}</div>
    <div class="field">
      <label for="answerNoteInput">הערה נוספת (לא חובה)</label>
      <textarea id="answerNoteInput" placeholder="מידע חופשי נוסף, אם יש..."></textarea>
    </div>
    <button class="btn btn-primary" id="submitAnswerBtn" type="button">המשך</button>
  `;
  container.appendChild(card);

  const rows = Array.from(card.querySelectorAll(".option-row"));
  const checkboxes = rows.map((row) => row.querySelector(".option-checkbox"));
  const noneCheckbox = checkboxes.find((cb) => cb.value === "none") || null;

  function syncRowCheckedClass(cb) {
    const row = cb.closest(".option-row");
    if (row) row.classList.toggle("is-checked", cb.checked);
  }

  checkboxes.forEach((cb) => {
    syncRowCheckedClass(cb);
    cb.addEventListener("change", () => {
      if (noneCheckbox) {
        if (cb === noneCheckbox && cb.checked) {
          checkboxes.forEach((other) => {
            if (other !== noneCheckbox) {
              other.checked = false;
              syncRowCheckedClass(other);
            }
          });
        } else if (cb !== noneCheckbox && cb.checked) {
          noneCheckbox.checked = false;
          syncRowCheckedClass(noneCheckbox);
        }
      }
      syncRowCheckedClass(cb);
    });
  });

  document.getElementById("submitAnswerBtn").onclick = async (e) => {
    const checked = checkboxes.filter((cb) => cb.checked);
    if (checked.length === 0) {
      showToast("יש לסמן לפחות אפשרות אחת, או 'אף אחד מאלה'", "error");
      return;
    }
    const labels = checked
      .map((cb) => question.options.find((opt) => opt.id === cb.value))
      .filter(Boolean)
      .map((opt) => opt.label);

    const noteInput = document.getElementById("answerNoteInput");
    const note = noteInput.value.trim();
    let answer = labels.join("\n");
    if (note) {
      answer += (answer ? "\n" : "") + "הערה: " + note;
    }

    const btn = e.currentTarget;
    setButtonBusy(btn, true, "שולח...");
    try {
      const updated = await api(`/api/sessions/${session.id}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer }),
      });
      openSession(patient, session.id, updated);
    } catch (err) {
      showToast(err.message, "error");
      setButtonBusy(btn, false);
    }
  };
}

function renderProposalEditor(patient, session, options = {}) {
  const editMode = options.editMode === true;

  const showAnalysisCard = !editMode || !!session.general_notes;
  const analysisCardHtml = showAnalysisCard
    ? `
      <div class="card analysis-card">
        <h2 class="section-title">ניתוח המטופל/ת</h2>
        <p>${escapeHtml(session.general_notes || "")}</p>
      </div>
    `
    : "";

  const challengeCardHtml = editMode
    ? ""
    : `
      <div class="card challenge-card">
        <h2 class="section-title" id="challengeInputLabel">יש הסתייגות או שאלה מטעם המטופל?</h2>
        <textarea id="challengeInput" aria-labelledby="challengeInputLabel" placeholder="לדוגמה: המטופל מרגיש שזה לא מתאר אותו כי..."></textarea>
        <span class="field-hint">שאלות שמתחילות ב"למה" יקבלו הסבר. הערות חדשות יבדקו מחדש את ההרכב.</span>
        <button class="btn" id="challengeBtn" type="button">שלחו לבדיקה מחדש</button>
      </div>
    `;

  const saveBtnLabel = editMode ? "שמירת השינויים" : "שמרו הרכב";
  const cancelBtnHtml = editMode
    ? `<button class="btn btn-block" id="cancelEditBtn" type="button">ביטול</button>`
    : "";

  const wrap = document.createElement("div");
  wrap.className = "proposal-layout";
  wrap.innerHTML = `
    <div class="proposal-main">
      <div class="remedy-list-header">
        <h2 class="section-title">ההרכב שנבחר</h2>
        <button class="btn btn-link" id="toggleAllFlowersBtn" type="button">+ הוסיפו תמצית נוספת</button>
      </div>
      <div id="selectedList"></div>
      <div id="allFlowersList" class="flower-picker-list" style="display:none;"></div>
    </div>
    <div class="proposal-aside">
      ${analysisCardHtml}
      ${challengeCardHtml}
      <div class="card">
        <h2 class="section-title" id="usageInstructionsLabel">הנחיות שימוש</h2>
        <textarea id="usageInstructions" aria-labelledby="usageInstructionsLabel">${escapeHtml(session.usage_instructions || "")}</textarea>
      </div>
      <div class="card">
        <h2 class="section-title" id="practitionerNotesLabel">הערות המטפל/ת (לא יודפסו למטופל)</h2>
        <textarea id="practitionerNotes" aria-labelledby="practitionerNotesLabel" placeholder="הערות פנימיות, אופציונלי">${escapeHtml(editMode ? session.practitioner_notes || "" : "")}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="saveSessionBtn" type="button">${escapeHtml(saveBtnLabel)}</button>
      ${cancelBtnHtml}
    </div>
  `;
  mainEl.appendChild(wrap);

  const selected = ((editMode ? session.final_remedies : session.proposed_remedies) || []).map((r) => ({ ...r }));

  const selectedListEl = wrap.querySelector("#selectedList");
  const allFlowersEl = wrap.querySelector("#allFlowersList");

  function renderSelectedList() {
    selectedListEl.innerHTML = "";
    if (selected.length === 0) {
      selectedListEl.innerHTML = `<p class="muted-text">לא נבחרו תמציות. הוסיפו מהרשימה המלאה למטה.</p>`;
    }
    selected.forEach((r, index) => {
      const row = document.createElement("div");
      row.className = "remedy-card";

      const number = document.createElement("div");
      number.className = "remedy-number";
      number.textContent = String(index + 1);
      row.appendChild(number);

      const body = document.createElement("div");
      body.className = "remedy-body";

      const group = state.flowers.find((f) => f.key === r.key)?.group_he;
      const titleRow = document.createElement("div");
      titleRow.className = "remedy-title-row";
      titleRow.innerHTML = `
        <span class="remedy-name">${escapeHtml(r.name_he)}</span>
        <span class="remedy-name-en" dir="ltr">${escapeHtml(r.name_en)}</span>
        ${group ? `<span class="pill">${escapeHtml(group)}</span>` : ""}
      `;
      body.appendChild(titleRow);

      const reasonInput = document.createElement("textarea");
      reasonInput.rows = 3;
      reasonInput.className = "reason-input";
      reasonInput.placeholder = "נימוק להכללת התמצית בהרכב";
      reasonInput.value = r.reason || "";
      reasonInput.oninput = () => (r.reason = reasonInput.value);
      body.appendChild(reasonInput);

      row.appendChild(body);

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-remove";
      removeBtn.type = "button";
      removeBtn.textContent = "הסר";
      removeBtn.onclick = () => {
        selected.splice(index, 1);
        renderSelectedList();
      };
      row.appendChild(removeBtn);

      selectedListEl.appendChild(row);
    });
  }

  function renderAllFlowersList() {
    allFlowersEl.innerHTML = "";
    const groups = {};
    state.flowers.forEach((f) => {
      groups[f.group_he] = groups[f.group_he] || [];
      groups[f.group_he].push(f);
    });
    Object.entries(groups).forEach(([groupName, flowers]) => {
      const groupTitle = document.createElement("div");
      groupTitle.className = "flower-group-title";
      groupTitle.textContent = groupName;
      allFlowersEl.appendChild(groupTitle);

      flowers.forEach((f) => {
        const row = document.createElement("div");
        row.className = "flower-option";
        row.innerHTML = `
          <div class="remedy-title-row">
            <span class="remedy-name">${escapeHtml(f.name_he)}</span>
            <span class="remedy-name-en" dir="ltr">${escapeHtml(f.name_en)}</span>
          </div>
          <div class="reason">${escapeHtml(f.keynote)}</div>
        `;
        row.onclick = () => {
          if (selected.some((r) => r.key === f.key)) return;
          selected.push({ key: f.key, name_he: f.name_he, name_en: f.name_en, reason: "" });
          renderSelectedList();
        };
        allFlowersEl.appendChild(row);
      });
    });
  }

  renderSelectedList();
  renderAllFlowersList();

  document.getElementById("toggleAllFlowersBtn").onclick = (e) => {
    const showing = allFlowersEl.style.display !== "none";
    allFlowersEl.style.display = showing ? "none" : "block";
    e.target.textContent = showing ? "+ הוסיפו תמצית נוספת" : "הסתירו את הרשימה המלאה";
  };

  if (!editMode) {
    document.getElementById("challengeBtn").onclick = async (e) => {
      const challengeInput = document.getElementById("challengeInput");
      const message = challengeInput.value.trim();
      if (!message) {
        showFieldError(challengeInput, "יש למלא את השדה הזה");
        return;
      }
      const btn = e.currentTarget;
      setButtonBusy(btn, true, "בודק...");
      try {
        const updated = await api(`/api/sessions/${session.id}/challenge`, {
          method: "POST",
          body: JSON.stringify({ message }),
        });
        openSession(patient, session.id, updated);
      } catch (err) {
        showToast(err.message, "error");
        setButtonBusy(btn, false);
      }
    };
  }

  document.getElementById("saveSessionBtn").onclick = async (e) => {
    if (selected.length === 0) {
      showToast("יש לבחור לפחות תמצית אחת", "error");
      return;
    }
    const btn = e.currentTarget;
    setButtonBusy(btn, true, "שומר...");
    try {
      const payload = {
        final_remedies: selected,
        practitioner_notes: document.getElementById("practitionerNotes").value,
        usage_instructions: document.getElementById("usageInstructions").value,
      };
      const updated = editMode
        ? await api(`/api/sessions/${session.id}/final`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await api(`/api/sessions/${session.id}/save`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
      showToast(editMode ? "השינויים נשמרו" : "ההרכב נשמר", "success");
      openSession(patient, session.id, updated);
    } catch (err) {
      showToast(err.message, "error");
      setButtonBusy(btn, false);
    }
  };

  if (editMode) {
    document.getElementById("cancelEditBtn").onclick = () => {
      openSession(patient, session.id);
    };
  }
}

function renderSavedSummary(patient, session) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `<h2 class="section-title">הרכב סופי</h2>`;
  session.final_remedies.forEach((r, index) => {
    const row = document.createElement("div");
    row.className = "remedy-card";
    const group = state.flowers.find((f) => f.key === r.key)?.group_he;
    row.innerHTML = `
      <div class="remedy-number">${index + 1}</div>
      <div class="remedy-body">
        <div class="remedy-title-row">
          <span class="remedy-name">${escapeHtml(r.name_he)}</span>
          <span class="remedy-name-en" dir="ltr">${escapeHtml(r.name_en)}</span>
          ${group ? `<span class="pill">${escapeHtml(group)}</span>` : ""}
        </div>
        <p class="reason">${escapeHtml(r.reason)}</p>
      </div>
    `;
    card.appendChild(row);
  });
  const printBtn = document.createElement("button");
  printBtn.className = "btn btn-primary";
  printBtn.type = "button";
  printBtn.innerHTML = `${ICONS.printer}הכינו דף להדפסה`;
  printBtn.onclick = () => printSession(patient, session);
  card.appendChild(printBtn);

  const editBtn = document.createElement("button");
  editBtn.className = "btn";
  editBtn.type = "button";
  editBtn.textContent = "עריכת הטיפול";
  editBtn.onclick = () => renderSession(patient, session, { editing: true });
  card.appendChild(editBtn);

  mainEl.appendChild(card);
}

function printSession(patient, session) {
  const dateStr = new Date(session.created_at).toLocaleDateString("he-IL");
  const remediesHtml = session.final_remedies
    .map(
      (r, index) => `
        <li>
          <span class="num">${index + 1}.</span>
          <div>
            <div class="remedy-title-row">
              <span class="remedy-name">${escapeHtml(r.name_he)}</span>
              <span class="remedy-name-en" dir="ltr">${escapeHtml(r.name_en)}</span>
            </div>
            <div class="reason">${escapeHtml(r.reason)}</div>
          </div>
        </li>
      `
    )
    .join("");

  printAreaEl.innerHTML = `
    <div class="print-header">
      <div>
        <div class="print-brand">${ICONS.leaf}<span>יועץ תמציות באך</span></div>
        <h1>הרכב תמציות אישי</h1>
      </div>
      <div class="print-meta">
        <span><strong>עבור:</strong> ${escapeHtml(patient.name)}</span>
        <span><strong>תאריך:</strong> ${dateStr}</span>
      </div>
    </div>
    <h2 class="section-title">התמציות שבבקבוקון</h2>
    <ol class="print-list">${remediesHtml}</ol>
    <div class="print-usage">
      <h2>איך משתמשים</h2>
      <p>${escapeHtml(session.usage_instructions || "").replace(/\n/g, "<br>")}</p>
    </div>
    <div class="footnote">
      תמציות באך הן כלי משלים ותומך, ואינן תחליף לאבחון, טיפול רפואי או נפשי מקצועי.
      במקרה של מצוקה משמעותית יש לפנות לגורם מטפל מוסמך.
    </div>
  `;
  window.print();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getLocalDateTimeValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

(async function init() {
  try {
    await loadFlowers();
    await loadPatients();
  } catch (err) {
    showFatalError(err.message);
  }
})();
