"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Edit3, FileArchive, Plus, Save, Trash2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, getErrorMessage } from "@/lib/api";

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
  testCases?: string;
}

const emptyTestCases = JSON.stringify([{ input: "5 10", output: "15" }], null, 2);

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("1");
  const [memoryLimit, setMemoryLimit] = useState("256");
  const [testCases, setTestCases] = useState(emptyTestCases);
  const [testCasesFile, setTestCasesFile] = useState<File | null>(null);
  const [jsonError, setJsonError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedId) || null,
    [problems, selectedId],
  );

  const fetchProblems = useCallback(async () => {
    try {
      const response = await api.get<Problem[]>("/problems");
      setProblems(response.data);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError, "Cannot load problems."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") router.push("/");
  }, [router, user]);

  useEffect(() => {
    const loadProblems = window.setTimeout(() => {
      void fetchProblems();
    }, 0);

    return () => window.clearTimeout(loadProblems);
  }, [fetchProblems]);

  const resetForm = () => {
    setSelectedId(null);
    setTitle("");
    setDescription("");
    setTimeLimit("1");
    setMemoryLimit("256");
    setTestCases(emptyTestCases);
    setTestCasesFile(null);
    setJsonError("");
    setError("");
    setNotice("");
  };

  const editProblem = (problem: Problem) => {
    setSelectedId(problem.id);
    setTitle(problem.title);
    setDescription(problem.description);
    setTimeLimit(String(problem.timeLimit));
    setMemoryLimit(String(problem.memoryLimit));
    setTestCases(problem.testCases || emptyTestCases);
    setTestCasesFile(null);
    setJsonError("");
    setError("");
    setNotice("");
  };

  const updateTestCases = (value: string) => {
    setTestCases(value);
    if (!value.trim()) {
      setJsonError("Test cases cannot be empty.");
      return;
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (!Array.isArray(parsed)) {
        setJsonError("Test cases must be an array.");
        return;
      }
      setJsonError("");
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid JSON.";
      setJsonError(message);
    }
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("timeLimit", timeLimit);
    formData.append("memoryLimit", memoryLimit);

    if (testCasesFile) {
      formData.append("testCasesFile", testCasesFile);
    } else {
      formData.append("testCases", testCases);
    }

    return formData;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("You need to sign in as admin.");
      return;
    }
    if (!testCasesFile && jsonError) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (selectedId) {
        await api.put(`/problems/${selectedId}`, buildFormData(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice("Problem updated.");
      } else {
        await api.post("/problems", buildFormData(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotice("Problem created.");
      }

      await fetchProblems();
      resetForm();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Cannot save problem."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (problem: Problem) => {
    if (!token) return;
    const confirmed = window.confirm(`Delete "${problem.title}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/problems/${problem.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedId === problem.id) resetForm();
      await fetchProblems();
      setNotice("Problem deleted.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Cannot delete problem."));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">Admin</p>
          <h1 className="text-3xl font-black text-slate-950">Problem Manager</h1>
          <p className="text-sm text-slate-500">Create, edit, delete and upload HackerRank-style test data.</p>
        </div>
        <button
          onClick={resetForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600"
        >
          <Plus size={16} />
          New problem
        </button>
      </div>

      {(notice || error) && (
        <div className={`mb-5 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${
          error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
        }`}>
          {error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {error || notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Problems</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {problems.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No problems yet.</div>
            ) : (
              problems.map((problem) => (
                <div
                  key={problem.id}
                  className={`p-4 transition ${selectedId === problem.id ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => editProblem(problem)} className="min-w-0 text-left">
                      <p className="truncate text-sm font-black text-slate-900">
                        #{problem.id} {problem.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {problem.timeLimit}s / {problem.memoryLimit}MB
                      </p>
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => editProblem(problem)}
                        className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => void handleDelete(problem)}
                        className="rounded-md p-2 text-slate-500 hover:bg-white hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <form onSubmit={handleSave} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                {selectedProblem ? `Edit #${selectedProblem.id}` : "Create problem"}
              </h2>
              <p className="text-sm text-slate-500">Upload a zip with pairs like `1.in` and `1.out`, or paste JSON below.</p>
            </div>
            {selectedProblem && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title="Close edit"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Title</span>
              <input
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="A + B Problem"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Time limit (s)</span>
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={timeLimit}
                onChange={(event) => setTimeLimit(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Memory limit (MB)</span>
              <input
                required
                type="number"
                min="16"
                step="1"
                value={memoryLimit}
                onChange={(event) => setMemoryLimit(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Statement</span>
              <textarea
                required
                rows={10}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Describe problem, input format, output format and examples..."
              />
            </label>

            <div className="space-y-3 md:col-span-2">
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white p-2 text-blue-600">
                    <FileArchive size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {testCasesFile ? testCasesFile.name : "Upload testcase ZIP"}
                    </p>
                    <p className="text-xs text-slate-500">Each input file must have a matching output file, for example `01.in` and `01.out`.</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(event) => setTestCasesFile(event.target.files?.[0] || null)}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
                />
              </div>

              {!testCasesFile && (
                <label className="space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-500">Manual test cases JSON</span>
                  <textarea
                    rows={8}
                    value={testCases}
                    onChange={(event) => updateTestCases(event.target.value)}
                    className={`w-full rounded-lg border bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-green-300 outline-none ${
                      jsonError ? "border-red-400 ring-4 ring-red-500/10" : "border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    }`}
                  />
                  {jsonError && <p className="text-xs font-bold text-red-600">{jsonError}</p>}
                </label>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || (!testCasesFile && Boolean(jsonError))}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : selectedProblem ? "Save changes" : "Create problem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
