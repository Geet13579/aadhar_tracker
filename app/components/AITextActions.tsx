"use client";

import { useState } from "react";

type AIAction =
  | "hindi"
  | "english"
  | "enhance";

type AITextActionsProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onError?: (message: string) => void;

  /**
   * Parent component ko original text deta hai.
   * Parent textarea ke andar Undo button show karega.
   */
  onUndoReady?: (originalText: string) => void;
};

export default function AITextActions({
  value,
  onChange,
  disabled = false,
  onError,
  onUndoReady,
}: AITextActionsProps) {
  const [loadingAction, setLoadingAction] =
    useState<AIAction | null>(null);

  const typewriterEffect = (
    text: string
  ): Promise<void> => {
    return new Promise((resolve) => {
      let index = 0;

      const interval = window.setInterval(() => {
        index += 1;

        onChange(
          text.slice(0, index)
        );

        if (index >= text.length) {
          window.clearInterval(
            interval
          );

          resolve();
        }
      }, 12);
    });
  };

  const handleAIAction = async (
    action: AIAction
  ) => {
    const input = value.trim();

    if (
      !input ||
      disabled ||
      loadingAction
    ) {
      return;
    }

    setLoadingAction(action);

    try {
      let endpoint = "";

      let body: Record<
        string,
        string
      >;

      /*
       * ENHANCE
       */
      if (action === "enhance") {
        endpoint =
          "/api/ai/enhance-description";

        body = {
          description: input,
        };
      }

      /*
       * TRANSLATE
       */
      else {
        endpoint =
          "/api/ai/translate";

        body = {
          description: input,
          language:
            action === "hindi"
              ? "hi"
              : "en",
        };
      }

      const response =
        await fetch(endpoint, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(body),
        });

      const data =
        (await response.json()) as {
          result?: string;
          enhancedDescription?: string;
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Unable to process text"
        );
      }

      const result = (
        data.result ||
        data.enhancedDescription ||
        ""
      ).trim();

      if (!result) {
        throw new Error(
          "AI returned empty text"
        );
      }

      /*
       * IMPORTANT:
       *
       * Parent ko original text do.
       *
       * Add Point:
       *   setOriginalPointName()
       *
       * Add Remark:
       *   setOriginalRemarkText()
       */
      onUndoReady?.(input);

      /*
       * AI response start hone se pehle
       * textarea clear karo.
       */
      onChange("");

      /*
       * Character-by-character typing.
       */
      await typewriterEffect(result);

    } catch (error) {
      console.error(
        "AI action error:",
        error
      );

      /*
       * API fail hone par original
       * text restore.
       */
      onChange(input);

      /*
       * Undo bhi remove karo.
       */
      onUndoReady?.("");

      const message =
        error instanceof Error
          ? error.message
          : "Unable to process text";

      onError?.(message);

    } finally {
      setLoadingAction(null);
    }
  };

  const isLoading =
    loadingAction !== null;

  const hasText =
    value.trim().length > 0;

  return (
    <div className="relative mt-2">

      {/* =================================================
          AI TOOLBAR
      ================================================= */}

      <div
        className="
          flex
          flex-wrap
          items-center
          justify-center
          gap-2
          rounded-xl
          border
          border-white/10
          bg-[#111722]/95
          px-3
          py-2.5
          shadow-[0_0_25px_rgba(76,91,255,0.08)]
        "
      >

        {/* =================================================
            ENHANCE
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            void handleAIAction(
              "enhance"
            )
          }
          disabled={
            !hasText ||
            isLoading ||
            disabled
          }
          className="
            group
            flex
            h-8
            items-center
            gap-2
            rounded-lg
            border
            border-[#7650ff]/60
            bg-[#7650ff]/10
            px-4
            text-sm
            font-semibold
            text-[#c4adff]
            transition-all
            hover:border-[#9b7cff]
            hover:bg-[#7650ff]/20
            hover:shadow-[0_0_18px_rgba(118,80,255,0.25)]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <span className="text-base">
            ✨
          </span>

          {loadingAction ===
            "enhance"
            ? "Enhancing..."
            : "Enhance"}
        </button>

        {/* =================================================
            DIVIDER
        ================================================= */}

        <div
          className="
            hidden
            h-6
            w-px
            bg-white/15
            sm:block
          "
        />

        {/* =================================================
            ENGLISH
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            void handleAIAction(
              "english"
            )
          }
          disabled={
            !hasText ||
            isLoading ||
            disabled
          }
          className="
            flex
            h-8
            items-center
            gap-2
            rounded-lg
            border
            border-[#536cff]/60
            bg-[#536cff]/10
            px-4
            text-sm
            font-semibold
            text-[#aeb9ff]
            transition-all
            hover:border-[#7185ff]
            hover:bg-[#536cff]/20
            hover:shadow-[0_0_15px_rgba(83,108,255,0.18)]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <span className="text-base">
            A
          </span>

          {loadingAction ===
            "english"
            ? "..."
            : "English"}
        </button>

        {/* =================================================
            HINDI
        ================================================= */}

        <button
          type="button"
          onClick={() =>
            void handleAIAction(
              "hindi"
            )
          }
          disabled={
            !hasText ||
            isLoading ||
            disabled
          }
          className="
            flex
            h-8
            items-center
            gap-2
            rounded-lg
            border
            border-[#9b6333]/60
            bg-[#9b6333]/10
            px-4
            text-sm
            font-semibold
            text-[#ffb15c]
            transition-all
            hover:border-[#d9853c]
            hover:bg-[#9b6333]/20
            hover:shadow-[0_0_15px_rgba(217,133,60,0.18)]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <span className="text-base">
            अ
          </span>

          {loadingAction ===
            "hindi"
            ? "..."
            : "Hindi"}
        </button>

      </div>

      {/* =================================================
          LOADING MESSAGE
      ================================================= */}

      {isLoading && (
        <div
          className="
            mt-1.5
            flex
            items-center
            gap-2
            px-1
            text-[10px]
            text-white/40
          "
        >
          <span
            className="
              inline-block
              h-1.5
              w-1.5
              animate-pulse
              rounded-full
              bg-[#7b61ff]
            "
          />

          {loadingAction ===
            "enhance"
            ? "AI is enhancing your text..."
            : loadingAction ===
              "english"
              ? "Translating to English..."
              : "Translating to Hindi..."}
        </div>
      )}

    </div>
  );
}