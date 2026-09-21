// mobile/backup.js
// Export/import of the local on-device data store, for the offline mobile PWA.
// Wires the "גיבוי נתונים" UI block in mobile/index.html to window.BachLocalStore
// (defined in mobile/local-store.js). Must not crash if BachLocalStore is missing
// (e.g. while the engine files are still being developed) — the buttons simply
// show an error toast/alert instead of breaking the page.

(function () {
  function notify(message, kind) {
    if (typeof showToast === "function") {
      showToast(message, kind || "info");
    } else {
      alert(message);
    }
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function backupFilename() {
    const d = new Date();
    return `bach-advisor-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  }

  async function exportBackup() {
    if (!window.BachLocalStore || typeof window.BachLocalStore.exportData !== "function") {
      notify("גיבוי אינו זמין כרגע.", "error");
      return;
    }
    try {
      const data = await window.BachLocalStore.exportData();
      const json = JSON.stringify(data, null, 2);
      const filename = backupFilename();
      const file = new File([json], filename, { type: "application/json" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return;
        } catch (shareErr) {
          if (shareErr && shareErr.name === "AbortError") return;
          // fall through to download if sharing fails for another reason
        }
      }

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("הגיבוי הורד בהצלחה", "success");
    } catch (err) {
      notify("שגיאה בייצוא הגיבוי: " + (err && err.message ? err.message : err), "error");
    }
  }

  function importBackup(file) {
    if (!window.BachLocalStore || typeof window.BachLocalStore.importData !== "function") {
      notify("ייבוא אינו זמין כרגע.", "error");
      return;
    }
    if (!file) return;

    const confirmed = confirm(
      "ייבוא הגיבוי יחליף את כל הנתונים שבמכשיר הזה. להמשיך?"
    );
    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        await window.BachLocalStore.importData(data);
        location.reload();
      } catch (err) {
        notify("שגיאה בייבוא הגיבוי: " + (err && err.message ? err.message : err), "error");
      }
    };
    reader.onerror = () => {
      notify("שגיאה בקריאת קובץ הגיבוי.", "error");
    };
    reader.readAsText(file, "utf-8");
  }

  function init() {
    const exportBtn = document.getElementById("exportBackupBtn");
    const importBtn = document.getElementById("importBackupBtn");
    const importInput = document.getElementById("importBackupInput");

    if (exportBtn) {
      exportBtn.addEventListener("click", exportBackup);
    }
    if (importBtn && importInput) {
      importBtn.addEventListener("click", () => importInput.click());
      importInput.addEventListener("change", () => {
        const file = importInput.files && importInput.files[0];
        importBackup(file);
        importInput.value = "";
      });
    }

    if (window.BachLocalStore && typeof window.BachLocalStore.requestPersistence === "function") {
      try {
        window.BachLocalStore.requestPersistence();
      } catch (err) {
        // non-fatal
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
