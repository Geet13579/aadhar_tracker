"use client";

import { useEffect, useState } from "react";

type Point = {
    id: number;
    title: string;
};

type EditPointModalProps = {
    point: Point | null;
    saving?: boolean;
    onClose: () => void;
    onSave: (name: string) => void | Promise<void>;
};

export default function EditPointModal({
    point,
    saving = false,
    onClose,
    onSave,
}: EditPointModalProps) {
    const [name, setName] = useState("");

    useEffect(() => {
        if (point) {
            setName(point.title);
        } else {
            setName("");
        }
    }, [point]);

    if (!point) return null;

    const handleSave = async () => {
        const value = name.trim();

        if (!value || saving) return;

        await onSave(value);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-[380px] rounded-xl border border-white/10 bg-[#263746] p-5 shadow-2xl">
                {/* HEADER */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                        Edit Point
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="text-2xl leading-none text-white/60 hover:text-white disabled:opacity-40"
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                {/* INPUT */}
                <div className="mt-4">
                    <label className="mb-1 block text-xs font-semibold text-white/70">
                        Point Title
                    </label>

                    <textarea
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                onClose();
                            }
                        }}
                        placeholder="Point title"
                        disabled={saving}
                        className="h-32 w-full resize-none rounded-md border border-white/30 bg-[#1e2d39] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#54baff] disabled:opacity-60"
                    />
                </div>

                {/* BUTTONS */}
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 rounded-md border border-white/20 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={!name.trim() || saving}
                        className="flex-1 rounded-md bg-[#50bbaa] py-2 text-sm font-bold text-[#17242d] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}