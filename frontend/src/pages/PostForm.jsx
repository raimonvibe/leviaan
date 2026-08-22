import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { DateRangePicker } from "../components/DateRangePicker.jsx";
import { Lightbox } from "../components/Lightbox.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { toInputDate } from "../utils/dates.js";
import { compressImage } from "../utils/image.js";

const emptyForm = {
  title: "",
  body: "",
  activityDate: toInputDate(new Date()),
  activityEndDate: toInputDate(new Date()),
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
          activityEndDate: toInputDate(post.activityEndDate || post.activityDate),
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
    <section className="mx-auto max-w-xl">
      <h1 className="page-title">{isEdit ? "Bericht bewerken" : "Nieuw bericht"}</h1>
      <form onSubmit={handleSubmit} className="card mt-5 space-y-5 rounded-lg p-4 sm:p-6">
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
          <DateRangePicker
            start={form.activityDate}
            end={form.activityEndDate}
            onChange={({ start, end }) =>
              setForm((current) => ({ ...current, activityDate: start, activityEndDate: end || start }))
            }
          />
        </div>
        <div>
          <label className="label" htmlFor="body">
            Tekst
          </label>
          <textarea
            id="body"
            className="input min-h-32"
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
            className={`block cursor-pointer rounded-lg border border-dashed p-5 text-center text-sm ${
              dragging ? "border-accent-400 bg-accent-50 dark:bg-primary-700" : "border-primary-200 dark:border-primary-600"
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
            Sleep een foto hierheen of tik om te kiezen
            <input
              id="image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => setImageFile(event.target.files?.[0])}
            />
          </label>
          {form.imageData ? (
            <div className="mt-3 space-y-2">
              <button type="button" className="block w-full" onClick={() => setPreviewOpen(true)}>
                <img
                  src={form.imageData}
                  alt="Voorvertoning"
                  className="max-h-72 w-full rounded-md object-contain sm:max-h-96"
                />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => updateField("imageData", "")}>
                Andere foto
              </button>
            </div>
          ) : null}
        </div>
        {error ? <p className="text-sm text-brick-600">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Link to="/bord" className="btn btn-secondary w-full sm:w-auto">
            Annuleren
          </Link>
          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </form>
      {previewOpen ? <Lightbox src={form.imageData} alt="Voorvertoning" onClose={() => setPreviewOpen(false)} /> : null}
    </section>
  );
}
