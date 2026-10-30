import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {
  currentStaffUid,
  listSupplyNominators,
  setSupplyNominator,
  type SupplyNominatorInput,
} from "../api/supplyNominatorRepository";

const nominatorsKey = ["organizer-intake", "supply-nominators"] as const;
const staffUidKey = ["organizer-intake", "current-staff-uid"] as const;

export function useSupplyNominatorController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const page = useQuery({queryKey: nominatorsKey, queryFn: listSupplyNominators});
  const me = useQuery({queryKey: staffUidKey, queryFn: currentStaffUid});
  const saving = useMutation({mutationFn: setSupplyNominator});

  const save = useCallback(async (input: SupplyNominatorInput): Promise<boolean> => {
    onError(null);
    try {
      const result = await saving.mutateAsync(input);
      onNotice(!result.active ? `Messages from the number ending ${result.phoneLast4} no longer count as nominations.` :
        result.created ? `Links sent from the number ending ${result.phoneLast4} now become nominations.` :
          `Updated the nominator on the number ending ${result.phoneLast4}.`);
      await queryClient.invalidateQueries({queryKey: nominatorsKey});
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [onError, onNotice, queryClient, saving]);

  return {page, nominators: page.data ?? [], myUid: me.data ?? null, save, isSaving: saving.isPending};
}

export type SupplyNominatorController = ReturnType<typeof useSupplyNominatorController>;
