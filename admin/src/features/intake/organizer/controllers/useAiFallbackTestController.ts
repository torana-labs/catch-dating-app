import {useMutation} from "@tanstack/react-query";
import {useCallback} from "react";
import {useAdminPendingOperationGuard} from "../../../../shared/pendingOperation";
import {describeAiFallbackTest, runAiFallbackTestCall} from "../api/aiFallbackTestRepository";

/** Runs the AI fallback's live test call and reports the outcome as one line. */
export function useAiFallbackTestController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const running = useMutation({mutationFn: runAiFallbackTestCall});
  const run = useCallback(async (dryRun: boolean) => {
    const operation = beginOperation();
    if (!operation) return;
    onError(null);
    try {
      const result = await running.mutateAsync({dryRun});
      if (result.ok) onNotice(describeAiFallbackTest(result));
      else onError(describeAiFallbackTest(result));
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      endOperation(operation);
    }
  }, [beginOperation, endOperation, onError, onNotice, running]);
  return {run, isRunning: running.isPending,
    lastResult: running.data ? describeAiFallbackTest(running.data) : null};
}

export type AiFallbackTestController = ReturnType<typeof useAiFallbackTestController>;
