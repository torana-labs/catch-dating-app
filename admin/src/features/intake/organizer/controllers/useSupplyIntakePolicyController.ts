import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import {
  decideSupplyIntakePolicy,
  listSupplyIntakePolicies,
  type SupplyIntakePolicyDecision,
} from "../api/supplyIntakePolicyRepository";

const policiesKey = ["organizer-intake", "supply-intake-policies"] as const;

export function useSupplyIntakePolicyController({onError, onNotice}: {
  onError: (message: string | null) => void;
  onNotice: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const page = useQuery({queryKey: policiesKey, queryFn: listSupplyIntakePolicies});
  const deciding = useMutation({mutationFn: decideSupplyIntakePolicy});

  const decide = useCallback(async (input: SupplyIntakePolicyDecision): Promise<boolean> => {
    onError(null);
    try {
      await deciding.mutateAsync(input);
      onNotice(input.decision === "accept" ?
        "Decision recorded. It turns on once the policy file cites it in a reviewed change." :
        "Decision recorded. The capability stays off.");
      await queryClient.invalidateQueries({queryKey: policiesKey});
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }, [deciding, onError, onNotice, queryClient]);

  return {page, policies: page.data?.policies ?? [], decide, isDeciding: deciding.isPending};
}

export type SupplyIntakePolicyController = ReturnType<typeof useSupplyIntakePolicyController>;
