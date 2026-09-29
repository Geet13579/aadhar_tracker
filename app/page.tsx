"use client";

import { useEffect, useState } from "react";
import PointInfoModal from "./components/PointInfoModal";
import formatRemarkDate from "./components/date_formate";

type Remark = {
  id?: number;
  remark: string;
  remarkBy: string;
  createdAt?: string;
  created_at?: string;
};

type Point = {
  id: number;
  title: string;
  remark: string;
  remarkBy: string;
  remarks: Remark[];
  createdAt: string;
  updatedAt: string;
};
type Subject = { id: number; title: string; date: string; color: "yellow" | "green" | "red"; points: Point[]; };
type Team = { id: number; name: string; };
type Category = {
  id: number;
  name: string;
  teamId?: number;
  hasSubCategories?: boolean;
};

type SubCategory = {
  id: number;
  name: string;
  categoryId?: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function categoryCreateApi<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message || `Category create API request failed: ${response.status}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["data", "items", "results", "teams", "categories", "subjects", "points"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function unwrapData(value: unknown): unknown {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("data" in record && record.data !== undefined) {
      return record.data;
    }
  }
  return value;
}

function getId(value: unknown): number { return typeof value === "number" ? value : Number(typeof value === "string" ? value : (value as Record<string, unknown>)?.id); }
function getName(value: unknown): string { const item = (value || {}) as Record<string, unknown>; return String(item.name ?? item.title ?? ""); }
// function getCurrentDate() {
//   const date = new Date();
//   return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
// }
function getDate(value: unknown): string {
  const item = (value || {}) as Record<string, unknown>;
  const raw = item.createdAt ?? item.created_at ?? item.date ?? item.updatedAt;
  if (!raw) return getCurrentDate();
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? String(raw) : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}
function mapPoint(value: unknown): Point {
  const unwrapped = unwrapData(value);
  const item = (unwrapped || {}) as Record<string, unknown>;

  const rawRemarks = Array.isArray(item.remarks)
    ? item.remarks
    : [];

  const remarks: Remark[] = rawRemarks.map((remark) => {
    const r = (remark || {}) as Record<string, unknown>;

    return {
      id: r.id != null ? Number(r.id) : undefined,
      remark: String(r.remark ?? ""),
      remarkBy: String(r.remarkBy ?? ""),
      createdAt:
        r.createdAt != null
          ? String(r.createdAt)
          : undefined,
      created_at:
        r.created_at != null
          ? String(r.created_at)
          : undefined,
    };
  });

  const fallbackRemark = String(
    item.remark ?? item.haRemark ?? ""
  );

  const fallbackRemarkBy = String(
    item.remarkBy ?? "HA"
  );

  const finalRemarks: Remark[] =
    remarks.length > 0
      ? remarks
      : fallbackRemark
        ? [
          {
            remark: fallbackRemark,
            remarkBy: fallbackRemarkBy,
          },
        ]
        : [];

  const haRemarks = finalRemarks.filter(
    (remark) =>
      remark.remarkBy.toUpperCase() === "HA"
  );

  const selectedRemark =
    haRemarks.length > 0
      ? haRemarks[haRemarks.length - 1]
      : finalRemarks[finalRemarks.length - 1];

  const formatDate = (date: unknown) => {
    if (!date) return "";
    const d = new Date(String(date));
    if (Number.isNaN(d.getTime())) return String(date);

    const pad = (n: number) => String(n).padStart(2, "0");

    return `${pad(d.getDate())}-${pad(
      d.getMonth() + 1
    )}-${d.getFullYear()} ${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  return {
    id: getId(item.id),
    title: String(item.name ?? item.title ?? ""),
    remark: String(
      selectedRemark?.remark ??
      fallbackRemark ??
      ""
    ),
    remarkBy: String(
      selectedRemark?.remarkBy ??
      fallbackRemarkBy ??
      ""
    ),
    remarks: finalRemarks,
    createdAt: formatDate(item.createdAt),
    updatedAt: formatDate(item.updatedAt),
  };
}

function mapSubject(value: unknown, index: number): Subject {
  const item = (value || {}) as Record<string, unknown>;
  const status = String(item.status ?? "").toUpperCase();
  const color: Subject["color"] = status === "DONE" ? "green" : status === "TODO" ? "yellow" : index % 3 === 2 ? "red" : "green";
  return { id: getId(item.id), title: String(item.name ?? item.title ?? ""), date: getDate(item), color, points: [] };
}

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openSubjects, setOpenSubjects] = useState<number[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subCategoryId, setSubCategoryId] = useState<number | null>(null);
  const [subCategory, setSubCategory] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [pointSubjectId, setPointSubjectId] = useState<number | null>(null);
  const [pointName, setPointName] = useState("");
  const [pointRemark, setPointRemark] = useState("");
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  const loadSubjects = async (nextCategoryId: number) => {
    const rawSubjects = await api<unknown>(`/categories/${nextCategoryId}/subjects`);
    const mapped = asArray<unknown>(rawSubjects).map(mapSubject);
    const withPoints = await Promise.all(mapped.map(async (subject) => {
      try {
        const rawPoints = await api<unknown>(`/subjects/${subject.id}/points`);
        const points = asArray<unknown>(rawPoints).map(mapPoint);
        return { ...subject, points };
      } catch {
        return subject;
      }
    }));
    setSubjects(withPoints);
    setOpenSubjects(withPoints.length ? [withPoints[0].id] : []);
  };

  const loadSubCategories = async (nextCategoryId: number) => {
    const raw = await api<unknown>(`/categories/${nextCategoryId}/subcategories`);
    const mapped = asArray<unknown>(raw).map((item) => {
      const data = (item || {}) as Record<string, unknown>;
      return {
        id: getId(data),
        name: getName(data),
        categoryId: nextCategoryId,
      };
    });

    setSubCategories(mapped);
    if (mapped.length) {
      setSubCategoryId(mapped[0].id);
      setSubCategory(mapped[0].name);
    } else {
      setSubCategoryId(null);
      setSubCategory("");
    }
  };

  const loadCategories = async (nextTeamId: number) => {
    const rawCategories = await api<unknown>(`/teams/${nextTeamId}/categories`);
    const mapped = asArray<unknown>(rawCategories).map((item) => {
      const data = (item || {}) as Record<string, unknown>;
      return {
        id: getId(data),
        name: getName(data),
        teamId: nextTeamId,
        hasSubCategories: Boolean(data.hasSubCategories),
      };
    });

    setCategories(mapped);

    if (mapped.length) {
      const first = mapped[0];
      setCategoryId(first.id);
      setCategory(first.name);

      if (first.hasSubCategories) {
        await loadSubCategories(first.id);
      } else {
        setSubCategories([]);
        setSubCategoryId(null);
        setSubCategory("");
      }

      await loadSubjects(first.id);
    } else {
      setCategoryId(null);
      setCategory("");
      setSubCategories([]);
      setSubCategoryId(null);
      setSubCategory("");
      setSubjects([]);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true); setError("");
      try {
        const rawTeams = await api<unknown>("/teams");
        const mappedTeams = asArray<unknown>(rawTeams).map((item) => ({ id: getId(item), name: getName(item) }));
        setTeams(mappedTeams);
        if (mappedTeams.length) { const firstTeam = mappedTeams[0]; setTeamId(firstTeam.id); setProject(firstTeam.name); await loadCategories(firstTeam.id); }
      } catch (err) { setError(err instanceof Error ? err.message : "Unable to load data"); }
      finally { setLoading(false); }
    };
    void loadInitialData();
  }, []);

  const handleTeamChange = async (nextTeamId: number) => {
    const selected = teams.find((team) => team.id === nextTeamId);
    setTeamId(nextTeamId);
    setProject(selected?.name || "");
    setError("");

    try {
      await loadCategories(nextTeamId);
    } catch (err) {
      setCategories([]);
      setCategoryId(null);
      setCategory("");
      setSubCategories([]);
      setSubCategoryId(null);
      setSubCategory("");
      setSubjects([]);
      setError(err instanceof Error ? err.message : "Unable to load categories");
    }
  };

  const handleCategoryChange = async (nextCategoryId: number) => {
    const selected = categories.find((item) => item.id === nextCategoryId);
    setCategoryId(nextCategoryId);
    setCategory(selected?.name || "");
    setSubCategories([]);
    setSubCategoryId(null);
    setSubCategory("");
    setError("");

    try {
      if (selected?.hasSubCategories) {
        await loadSubCategories(nextCategoryId);
      }
      await loadSubjects(nextCategoryId);
    } catch (err) {
      setSubjects([]);
      setError(err instanceof Error ? err.message : "Unable to load category");
    }
  };

  const toggleSubject = (id: number) => setOpenSubjects((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);

  const handleAddTeam = async () => {
    const name = teamName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");

    try {
      const raw = await api<unknown>("/teams", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const data = (unwrapData(raw) || {}) as Record<string, unknown>;
      const newTeam: Team = {
        id: getId(data),
        name: getName(data) || name,
      };

      if (!newTeam.id) throw new Error("Team was created but no team id was returned");

      setTeams((prev) => [...prev, newTeam]);
      setTeamId(newTeam.id);
      setProject(newTeam.name);
      setTeamName("");
      setShowTeamModal(false);
      await loadCategories(newTeam.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create team/project");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const name = categoryName.trim();
    if (!name || !teamId || saving) return;
    setSaving(true);
    setError("");

    try {
      const raw = await categoryCreateApi<unknown>(`/teams/${teamId}/categories`, {
        method: "POST",
        body: JSON.stringify({
          name,
        }),
      });
      const data = (unwrapData(raw) || {}) as Record<string, unknown>;
      const newCategory: Category = {
        id: getId(data),
        name: getName(data) || name,
        teamId,
        hasSubCategories: Boolean(data.hasSubCategories),
      };

      if (!newCategory.id) throw new Error("Category was created but no category id was returned");

      setCategories((prev) => [...prev, newCategory]);
      setCategoryId(newCategory.id);
      setCategory(newCategory.name);
      setSubCategories([]);
      setSubCategoryId(null);
      setSubCategory("");
      setCategoryName("");
      setShowCategoryModal(false);
      await loadSubjects(newCategory.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create category");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubCategory = async () => {
    const name = subCategoryName.trim();
    if (!name || !categoryId || saving) return;
    setSaving(true);
    setError("");

    try {
      const raw = await api<unknown>(`/categories/${categoryId}/subcategories`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      const data = (unwrapData(raw) || {}) as Record<string, unknown>;
      const newSubCategory: SubCategory = {
        id: getId(data),
        name: getName(data) || name,
        categoryId,
      };

      if (!newSubCategory.id) throw new Error("Sub category was created but no id was returned");

      setSubCategories((prev) => [...prev, newSubCategory]);
      setSubCategoryId(newSubCategory.id);
      setSubCategory(newSubCategory.name);
      setCategories((prev) =>
        prev.map((item) => item.id === categoryId ? { ...item, hasSubCategories: true } : item)
      );
      setSubCategoryName("");
      setShowSubCategoryModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create sub category");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubject = async () => {
    const name = subjectName.trim();
    if (!name || !categoryId || saving) return;
    setSaving(true); setError("");
    try { await api(`/categories/${categoryId}/subjects`, { method: "POST", body: JSON.stringify({ name }) }); await loadSubjects(categoryId); setSubjectName(""); setShowSubjectModal(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to create subject"); }
    finally { setSaving(false); }
  };

  const handleDeleteSubject = (id: number) => {
    // No DELETE subject endpoint was provided in the API collection.
    setSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setOpenSubjects((prev) => prev.filter((item) => item !== id));
  };

  const startEdit = (subject: Subject) => { setEditingId(subject.id); setEditName(subject.title); };

  const saveEdit = async (id: number) => {
    const name = editName.trim();
    if (!name || saving) return;
    setSaving(true); setError("");
    try {
      await api(`/subjects/${id}`, { method: "PATCH", body: JSON.stringify({ name, status: "TODO" }) });
      setSubjects((prev) => prev.map((item) => item.id === id ? { ...item, title: name } : item));
      setEditingId(null); setEditName("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update subject"); }
    finally { setSaving(false); }
  };

  const openPointForm = (subjectId: number) => {
    setPointSubjectId(subjectId); setPointName(""); setPointRemark("");
    if (!openSubjects.includes(subjectId)) setOpenSubjects((prev) => [...prev, subjectId]);
  };

  const handleAddPoint = async () => {
    if (!pointSubjectId || !pointName.trim() || saving || !categoryId) return;
    const title = pointName.trim(); const remark = pointRemark.trim() || "";
    setSaving(true); setError("");
    try {
      const rawPoint = await api<unknown>(
        `/subjects/${pointSubjectId}/points`,
        {
          method: "POST",
          body: JSON.stringify({ name: title }),
        }
      );

      // const created = mapPoint(rawPoint);

      // // Save the HA remark against the newly-created point.
      // if (created.id) {
      //   await api(`/points/${created.id}/remarks`, {
      //     method: "POST",
      //     body: JSON.stringify({
      //       remark,
      //       remarkBy: "HA",
      //     }),
      //   });
      // }
      await loadSubjects(categoryId); setPointName(""); setPointRemark(""); setPointSubjectId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create point"); }
    finally { setSaving(false); }
  };

  const deletePoint = (subjectId: number, pointId: number) => {
    // No DELETE point endpoint was provided in the API collection.
    setSubjects((prev) => prev.map((subject) => subject.id === subjectId ? { ...subject, points: subject.points.filter((point) => point.id !== pointId) } : subject));
    setSelectedPoint(null);
  };

  const formatRemarkDate = (value?: string) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return (
      date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  return (
    <main className="min-h-screen  text-white">
      {/* COMPACT APP */}
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px]  shadow-2xl sm:max-w-[600px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1200px]">
        {/* Top bar */}
        {/* <div className="flex h-[42px] items-center justify-center">
          <div className="h-2 w-40 rounded-full bg-[#536579]" />
        </div> */}

        {/* Portal */}
        <div className=" mb-2 mt-2 overflow-hidden rounded-[22px] bg-[#263746]">

          {/* HEADER */}
          <header className="flex h-[58px] items-center border-b-2 border-[#9aa9b6] bg-[#536679] px-4">
            <h1 className="text-[21px] font-normal">User Portal</h1>
          </header>

          <section className="px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {/* WORK / PROJECT / TEAM */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[14px] font-bold text-[#d9e0e5] lg:text-[18px]">
                    Select Work / Project / Team
                  </label>
                  <button
                    type="button"
                    onClick={() => { setTeamName(""); setShowTeamModal(true); }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#50bbaa] text-[#20303c] transition hover:bg-[#6bd0bf]"
                    title="Add Work / Project / Team"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={teamId ?? ""}
                    onChange={(e) => void handleTeamChange(Number(e.target.value))}
                    disabled={loading || teams.length === 0}
                    className="h-[43px] w-full appearance-none rounded-md border-2 border-[#aebbc5] bg-[#263746] px-3 pr-9 text-[15px] text-white outline-none focus:border-[#54baff] disabled:opacity-60 lg:text-[16px]"
                  >
                    {teams.length === 0 ? (
                      <option value="">No work / project / team available</option>
                    ) : (
                      teams.map((team) => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))
                    )}
                  </select>
                  <SelectArrow />
                </div>
              </div>

              {/* CATEGORY */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[14px] font-bold text-[#d9e0e5] lg:text-[18px]">
                    Select Category
                  </label>
                  <button
                    type="button"
                    onClick={() => { setCategoryName(""); setShowCategoryModal(true); }}
                    disabled={!teamId}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#50bbaa] text-[#20303c] transition hover:bg-[#6bd0bf] disabled:cursor-not-allowed disabled:opacity-40"
                    title="Add Category"
                  >
                    <PlusIcon size={14} />
                  </button>

                </div>

                <div className="relative">
                  <select
                    value={categoryId ?? ""}
                    onChange={(e) => void handleCategoryChange(Number(e.target.value))}
                    disabled={loading || categories.length === 0}
                    className="h-[43px] w-full appearance-none rounded-md border-2 border-[#aebbc5] bg-[#263746] px-3 pr-9 text-[15px] text-white outline-none focus:border-[#54baff] disabled:opacity-60 lg:text-[16px]"
                  >
                    {categories.length === 0 ? (
                      <option value="">No category available</option>
                    ) : (
                      categories.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))
                    )}
                  </select>
                  <SelectArrow />
                </div>
              </div>

              {/* SUB CATEGORY */}
              {/* {categoryId && categories.find((item) => item.id === categoryId)?.hasSubCategories && ( */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block text-[14px] font-bold text-[#d9e0e5] lg:text-[18px]">
                    Select Sub Category
                  </label>
                  <button
                    type="button"
                    onClick={() => { setSubCategoryName(""); setShowSubCategoryModal(true); }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#50bbaa] text-[#20303c] transition hover:bg-[#6bd0bf]"
                    title="Add Sub Category"
                  >
                    <PlusIcon size={14} />
                  </button>
                </div>

                {/* {categories.find((item) => item.id === categoryId)?.hasSubCategories && ( */}
                <div className="relative">
                  <select
                    value={subCategoryId ?? ""}
                    onChange={(e) => {
                      const nextId = Number(e.target.value);
                      const selected = subCategories.find(
                        (item) => item.id === nextId
                      );

                      setSubCategoryId(nextId);
                      setSubCategory(selected?.name || "");
                    }}
                    disabled={subCategories.length === 0}
                    className="h-[43px] w-full appearance-none rounded-md border-2 border-[#aebbc5] bg-[#263746] px-3 pr-9 text-[15px] text-white outline-none focus:border-[#54baff] disabled:opacity-60 lg:text-[16px]"
                  >
                    {subCategories.length === 0 ? (
                      <>
                        <option value="">No sub category available</option>
                        <button
                          type="button"
                          onClick={() => { setSubCategoryName(""); setShowSubCategoryModal(true); }}
                          className="flex shrink-0 p-1 items-center justify-center rounded bg-[#50bbaa] text-[#20303c] transition hover:bg-[#6bd0bf]"
                          title="Add Sub Category"
                        >
                          Add Sub Category
                        </button>
                      </>
                    ) : (
                      subCategories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))
                    )}
                  </select>

                  <SelectArrow />
                </div>
                {/* )} */}
              </div>
              {/* )} */}
            </div>



            {error && (
              <div className="mb-3 rounded-md border border-red-300/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}

            {loading && (
              <div className="mb-3 rounded-md bg-black/10 px-3 py-2 text-xs text-white/60">
                Loading teams, categories, subjects and points...
              </div>
            )}

            {/* SUBJECT TITLE */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[21px] font-bold">Subjects :</h2>

              <button
                type="button"
                onClick={() => setShowSubjectModal(true)}
                className="flex h-5 w-5 items-center justify-center rounded bg-[#50bbaa] text-[#20303c] transition hover:bg-[#6bd0bf] active:scale-90"
                title="Add Subject"
              >
                <PlusIcon size={19} />
              </button>
            </div>

            {/* SUBJECT LIST */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
              {subjects.map((subject) => {
                const isOpen = openSubjects.includes(subject.id);

                return (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    isOpen={isOpen}
                    editing={editingId === subject.id}
                    editName={editName}
                    setEditName={setEditName}
                    onToggle={() => toggleSubject(subject.id)}
                    onEdit={() => startEdit(subject)}
                    onSaveEdit={() => saveEdit(subject.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onAddPoint={() => openPointForm(subject.id)}
                    onDelete={() => handleDeleteSubject(subject.id)}
                    onInfo={(point) => setSelectedPoint(point)}
                    onDeletePoint={(pointId) =>
                      deletePoint(subject.id, pointId)
                    }
                  />
                );
              })}
            </div>

            {/* Empty */}
            {subjects.length === 0 && (
              <div className="rounded border border-dashed border-white/20 py-8 text-center text-sm text-white/50">
                No subjects available
              </div>
            )}
          </section>
        </div>
      </div>

      {/* -------------------------
          ADD WORK / PROJECT / TEAM MODAL
      ------------------------- */}
      {showTeamModal && (
        <Modal>
          <h2 className="mb-4 text-lg font-bold">Add Work / Project / Team</h2>
          <input
            autoFocus
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddTeam();
              if (e.key === "Escape") setShowTeamModal(false);
            }}
            placeholder="Enter work / project / team name"
            className="h-11 w-full rounded-md border border-white/30 bg-[#1e2d39] px-3 text-sm outline-none focus:border-[#54baff]"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 rounded-md border border-white/20 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => void handleAddTeam()} disabled={!teamName.trim() || saving} className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d] disabled:opacity-50">{saving ? "Adding..." : "Add"}</button>
          </div>
        </Modal>
      )}

      {/* -------------------------
          ADD CATEGORY MODAL
      ------------------------- */}
      {showCategoryModal && (
        <Modal>
          <h2 className="mb-4 text-lg font-bold">Add Category</h2>
          <input
            autoFocus
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddCategory();
              if (e.key === "Escape") setShowCategoryModal(false);
            }}
            placeholder="Enter category name"
            className="h-11 w-full rounded-md border border-white/30 bg-[#1e2d39] px-3 text-sm outline-none focus:border-[#54baff]"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 rounded-md border border-white/20 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => void handleAddCategory()} disabled={!categoryName.trim() || !teamId || saving} className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d] disabled:opacity-50">{saving ? "Adding..." : "Add"}</button>
          </div>
        </Modal>
      )}

      {/* -------------------------
          ADD SUB CATEGORY MODAL
      ------------------------- */}
      {showSubCategoryModal && (
        <Modal>
          <h2 className="mb-4 text-lg font-bold">Add Sub Category</h2>
          <input
            autoFocus
            value={subCategoryName}
            onChange={(e) => setSubCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddSubCategory();
              if (e.key === "Escape") setShowSubCategoryModal(false);
            }}
            placeholder="Enter sub category name"
            className="h-11 w-full rounded-md border border-white/30 bg-[#1e2d39] px-3 text-sm outline-none focus:border-[#54baff]"
          />
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setShowSubCategoryModal(false)} className="flex-1 rounded-md border border-white/20 py-2 text-sm">Cancel</button>
            <button type="button" onClick={() => void handleAddSubCategory()} disabled={!subCategoryName.trim() || !categoryId || saving} className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d] disabled:opacity-50">{saving ? "Adding..." : "Add"}</button>
          </div>
        </Modal>
      )}

      {/* -------------------------
          ADD SUBJECT MODAL
      ------------------------- */}

      {showSubjectModal && (
        <Modal>
          <h2 className="mb-4 text-lg font-bold">Add Subject</h2>

          <input
            autoFocus
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubject();

              if (e.key === "Escape") {
                setShowSubjectModal(false);
              }
            }}
            placeholder="Enter subject name"
            className="h-11 w-full rounded-md border border-white/30 bg-[#1e2d39] px-3 text-sm outline-none focus:border-[#54baff]"
          />

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowSubjectModal(false)}
              className="flex-1 rounded-md border border-white/20 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleAddSubject}
              className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d]"
            >
              Add
            </button>
          </div>
        </Modal>
      )}

      {/* -------------------------
          ADD POINT MODAL
      ------------------------- */}

      {pointSubjectId !== null && (
        <Modal>
          <h2 className="mb-4 text-lg font-bold">Add Point</h2>

          <textarea
            autoFocus
            value={pointName}
            onChange={(e) => setPointName(e.target.value)}
            placeholder="Point title"
            className="mb-3 h-32 w-full rounded-md border border-white/30 bg-[#1e2d39] px-3 text-sm outline-none focus:border-[#54baff]"
          />

          {/* <textarea
            value={pointRemark}
            onChange={(e) => setPointRemark(e.target.value)}
            placeholder="HA Remark"
            rows={3}
            className="w-full resize-none rounded-md border border-white/30 bg-[#1e2d39] px-3 py-2 text-sm outline-none focus:border-[#54baff]"
          /> */}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setPointSubjectId(null)}
              className="flex-1 rounded-md border border-white/20 py-2 text-sm"
            >
              Cancel
            </button>

            <button
              onClick={handleAddPoint}
              className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d]"
            >
              Add Point
            </button>
          </div>
        </Modal>
      )}

      {/* -------------------------
          POINT INFO MODAL
      ------------------------- */}

      {
        selectedPoint && (
          <Modal>
            <div className="max-h-[90dvh] overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
              {/* HEADER */}
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold">
                  Point Information
                </h2>

                <button
                  type="button"
                  onClick={() => setSelectedPoint(null)}
                  className="text-2xl text-white/60 hover:text-white"
                >
                  ×
                </button>
              </div>

              {/* CONTENT */}
              <div className="mt-3">
                <PointInfoModal
                  point={selectedPoint}
                  formatRemarkDate={formatRemarkDate}
                />
              </div>

              {/* CLOSE */}
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="mt-4 w-full rounded bg-[#50bbaa] py-3 text-sm font-bold text-[#17242d]"
              >
                Close
              </button>
            </div>
          </Modal>
        )
      }
    </main>
  );
}

/* =====================================================
   SUBJECT CARD
===================================================== */

function SubjectCard({
  subject,
  isOpen,
  editing,
  editName,
  setEditName,
  onToggle,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onAddPoint,
  onDelete,
  onInfo,
  onDeletePoint,
}: {
  subject: Subject;
  isOpen: boolean;
  editing: boolean;
  editName: string;
  setEditName: (value: string) => void;
  onToggle: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onAddPoint: () => void;
  onDelete: () => void;
  onInfo: (point: Point) => void;
  onDeletePoint: (pointId: number) => void;
}) {
  const colors = {
    yellow: {
      border: "border-[#d3a900]",
      bg: "bg-[#705600]",
    },
    green: {
      border: "border-[#009f8e]",
      bg: "bg-[#006d63]",
    },
    red: {
      border: "border-[#df003c]",
      bg: "bg-[#870027]",
    },
  };

  const current = colors[subject.color];

  return (
    <div className={`overflow-hidden border-2 ${current.border}`}>
      {/* SUBJECT HEADER */}
      <div className={`px-3 py-2 ${current.bg}`}>
        {editing ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();

                if (e.key === "Escape") onCancelEdit();
              }}
              className="min-w-0 flex-1 rounded border border-white/30 bg-black/20 px-2 py-1 text-sm outline-none"
            />

            <button
              onClick={onSaveEdit}
              className="rounded bg-white/20 px-2 text-xs hover:bg-white/30"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* CLICK TITLE TO COLLAPSE */}
            <button
              type="button"
              onClick={onToggle}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="truncate text-[15px] leading-5">
                {subject.title}
              </h3>

              <p className="text-[10px] text-white/80">
                {subject.date}
              </p>
            </button>

            {/* EDIT */}
            <button
              type="button"
              onClick={onEdit}
              className="shrink-0 text-[#55baff] transition hover:scale-110"
              title="Edit"
            >
              <PencilIcon />
            </button>

            {/* ADD POINT */}
            <button
              type="button"
              onClick={onAddPoint}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#9700ff] text-white transition hover:scale-110"
              title="Add Point"
            >
              <PlusIcon size={17} />
            </button>


          </div>
        )}
      </div>

      {/* POINT AREA */}
      {isOpen && (
        <div className="bg-[#2b3c4c] px-3">
          {subject.points.length === 0 ? (
            <div className="py-4 text-center text-xs text-white/40">
              No points added
            </div>
          ) : (
            subject.points.map((point, index) => (
              <div
                key={point.id}
                className="relative flex gap-2 py-3"
              >
                {/* Timeline */}
                <div className="relative flex w-5 shrink-0 justify-center">
                  {index < subject.points.length - 1 && (
                    <div className="absolute left-1/2 top-5 h-full w-[2px] -translate-x-1/2 bg-[#b8c2c9]" />
                  )}

                  <div className="z-10 mt-1 h-4 w-4 rounded-full border-2 border-[#d0a900] bg-[#2b3c4c]" />
                </div>

                {/* Point */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => onInfo(point)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-[14px] leading-5 text-[#58baff] text-justify">
                        {point.title}
                      </p>


                    </button>

                    {/* INFO */}
                    <button
                      type="button"
                      onClick={() => onInfo(point)}
                      className="shrink-0 text-[#e99a9e]"
                      title="Information"
                    >
                      <InfoIcon />
                    </button>
                  </div>

                  {point.remarks?.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {point.remarks.map(
                        (remark, remarkIndex) => (
                          <div
                            key={
                              remark.id ??
                              `${point.id}-remark-${remarkIndex}`
                            }
                            className="rounded bg-black/10 px-2 py-1"
                          >

                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-[#50bbaa]">
                                {remark.remarkBy
                                  ? `${remark.remarkBy} Remarks`
                                  : "HA Remarks"}
                              </span>

                              {(remark.createdAt ||
                                remark.created_at) && (
                                  <span className="text-[9px] text-white/40">
                                    {formatRemarkDate(
                                      remark.createdAt ??
                                      remark.created_at
                                    )}
                                  </span>
                                )}
                            </div>

                            {/* <p className="text-[10px] font-semibold text-[#50bbaa]">
                                  {remark.remarkBy || "HA"}
                                  {(remark.createdAt ||
                                    remark.created_at) &&
                                    ` • ${formatRemarkDate(
                                      remark.createdAt ||
                                      remark.created_at
                                    )}`}
                                </p> */}
                            {/* <p className="text-[11px] leading-4 text-[#c8d0d5]">
                                  {remark.remark}
                                </p> */}
                            <p className="mt-1 text-[11px] leading-4 text-white/80">
                              {remark.remark}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    ""
                    // <p className="text-[11px] leading-4 text-[#c8d0d5]">
                    //   HA Remark : No remark
                    // </p>
                  )}
                </div>
              </div>
            ))
          )}

          {/* COLLAPSE */}
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full justify-center py-2 text-white/80 transition hover:scale-110"
            title="Collapse"
          >
            <UpIcon />
          </button>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   MODAL
===================================================== */

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-[380px] rounded-xl border border-white/10 bg-[#263746] p-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* =====================================================
   DATE
===================================================== */

function getCurrentDate() {
  const date = new Date();

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) +
    " " +
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
}

/* =====================================================
   ICONS
===================================================== */

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M12 10v7"
        stroke="#2b3c4c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7" r="1.2" fill="#2b3c4c" />
    </svg>
  );
}

function UpIcon() {
  return (
    <svg
      width="29"
      height="19"
      viewBox="0 0 29 19"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 15 10.5-11L25 15" />
    </svg>
  );
}

function SelectArrow() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
    >
      <path d="m7 10 5-5 5 5" />
      <path d="m7 14 5 5 5-5" />
    </svg>
  );
}