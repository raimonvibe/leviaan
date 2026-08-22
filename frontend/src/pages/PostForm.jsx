import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, getErrorMessage } from "../api/client.js";
import { toInputDate } from "../utils/dates.js";
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
  const isEdit = Boolean(id);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

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

  async function handleImage(event) {
    const file = event.target.files?.[0];
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
      } else {
        await api.post("/posts", form);
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
            required
          />
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
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="image">
            Afbeelding
          </label>
          <input id="image" type="file" accept="image/*" onChange={handleImage} className="block w-full text-sm" />
          {form.imageData ? (
            <img src={form.imageData} alt="" className="mt-4 max-h-64 rounded-md object-cover" />
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
    </section>
  );
}
