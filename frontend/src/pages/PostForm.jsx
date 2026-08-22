import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { Lightbox } from "../components/Lightbox.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { shiftInputDate, toInputDate } from "../utils/dates.js";
import { compressImage } from "../utils/image.js";

const emptyForm = {
  title: "",
  body: "",
  activityDate: toInputDate(new Date().toISOString()),
  imageData: "",
};

export function PostFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [dragging, setDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/posts/${id}`)
      .then((response) => {
        const post = response.data.post;
        setForm({
          title: post.title,
          body: post.body,
          activityDate: toInputDate(post.activityDate),
          imageData: post.imageData || "",
        });
      })
      .catch((loadError) => setError(getErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function setImageFile(file) {
    if (!file) return;
    try {
      const imageData = await compressImage(file);
      updateField("imageData", imageData);
      setError("");
    } catch (imageError) {
      setError(imageError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.imageData) {
      setError("Voeg een afbeelding toe.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await api.put(`/posts/${id}`, form);
        toast.show({ message: "Bericht is bijgewerkt.", duration: 4000 });
      } else {
        await api.post("/posts", form);
        toast.show({ message: "Bericht hangt op het bord.", duration: 4000 });
      }
      navigate("/bord");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Opslaan is niet gelukt."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-primary-500">Bericht wordt geladen…</p>;
  }

  return (
    <section className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-brick-600 dark:text-accent-300">Redactie</p>
      <h1 className="page-title mt-1">{isEdit ? "Bericht bewerken" : "Nieuw bericht"}</h1>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 rounded-lg p-6">
        <div>
          <label className="label" htmlFor="title">
            Titel
          </label>
          <input
            id="title"
            className="input"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            maxLength={160}
            required
          />
          <p className="mt-1 text-right text-xs text-primary-500">{form.title.length}/160</p>
        </div>
        <div>
          <label className="label" htmlFor="activityDate">
            Datum
          </label>
          <input
            id="activityDate"
            type="date"
            className="input"
            value={form.activityDate}
            onChange={(event) => updateField("activityDate", event.target.value)}
            required
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => updateField("activityDate", shiftInputDate(0))}>
              Vandaag
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => updateField("activityDate", shiftInputDate(1))}>
              Morgen
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => updateField("activityDate", shiftInputDate(7))}>
              Over een week
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="body">
            Tekst
          </label>
          <textarea
            id="body"
            className="input min-h-36"
            value={form.body}
            onChange={(event) => updateField("body", event.target.value)}
            maxLength={4000}
            required
          />
          <p className="mt-1 text-right text-xs text-primary-500">{form.body.length}/4000</p>
        </div>
        <div>
          <p className="label">Afbeelding</p>
          <label
            htmlFor="image"
            className={`block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragging
                ? "border-accent-400 bg-accent-50 dark:bg-primary-700"
                : "border-primary-200 hover:border-primary-400 dark:border-primary-600"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              setImageFile(event.dataTransfer.files?.[0]);
            }}
          >
            <span className="font-medium">Sleep een foto hierheen of klik om te kiezen</span>
            <input
              id="image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setImageFile(event.target.files?.[0])}
            />
          </label>
          {form.imageData ? (
            <div className="mt-4 space-y-3">
              <button type="button" className="block w-full" onClick={() => setPreviewOpen(true)}>
                <img
                  src={form.imageData}
                  alt="Voorvertoning van de gekozen foto"
                  className="max-h-[28rem] w-full rounded-md object-contain bg-primary-50 dark:bg-primary-900"
                />
              </button>
              <p className="text-sm text-primary-500">Klik op de foto om die groter te bekijken.</p>
              <button type="button" className="btn btn-ghost" onClick={() => updateField("imageData", "")}>
                Andere foto kiezen
              </button>
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-brick-600">{error}</p> : null}
        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
          <Link to="/bord" className="btn btn-secondary">
            Annuleren
          </Link>
        </div>
      </form>
      {previewOpen ? (
        <Lightbox src={form.imageData} alt="Voorvertoning" onClose={() => setPreviewOpen(false)} />
      ) : null}
    </section>
  );
}
