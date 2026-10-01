"use client";

import { useEffect, useState } from "react";
import PointInfoModal from "../components/PointInfoModal";
import formatRemarkDate from "../components/date_formate";
import AITextActions from "../components/AITextActions";

type Team = {
    id: number;
    name: string;
};

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

type Subject = {
    id: number;
    title: string;
    date: string;
    color: "yellow" | "green" | "red";
    points: Point[];
};

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL;

/* ---------------------------------------------------------
   API
--------------------------------------------------------- */

async function api<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(
        `${API_BASE_URL}${path}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options?.headers || {}),
            },
        }
    );

    if (!response.ok) {
        const message = await response.text().catch(() => "");

        throw new Error(
            message ||
            `API request failed: ${response.status}`
        );
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

/* ---------------------------------------------------------
   RESPONSE HELPERS
--------------------------------------------------------- */

function asArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (
        value &&
        typeof value === "object"
    ) {
        const record =
            value as Record<string, unknown>;

        for (const key of [
            "data",
            "items",
            "results",
            "teams",
            "categories",
            "subjects",
            "points",
        ]) {
            if (Array.isArray(record[key])) {
                return record[key] as T[];
            }
        }
    }

    return [];
}

function unwrapData(value: unknown): unknown {
    if (
        value &&
        typeof value === "object"
    ) {
        const record =
            value as Record<string, unknown>;

        if (
            "data" in record &&
            record.data !== undefined
        ) {
            return record.data;
        }
    }

    return value;
}

function getId(value: unknown): number {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        return Number(value);
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Number(
            (value as Record<string, unknown>).id
        );
    }

    return 0;
}

function getName(value: unknown): string {
    const item =
        (value || {}) as Record<string, unknown>;

    return String(
        item.name ??
        item.title ??
        ""
    );
}

function getDate(value: unknown): string {
    const item =
        (value || {}) as Record<string, unknown>;

    const raw =
        item.createdAt ??
        item.created_at ??
        item.date ??
        item.updatedAt;

    if (!raw) {
        return currentDate();
    }

    const date = new Date(String(raw));

    if (Number.isNaN(date.getTime())) {
        return String(raw);
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
}

function currentDate() {
    const date = new Date();

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
}

/* ---------------------------------------------------------
   API MAPPERS
--------------------------------------------------------- */

function mapPoint(value: unknown): Point {
    const unwrapped = unwrapData(value);

    const item =
        (unwrapped || {}) as Record<string, unknown>;

    const rawRemarks = Array.isArray(item.remarks)
        ? item.remarks
        : [];

    const remarks: Remark[] =
        rawRemarks.map((remark) => {
            const r =
                (remark || {}) as Record<
                    string,
                    unknown
                >;

            return {
                id:
                    r.id != null
                        ? Number(r.id)
                        : undefined,

                remark: String(
                    r.remark ?? ""
                ),

                remarkBy: String(
                    r.remarkBy ?? ""
                ),

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
        item.remark ??
        item.haRemark ??
        ""
    );

    const fallbackRemarkBy = String(
        item.remarkBy ??
        "HA"
    );

    const finalRemarks: Remark[] =
        remarks.length > 0
            ? remarks
            : fallbackRemark
                ? [
                    {
                        remark:
                            fallbackRemark,
                        remarkBy:
                            fallbackRemarkBy,
                    },
                ]
                : [];

    const haRemarks =
        finalRemarks.filter(
            (remark) =>
                remark.remarkBy
                    .toUpperCase() === "HA"
        );

    const selectedRemark =
        haRemarks.length > 0
            ? haRemarks[
            haRemarks.length - 1
            ]
            : finalRemarks[
            finalRemarks.length - 1
            ];

    const formatDate = (
        date: unknown
    ) => {
        if (!date) return "";

        const d =
            new Date(String(date));

        if (
            Number.isNaN(d.getTime())
        ) {
            return String(date);
        }

        const pad = (n: number) =>
            String(n).padStart(2, "0");

        return `${pad(d.getDate())}-${pad(
            d.getMonth() + 1
        )}-${d.getFullYear()} ${pad(
            d.getHours()
        )}:${pad(d.getMinutes())}`;
    };

    return {
        id: getId(item.id),

        title: String(
            item.name ??
            item.title ??
            ""
        ),

        remark: String(
            selectedRemark?.remark ??
            ""
        ),

        remarkBy: String(
            selectedRemark?.remarkBy ??
            ""
        ),

        remarks: finalRemarks,

        createdAt: formatDate(
            item.createdAt
        ),

        updatedAt: formatDate(
            item.updatedAt
        ),
    };
}

function mapSubject(
    value: unknown,
    index: number
): Subject {
    const item =
        (value || {}) as Record<
            string,
            unknown
        >;

    const status = String(
        item.status ?? ""
    ).toUpperCase();

    let color: Subject["color"];

    if (status === "DONE") {
        color = "green";
    } else if (status === "TODO") {
        color = "yellow";
    } else {
        color =
            index === 0
                ? "yellow"
                : index === 3
                    ? "red"
                    : "green";
    }

    return {
        id: getId(item.id),

        title: String(
            item.name ??
            item.title ??
            ""
        ),

        date: getDate(item),

        color,

        points: [],
    };
}

/* ---------------------------------------------------------
   MAIN HA PORTAL
--------------------------------------------------------- */

export default function HAPortal() {
    const [teams, setTeams] =
        useState<Team[]>([]);

    const [categories, setCategories] =
        useState<Category[]>([]);

    const [teamId, setTeamId] =
        useState<number | null>(null);

    const [categoryId, setCategoryId] =
        useState<number | null>(null);

    const [subCategories, setSubCategories] =
        useState<SubCategory[]>([]);

    const [subCategoryId, setSubCategoryId] =
        useState<number | null>(null);

    const [subCategory, setSubCategory] =
        useState("");

    const [subjects, setSubjects] =
        useState<Subject[]>([]);

    const [openSubjects, setOpenSubjects] =
        useState<number[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [loadingSubjects, setLoadingSubjects] =
        useState(false);

    const [error, setError] =
        useState("");

    const [selectedPoint, setSelectedPoint] =
        useState<Point | null>(null);

    /* -------------------------------------------------------
       REMARK STATE
    ------------------------------------------------------- */

    const [remarkPoint, setRemarkPoint] =
        useState<Point | null>(null);

    const [remarkText, setRemarkText] =
        useState("");

    const [savingRemark, setSavingRemark] =
        useState(false);

    // AI remark enhancement
    // Original remark for Undo
    const [
        originalRemarkText,
        setOriginalRemarkText,
    ] = useState("");

    /* -------------------------------------------------------
       LOAD SUBJECTS + POINTS
    ------------------------------------------------------- */

    const loadSubjects = async (
        nextCategoryId: number,
        nextSubCategoryId:
            number | null = null
    ) => {
        setLoadingSubjects(true);

        try {
            const endpoint =
                nextSubCategoryId
                    ? `/categories/${nextSubCategoryId}/subjects`
                    : `/categories/${nextCategoryId}/subjects`;

            const rawSubjects =
                await api<unknown>(
                    endpoint
                );

            const mappedSubjects =
                asArray<unknown>(
                    rawSubjects
                ).map(mapSubject);

            const subjectsWithPoints =
                await Promise.all(
                    mappedSubjects.map(
                        async (subject) => {
                            try {
                                const rawPoints =
                                    await api<unknown>(
                                        `/subjects/${subject.id}/points`
                                    );

                                return {
                                    ...subject,

                                    points:
                                        asArray<unknown>(
                                            rawPoints
                                        ).map(
                                            mapPoint
                                        ),
                                };
                            } catch {
                                return subject;
                            }
                        }
                    )
                );

            setSubjects(
                subjectsWithPoints
            );

            setOpenSubjects(
                subjectsWithPoints.length
                    ? [
                        subjectsWithPoints[0]
                            .id,
                    ]
                    : []
            );
        } finally {
            setLoadingSubjects(false);
        }
    };

    /* -------------------------------------------------------
       LOAD SUB CATEGORIES
    ------------------------------------------------------- */

    const loadSubCategories = async (
        nextCategoryId: number
    ) => {
        const rawSubCategories =
            await api<unknown>(
                `/categories/${nextCategoryId}/subcategories`
            );

        const mappedSubCategories =
            asArray<unknown>(
                rawSubCategories
            ).map((item) => {
                const data =
                    (item || {}) as Record<
                        string,
                        unknown
                    >;

                return {
                    id: getId(data),
                    name: getName(data),
                    categoryId:
                        nextCategoryId,
                };
            });

        setSubCategories(
            mappedSubCategories
        );

        setSubCategoryId(null);
        setSubCategory("");

        setSubjects([]);
        setOpenSubjects([]);
    };

    /* -------------------------------------------------------
       LOAD CATEGORIES
    ------------------------------------------------------- */

    const loadCategories = async (
        nextTeamId: number
    ) => {
        const rawCategories =
            await api<unknown>(
                `/teams/${nextTeamId}/categories`
            );

        const mappedCategories =
            asArray<unknown>(
                rawCategories
            ).map((item) => {
                const data =
                    (item || {}) as Record<
                        string,
                        unknown
                    >;

                return {
                    id: getId(data),
                    name: getName(data),
                    teamId:
                        nextTeamId,
                    hasSubCategories:
                        Boolean(
                            data.hasSubCategories
                        ),
                };
            });

        setCategories(
            mappedCategories
        );

        setCategoryId(null);
        setSubCategories([]);
        setSubCategoryId(null);
        setSubCategory("");
        setSubjects([]);
        setOpenSubjects([]);
    };

    /* -------------------------------------------------------
       INITIAL LOAD
    ------------------------------------------------------- */

    useEffect(() => {
        const loadInitialData =
            async () => {
                setLoading(true);
                setError("");

                try {
                    const rawTeams =
                        await api<unknown>(
                            "/teams"
                        );

                    const mappedTeams =
                        asArray<unknown>(
                            rawTeams
                        ).map(
                            (item) => ({
                                id: getId(item),
                                name: getName(
                                    item
                                ),
                            })
                        );

                    setTeams(
                        mappedTeams
                    );

                    setTeamId(null);
                    setCategories([]);
                    setCategoryId(null);
                    setSubCategories([]);
                    setSubCategoryId(null);
                    setSubCategory("");
                    setSubjects([]);
                    setOpenSubjects([]);
                } catch (err) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to load HA Portal"
                    );
                } finally {
                    setLoading(false);
                }
            };

        void loadInitialData();
    }, []);

    /* -------------------------------------------------------
       TEAM CHANGE
    ------------------------------------------------------- */

    const handleTeamChange = async (
        nextTeamId: number
    ) => {
        setTeamId(nextTeamId);
        setCategoryId(null);
        setSubCategories([]);
        setSubCategoryId(null);
        setSubCategory("");
        setSubjects([]);
        setError("");

        try {
            await loadCategories(
                nextTeamId
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to load categories"
            );
        }
    };

    /* -------------------------------------------------------
       CATEGORY CHANGE
    ------------------------------------------------------- */

    const handleCategoryChange =
        async (
            nextCategoryId: number
        ) => {
            const selectedCategory =
                categories.find(
                    (item) =>
                        item.id ===
                        nextCategoryId
                );

            setCategoryId(
                nextCategoryId
            );

            setSubCategories([]);
            setSubCategoryId(null);
            setSubCategory("");
            setSubjects([]);
            setOpenSubjects([]);
            setError("");

            if (!selectedCategory) {
                return;
            }

            try {
                if (
                    selectedCategory.hasSubCategories
                ) {
                    await loadSubCategories(
                        nextCategoryId
                    );
                } else {
                    await loadSubjects(
                        nextCategoryId,
                        null
                    );
                }
            } catch (err) {
                setSubCategories([]);
                setSubjects([]);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load category"
                );
            }
        };

    /* -------------------------------------------------------
       SUB CATEGORY CHANGE
    ------------------------------------------------------- */

    const handleSubCategoryChange =
        async (
            nextSubCategoryId: number
        ) => {
            const selectedSubCategory =
                subCategories.find(
                    (item) =>
                        item.id ===
                        nextSubCategoryId
                );

            setSubCategoryId(
                nextSubCategoryId
            );

            setSubCategory(
                selectedSubCategory?.name ||
                ""
            );

            setSubjects([]);
            setOpenSubjects([]);
            setError("");

            if (
                !categoryId ||
                !selectedSubCategory
            ) {
                return;
            }

            try {
                await loadSubjects(
                    categoryId,
                    nextSubCategoryId
                );
            } catch (err) {
                setSubjects([]);

                setError(
                    err instanceof Error
                        ? err.message
                        : "Unable to load sub category subjects"
                );
            }
        };

    /* -------------------------------------------------------
       SUBJECT OPEN / CLOSE
    ------------------------------------------------------- */

    const toggleSubject = (
        id: number
    ) => {
        setOpenSubjects(
            (previous) =>
                previous.includes(id)
                    ? previous.filter(
                        (item) =>
                            item !== id
                    )
                    : [
                        ...previous,
                        id,
                    ]
        );
    };

    /* -------------------------------------------------------
       OPEN REMARK
    ------------------------------------------------------- */

    const openRemark = (
        point: Point
    ) => {
        setRemarkPoint(point);

        setRemarkText(
            point.remark || ""
        );

        setOriginalRemarkText("");
    };

    /* -------------------------------------------------------
       SAVE REMARK
    ------------------------------------------------------- */

    const saveRemark = async () => {
        if (
            !remarkPoint ||
            !remarkText.trim() ||
            savingRemark
        ) {
            return;
        }

        setSavingRemark(true);
        setError("");

        try {
            const newRemark: Remark = {
                remark:
                    remarkText.trim(),

                remarkBy: "HA",
            };

            // Create NEW remark
            // Existing remarks remain unchanged.
            const rawCreated =
                await api<unknown>(
                    `/points/${remarkPoint.id}/remarks`,
                    {
                        method: "POST",

                        body: JSON.stringify({
                            remark:
                                newRemark.remark,

                            remarkBy:
                                newRemark.remarkBy,
                        }),
                    }
                );

            const created =
                unwrapData(
                    rawCreated
                );

            if (
                created &&
                typeof created ===
                "object"
            ) {
                const item =
                    created as Record<
                        string,
                        unknown
                    >;

                newRemark.id =
                    item.id != null
                        ? Number(
                            item.id
                        )
                        : undefined;

                newRemark.createdAt =
                    item.createdAt !=
                        null
                        ? String(
                            item.createdAt
                        )
                        : item.created_at !=
                            null
                            ? String(
                                item.created_at
                            )
                            : undefined;

                newRemark.created_at =
                    item.created_at !=
                        null
                        ? String(
                            item.created_at
                        )
                        : undefined;
            }

            // Append new remark
            setSubjects(
                (previous) =>
                    previous.map(
                        (subject) => ({
                            ...subject,

                            points:
                                subject.points.map(
                                    (point) =>
                                        point.id ===
                                            remarkPoint.id
                                            ? {
                                                ...point,

                                                remark:
                                                    newRemark.remark,

                                                remarkBy:
                                                    "HA",

                                                remarks:
                                                    [
                                                        ...(point.remarks ||
                                                            []),

                                                        newRemark,
                                                    ],
                                            }
                                            : point
                                ),
                        })
                    )
            );

            // Close modal
            setRemarkPoint(null);

            setRemarkText("");

            setOriginalRemarkText("");

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to save remark"
            );
        } finally {
            setSavingRemark(false);
        }
    };

    /* -------------------------------------------------------
       RENDER
    ------------------------------------------------------- */

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#243747_0%,#0d1720_42%,#070d13_100%)] text-white">
            <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border border-white/[0.06] bg-[#0d1720]/80 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur sm:max-w-[600px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1200px]">

                {/* PORTAL */}
                <div className="mb-2 mt-2 overflow-hidden rounded-[22px] border border-white/[0.06] bg-[#263746]/95 shadow-[0_16px_50px_rgba(0,0,0,0.28)]">

                    {/* HEADER */}
                    <header className="flex h-[68px] items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#18334d] via-[#173a55] to-[#193f5a] px-5 shadow-lg">
                        <h1 className="text-[21px] font-normal">
                            Project Status Tracker
                        </h1>
                    </header>

                    {/* CONTENT */}
                    <section className="px-4 py-4">

                        <div
                            className={`grid grid-cols-1 lg:gap-3 ${categories.find(
                                (item) =>
                                    item.id ===
                                    categoryId
                            )?.hasSubCategories
                                ? "lg:grid-cols-3"
                                : "lg:grid-cols-2"
                                }`}
                        >

                            {/* PROJECT */}
                            <div className="mb-3">
                                <label className="mb-1 block text-[14px] font-bold text-[#d9e0e5]">
                                    Select Project
                                </label>

                                <div className="relative">
                                    <select
                                        value={
                                            teamId ??
                                            ""
                                        }
                                        onChange={(e) =>
                                            void handleTeamChange(
                                                Number(
                                                    e.target
                                                        .value
                                                )
                                            )
                                        }
                                        disabled={
                                            loading ||
                                            teams.length ===
                                            0
                                        }
                                        className="h-[46px] w-full appearance-none rounded-xl border border-white/10 bg-[#172633] px-3 pr-9 text-[15px] text-white outline-none shadow-inner transition focus:border-[#54baff] focus:ring-2 focus:ring-[#54baff]/15 disabled:opacity-50"
                                    >
                                        <option value="">
                                            Select Project
                                        </option>

                                        {teams.map(
                                            (
                                                team
                                            ) => (
                                                <option
                                                    key={
                                                        team.id
                                                    }
                                                    value={
                                                        team.id
                                                    }
                                                >
                                                    {
                                                        team.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <SelectArrow />
                                </div>
                            </div>

                            {/* CATEGORY */}
                            <div className="mb-3">
                                <label className="mb-1 block text-[14px] font-bold text-[#d9e0e5]">
                                    Select Category
                                </label>

                                <div className="relative">
                                    <select
                                        value={
                                            categoryId ??
                                            ""
                                        }
                                        onChange={(e) =>
                                            void handleCategoryChange(
                                                Number(
                                                    e.target
                                                        .value
                                                )
                                            )
                                        }
                                        disabled={
                                            loading ||
                                            !teamId ||
                                            categories.length ===
                                            0
                                        }
                                        className="h-[46px] w-full appearance-none rounded-xl border border-white/10 bg-[#172633] px-3 pr-9 text-[15px] text-white outline-none shadow-inner transition focus:border-[#54baff] focus:ring-2 focus:ring-[#54baff]/15 disabled:opacity-50"
                                    >
                                        <option value="">
                                            {teamId &&
                                                categories.length ===
                                                0
                                                ? "No categories available"
                                                : "Select Category"}
                                        </option>

                                        {categories.map(
                                            (
                                                item
                                            ) => (
                                                <option
                                                    key={
                                                        item.id
                                                    }
                                                    value={
                                                        item.id
                                                    }
                                                >
                                                    {
                                                        item.name
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <SelectArrow />
                                </div>
                            </div>

                            {/* SUB CATEGORY */}
                            {categories.find(
                                (item) =>
                                    item.id ===
                                    categoryId
                            )?.hasSubCategories && (
                                    <div className="mb-3">
                                        <label className="mb-1 block text-[14px] font-bold text-[#d9e0e5]">
                                            Select Sub Category
                                        </label>

                                        <div className="relative">
                                            <select
                                                value={
                                                    subCategoryId ??
                                                    ""
                                                }
                                                onChange={(e) =>
                                                    void handleSubCategoryChange(
                                                        Number(
                                                            e.target
                                                                .value
                                                        )
                                                    )
                                                }
                                                disabled={
                                                    loading ||
                                                    subCategories.length ===
                                                    0
                                                }
                                                className="h-[46px] w-full appearance-none rounded-xl border border-white/10 bg-[#172633] px-3 pr-9 text-[15px] text-white outline-none shadow-inner transition focus:border-[#54baff] focus:ring-2 focus:ring-[#54baff]/15 disabled:opacity-50"
                                            >
                                                <option value="">
                                                    {subCategories.length ===
                                                        0
                                                        ? "No sub categories available"
                                                        : "Select Sub Category"}
                                                </option>

                                                {subCategories.map(
                                                    (
                                                        item
                                                    ) => (
                                                        <option
                                                            key={
                                                                item.id
                                                            }
                                                            value={
                                                                item.id
                                                            }
                                                        >
                                                            {
                                                                item.name
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>

                                            <SelectArrow />
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* ERROR */}
                        {error && (
                            <div className="mb-3 rounded border border-red-300/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                                {error}
                            </div>
                        )}

                        {/* SUBJECT TITLE */}
                        <div className="mb-3">
                            <h2 className="text-[21px] font-bold">
                                Subjects :
                            </h2>
                        </div>

                        {/* LOADING */}
                        {loadingSubjects && (
                            <div className="mb-3 rounded bg-black/10 px-3 py-2 text-sm text-white/60">
                                Loading subjects...
                            </div>
                        )}

                        {/* SUBJECT LIST */}
                        <div className="space-y-3">
                            {subjects.map(
                                (
                                    subject
                                ) => (
                                    <SubjectCard
                                        key={
                                            subject.id
                                        }
                                        subject={
                                            subject
                                        }
                                        isOpen={openSubjects.includes(
                                            subject.id
                                        )}
                                        onToggle={() =>
                                            toggleSubject(
                                                subject.id
                                            )
                                        }
                                        onRemark={
                                            openRemark
                                        }
                                        onInfo={
                                            setSelectedPoint
                                        }
                                    />
                                )
                            )}
                        </div>

                        {!loadingSubjects &&
                            subjects.length ===
                            0 && (
                                <div className="py-10 text-center text-sm text-white/40">
                                    No subjects available
                                </div>
                            )}
                    </section>
                </div>
            </div>

            {/* ------------------------------------------------
               POINT INFO MODAL
            ------------------------------------------------ */}

            {selectedPoint && (
                <Modal>
                    <div className="max-h-[90dvh] overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">

                        <div className="flex items-start justify-between">
                            <h2 className="text-xl font-bold tracking-tight">
                                Point Information
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPoint(
                                        null
                                    )
                                }
                                className="text-2xl text-white/60 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        <div className="mt-3">
                            <PointInfoModal
                                point={
                                    selectedPoint
                                }
                                formatRemarkDate={
                                    formatRemarkDate
                                }
                            />
                        </div>

                        <div className="mt-5">

                            <button
                                type="button"
                                onClick={() => {
                                    const point =
                                        selectedPoint;

                                    setSelectedPoint(
                                        null
                                    );

                                    openRemark(
                                        point
                                    );
                                }}
                                className="w-full rounded-xl border border-[#e18a00]/70 bg-[#744300]/90 py-3 text-sm font-bold shadow-sm transition hover:bg-[#8a5100]"
                            >
                                Add Remark
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedPoint(
                                        null
                                    )
                                }
                                className="mt-2 w-full rounded-xl bg-[#50bbaa] py-3 text-sm font-bold text-[#17242d] shadow-sm transition hover:bg-[#5cc9b8]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ------------------------------------------------
               REMARK MODAL
            ------------------------------------------------ */}

            {remarkPoint && (
                <Modal>
                    <div className="flex max-h-[90dvh] flex-col">

                        {/* HEADER */}
                        <div className="flex shrink-0 items-start justify-between">

                            <h2 className="text-lg font-bold">
                                HA Remark
                            </h2>

                            <button
                                type="button"
                                onClick={() => {
                                    setRemarkPoint(
                                        null
                                    );

                                    setRemarkText(
                                        ""
                                    );

                                    setOriginalRemarkText(
                                        ""
                                    );

                                }}
                                className="text-xl text-white/60 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        {/* POINT TITLE */}
                        <div className="mt-3 shrink-0 rounded-md bg-black/20 p-3">
                            <p className="text-[14px] text-[#58baff]">
                                {
                                    remarkPoint.title
                                }
                            </p>
                        </div>

                        {/* PREVIOUS REMARKS */}
                        <div className="mt-4 min-h-0 flex-1">

                            <p className="mb-2 text-[13px] font-bold text-white/80">
                                Previous Remarks
                            </p>

                            {remarkPoint.remarks?.length >
                                0 ? (
                                <div className="max-h-[180px] overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">

                                    {remarkPoint.remarks.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    item.id ??
                                                    `${remarkPoint.id}-${index}`
                                                }
                                                className="mb-2 rounded-md bg-[#1e2d39] p-3"
                                            >

                                                <div className="flex items-center justify-between gap-2">

                                                    <span className="text-[11px] font-bold text-[#50bbaa]">
                                                        {item.remarkBy
                                                            ? `${item.remarkBy} Remarks`
                                                            : "HA Remarks"}
                                                    </span>

                                                    {(item.createdAt ||
                                                        item.created_at) && (
                                                            <span className="text-[9px] text-white/40">
                                                                {formatRemarkDate(
                                                                    item.createdAt ||
                                                                    item.created_at
                                                                )}
                                                            </span>
                                                        )}
                                                </div>

                                                <p className="mt-1 text-[12px] leading-4 text-white/80">
                                                    {
                                                        item.remark
                                                    }
                                                </p>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-md bg-[#1e2d39] p-3 text-[12px] text-white/40">
                                    No previous remarks
                                </div>
                            )}
                        </div>

                        {/* ------------------------------------------------
                           NEW REMARK + AI
                        ------------------------------------------------ */}

                        {/* ------------------------------------------------
   NEW REMARK + AI
------------------------------------------------ */}

                        <div className="mt-4 shrink-0">

                            <div className="mb-2 flex items-center justify-between gap-2">

                                <p className="text-[13px] font-bold text-white/80">
                                    Add New Remark
                                </p>

                            </div>


                            {/* TEXTAREA + UNDO */}
                            <div className="relative">

                                <textarea
                                    autoFocus
                                    value={remarkText}
                                    onChange={(e) => {
                                        setRemarkText(e.target.value);
                                        setOriginalRemarkText("");
                                    }}
                                    placeholder="Enter HA Remark"
                                    rows={4}
                                    className="
      w-full
      resize-none
      rounded-xl
      border
      border-white/10
      bg-[#172633]
      px-3
      py-3
      pr-24
      text-sm
      leading-5
      outline-none
      placeholder:text-white/30
      transition
      focus:border-[#54baff]
      focus:ring-2
      focus:ring-[#54baff]/15
    "
                                />

                                {originalRemarkText && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRemarkText(
                                                originalRemarkText
                                            );
                                            setOriginalRemarkText("");
                                        }}
                                        className="
        absolute
        right-2
        top-2
        z-10
        rounded-md
        border
        border-white/20
        bg-[#111722]
        px-3
        py-1.5
        text-xs
        font-semibold
        text-white/80
        shadow-lg
        transition
        hover:bg-white/10
        hover:text-white
      "
                                    >
                                        ↶ Undo
                                    </button>
                                )}

                            </div>

                            {/* AI ACTIONS */}
                            <AITextActions
                                value={remarkText}
                                onChange={setRemarkText}
                                disabled={savingRemark}
                                onError={setError}
                                onUndoReady={setOriginalRemarkText}
                            />

                        </div>


                        {/* ------------------------------------------------
   BUTTONS
------------------------------------------------ */}

                        <div className="mt-4 flex shrink-0 gap-2">

                            {/* CANCEL */}
                            <button
                                type="button"
                                onClick={() => {
                                    setRemarkPoint(null);

                                    setRemarkText("");

                                    setOriginalRemarkText("");

                                }}
                                className="
            flex-1
            rounded-md
            border
            border-white/20
            py-2
            text-sm
            transition
            hover:bg-white/5
        "
                            >
                                Cancel
                            </button>


                            {/* SAVE */}
                            <button
                                type="button"
                                onClick={() =>
                                    void saveRemark()
                                }
                                disabled={
                                    savingRemark ||
                                    !remarkText.trim()
                                }
                                className="
            flex-1
            rounded-md
            bg-[#50bbaa]
            py-2
            text-sm
            font-bold
            text-[#17242d]
            transition
            hover:bg-[#5cc9b8]
            disabled:cursor-not-allowed
            disabled:opacity-50
        "
                            >
                                {savingRemark
                                    ? "Saving..."
                                    : "Add Remark"}
                            </button>

                        </div>
                    </div>
                </Modal>
            )}
        </main>
    );
}

/* ---------------------------------------------------------
   SUBJECT CARD
--------------------------------------------------------- */

function SubjectCard({
    subject,
    isOpen,
    onToggle,
    onRemark,
    onInfo,
}: {
    subject: Subject;
    isOpen: boolean;
    onToggle: () => void;
    onRemark: (point: Point) => void;
    onInfo: (point: Point) => void;
}) {
    const colors = {
        yellow: {
            border:
                "border-[#d3a900]",
            bg: "bg-[#705600]",
        },

        green: {
            border:
                "border-[#009f8e]",
            bg: "bg-[#006d63]",
        },

        red: {
            border:
                "border-[#df003c]",
            bg: "bg-[#870027]",
        },
    };

    const current =
        colors[subject.color];

    return (
        <div
            className={`overflow-hidden rounded-2xl border ${current.border} bg-[#0f1a23]/90 shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_35px_rgba(0,0,0,0.22)]`}
        >

            {/* SUBJECT HEADER */}
            <button
                type="button"
                onClick={onToggle}
                className={`block w-full px-4 py-3 text-left transition ${current.bg} hover:brightness-110`}
            >
                <h3 className="truncate text-[15px] leading-5">
                    {subject.title}
                </h3>

                <p className="text-[10px] text-white/80">
                    {subject.date}
                </p>
            </button>

            {/* POINTS */}
            {isOpen && (
                <div className="bg-[#172633] px-4">

                    {subject.points.length ===
                        0 ? (
                        <div className="py-6 text-center text-sm text-white/40">
                            No points available
                        </div>
                    ) : (
                        subject.points.map(
                            (
                                point,
                                index
                            ) => (
                                <div
                                    key={
                                        point.id
                                    }
                                    className="relative flex gap-3 border-b border-white/[0.06] py-3 last:border-b-0"
                                >

                                    {/* TIMELINE */}
                                    <div className="relative flex w-5 shrink-0 justify-center">

                                        {index <
                                            subject
                                                .points
                                                .length -
                                            1 && (
                                                <div className="absolute left-1/2 top-5 h-full w-[2px] -translate-x-1/2 bg-[#b8c2c9]" />
                                            )}

                                        <div className="z-10 mt-1 h-4 w-4 rounded-full border-2 border-[#d0a900] bg-[#2b3c4c]" />
                                    </div>

                                    {/* POINT CONTENT */}
                                    <div className="min-w-0 flex-1">

                                        <div className="flex items-start gap-2">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onInfo(
                                                        point
                                                    )
                                                }
                                                className="min-w-0 flex-1 rounded-lg text-left transition hover:bg-white/[0.03]"
                                            >
                                                <p className="text-[14px] leading-5 text-[#58baff]">
                                                    Point :
                                                </p>
                                            </button>

                                            {/* REMARK */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onRemark(
                                                        point
                                                    )
                                                }
                                                className="shrink-0 rounded-lg border border-[#e18a00]/70 bg-[#744300]/80 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[#8a5100]"
                                            >
                                                Remark
                                            </button>

                                            {/* INFO */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onInfo(
                                                        point
                                                    )
                                                }
                                                className="mt-0.5 shrink-0"
                                                title="Point information"
                                            >
                                                <InfoIcon />
                                            </button>
                                        </div>

                                        <p className="mt-2 rounded-lg bg-white/[0.025] px-2 py-1.5 text-justify text-[14px] leading-5 text-white">
                                            {point.title}
                                        </p>

                                        {/* REMARKS */}
                                        {point.remarks?.length >
                                            0 ? (
                                            <div className="mt-2 space-y-1">

                                                {point.remarks.map(
                                                    (
                                                        remark,
                                                        remarkIndex
                                                    ) => (
                                                        <div
                                                            key={
                                                                remark.id ??
                                                                `${point.id}-remark-${remarkIndex}`
                                                            }
                                                            className="rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2"
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

                                                            <p className="mt-1 text-[11px] leading-4 text-white/80">
                                                                {
                                                                    remark.remark
                                                                }
                                                            </p>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            ""
                                        )}
                                    </div>
                                </div>
                            )
                        )
                    )}

                    {/* COLLAPSE */}
                    <button
                        type="button"
                        onClick={onToggle}
                        className="flex w-full justify-center py-2 text-white/80 transition hover:scale-110"
                        title="Collapse"
                    >
                        <DownIcon />
                    </button>
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------
   MODAL
--------------------------------------------------------- */

function Modal({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a0f]/80 px-4 py-6 backdrop-blur-md">

            <div className="w-full max-w-[470px] overflow-hidden rounded-2xl border border-white/10 bg-[#1b2935] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.55)]">

                {children}

            </div>
        </div>
    );
}

/* ---------------------------------------------------------
   ICONS
--------------------------------------------------------- */

function InfoIcon() {
    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                fill="#e99a9e"
            />

            <path
                d="M12 10v7"
                stroke="#2b3c4c"
                strokeWidth="2"
                strokeLinecap="round"
            />

            <circle
                cx="12"
                cy="7"
                r="1.3"
                fill="#2b3c4c"
            />
        </svg>
    );
}

function DownIcon() {
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
            <path d="m4 4 10.5 11L25 4" />
        </svg>
    );
}

function SelectArrow() {
    return (
        <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            width="18"
            height="18"
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