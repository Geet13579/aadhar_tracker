"use client";

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

type PointInfoModalProps = {
    point: Point | null;
    formatRemarkDate: (value?: string) => string;
};

export default function PointInfoModal({
    point,
    formatRemarkDate,
}: PointInfoModalProps) {
    if (!point) return null;

    return (
        <div>


            <div className="rounded-md">
                <div className="mt-2 rounded-md bg-black/20 p-4">
                    <p className="text-white">
                        Point :{" "}
                        <span className="text-[#58baff]">
                            {point.title}
                        </span>
                    </p>

                    <p className="mt-3 text-sm text-white">
                        Created at :{" "}
                        <span className="text-[#58baff]">
                            {point.createdAt}
                        </span>
                    </p>

                    <p className="mt-3 text-sm text-white">
                        Updated at :{" "}
                        <span className="text-[#58baff]">
                            {point.updatedAt}
                        </span>
                    </p>
                </div>

                {/* ALL REMARKS */}
                <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="mb-2 text-sm font-bold text-white">
                        Remarks
                    </p>

                    {point.remarks?.length > 0 ? (
                        <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                            {point.remarks.map((remark, index) => (
                                <div
                                    key={
                                        remark.id ??
                                        `${point.id}-info-${index}`
                                    }
                                    className="rounded-md bg-black/20 p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-bold text-[#50bbaa]">
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

                                    <p className="mt-1 text-[12px] leading-4 text-white/80">
                                        {remark.remark}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-md bg-[#1e2d39] p-3 text-[12px] text-white/40">
                            No remarks
                        </div>
                    )}
                </div>
            </div>
        </div>



    );
}