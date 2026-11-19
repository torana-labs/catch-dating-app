import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {
  countOrganizersWithoutFormat,
  readListingProgram,
  setListingProgramPause,
} from "../api/listingProgramRepository";

const programKey = ["organizer-intake", "listing-program"] as const;

/** Settings → Intake's programmatic listings switch and its counts-only format report. */
export function useListingProgramController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const page = useQuery({queryKey: programKey, queryFn: readListingProgram});
  const flipping = useMutation({mutationFn: setListingProgramPause});
  const reporting = useMutation({mutationFn: countOrganizersWithoutFormat});

  const setPaused = useCallback(async (paused: boolean, reason: string): Promise<boolean> => {
    if (!page.data) return false;
    onError(null);
    try {
      const next = await flipping.mutateAsync({paused, reason, expectedRevision: page.data.revision});
      queryClient.setQueryData(programKey, next);
      onNotice(paused ? "Programmatic listings are paused. Nominations and their approvals are refused until you resume." :
        "Programmatic listings are running again.");
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      await queryClient.invalidateQueries({queryKey: programKey});
      return false;
    }
  }, [flipping, onError, onNotice, page.data, queryClient]);

  const countWithoutFormat = useCallback(async (): Promise<void> => {
    onError(null);
    try {
      await reporting.mutateAsync();
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }, [onError, reporting]);

  return {page, program: page.data ?? null, setPaused, isFlipping: flipping.isPending,
    report: reporting.data ?? null, countWithoutFormat, isCounting: reporting.isPending};
}

export type ListingProgramController = ReturnType<typeof useListingProgramController>;
