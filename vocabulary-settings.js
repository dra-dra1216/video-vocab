function initializeVocabularySettings(doc, chromeApi, setStatus) {
  const status = doc.getElementById("vocabBackupStatus");
  const fileInput = doc.getElementById("vocabBackupFile");
  const enrichButton = doc.getElementById("enrichNotes");

  async function request(payload) {
    const response = await chromeApi?.runtime?.sendMessage(payload);
    if (!response?.success) throw new Error(response?.error);
    return response;
  }

  function reportError(error) {
    setStatus(status, "vocabularyRequestFailed", { detail: error.message });
  }

  enrichButton.addEventListener("click", async () => {
    enrichButton.disabled = true;
    try {
      const source = await request({ action: "getVocabulary" });
      const notesByVideo = new Map();
      for (const item of Object.values(source.records)) {
        if (
          item.kind !== "note" || item.learningExpression ||
          !/[A-Za-z]/.test(item.term) || item.term.split(/\s+/).length > 12
        ) continue;
        if (!notesByVideo.has(item.videoId)) notesByVideo.set(item.videoId, []);
        notesByVideo.get(item.videoId).push("note:" + item.sourceNoteId);
      }

      const batches = [];
      for (const [videoId, entryIds] of notesByVideo) {
        for (let offset = 0; offset < entryIds.length; offset += 20) {
          batches.push({ videoId, entryIds: entryIds.slice(offset, offset + 20) });
        }
      }
      let updated = 0;
      let missing = 0;
      for (const [index, batch] of batches.entries()) {
        setStatus(status, "vocabularyEnrichProgress", { batch: index + 1, total: batches.length });
        const result = await request({ action: "enrichVocabularyNotes", ...batch, fetchMissing: true });
        updated += result.updated;
        missing += result.missing;
      }
      setStatus(status, "vocabularyEnriched", { updated, missing });
    } catch (error) {
      reportError(error);
    } finally {
      enrichButton.disabled = false;
    }
  });

  doc.getElementById("vocabBackup").addEventListener("click", async () => {
    try {
      const result = await request({ action: "getVocabulary" });
      const backup = JSON.stringify({ version: 2, items: Object.values(result.records) }, null, 2);
      const url = URL.createObjectURL(new Blob([backup], { type: "application/json" }));
      const link = doc.createElement("a");
      link.href = url;
      link.download = "youtube-vocabulary-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus(status, "vocabularyExported");
    } catch (error) {
      reportError(error);
    }
  });

  doc.getElementById("vocabRestore").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) {
        setStatus(status, "vocabularyFileTooLarge");
        return;
      }
      const content = await file.text();
      let backup;
      try {
        backup = JSON.parse(content);
      } catch {
        setStatus(status, "vocabularyInvalidJson");
        return;
      }
      const { imported, skipped } = await request({ action: "restoreVocabulary", backup });
      setStatus(status, "vocabularyImported", { imported, skipped });
    } catch (error) {
      reportError(error);
    } finally {
      fileInput.value = "";
    }
  });
}
