import {useMutation} from "@tanstack/react-query";
import {useCallback} from "react";
import {describeAiFallbackTest, runAiFallbackTestCall} from "../api/aiFallbackTestRepository";

/** Runs the AI fallback's live test call and reports the outcome as one line. */
export function useAiFallbackTestController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const running = useMutation({mutationFn: runAiFallbackTestCall});
  const run = useCallback(async (dryRun: boolean) => {
    onError(null);
    try {
      const result = await running.mutateAsync({dryRun});
      if (result.ok) onNotice(describeAiFallbackTest(result));
      else onError(describeAiFallbackTest(result));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }, [onError, onNotice, running]);
  return {run, isRunning: running.isPending,
    lastResult: running.data ? describeAiFallbackTest(running.data) : null};
}

export type AiFallbackTestController = ReturnType<typeof useAiFallbackTestController>;
