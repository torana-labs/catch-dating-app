import {BarChart3} from "lucide-react";
import {AdminButton, AdminTableRow, DataTable, EmptyState, Panel} from
  "../../../shared/ui/AdminPrimitives";
import {dataMode} from "../../../shared/api/dataMode";
import {useSalesFunnelController} from "../controllers/useSalesFunnelController";
import {CatchText} from "@catch/web-ui";
export function renderSalesFunnelWorkspace(actorUid: string) {
  return dataMode() === "sample" ? <Panel title="Company pipeline" icon={<BarChart3 size={18} />}>
    <CatchText as="p" variant="supporting">Company totals are available with live Sales records.</CatchText>
  </Panel> : <SalesFunnelWorkspace key={actorUid} actorUid={actorUid} />;
}
function SalesFunnelWorkspace({actorUid}: {actorUid: string}) {
  const report = useSalesFunnelController(actorUid);
  const value = report.isSuccess ? report.data : null;
  return <Panel title="Company pipeline" icon={<BarChart3 size={18} />}>
    <CatchText as="p" variant="supporting">All active Sales hosts at one snapshot, including hosts on an outreach hold.
      Archived and privacy-restricted hosts are excluded.</CatchText>
    {report.isPending ? <EmptyState>Loading company totals…</EmptyState> : null}
    {report.isError ? <EmptyState>Company totals could not be verified.
      No partial totals are shown. <AdminButton onClick={() => void report.refetch()}>
        Try again</AdminButton></EmptyState> : null}
    {value ? <>
      <CatchText as="p" variant="supporting">{value.activeHosts} hosts · {value.opportunities} opportunities across {value.hostsWithOpportunities} hosts.
        {" "}As of {new Date(value.asOf).toLocaleString()}.</CatchText>
      <CatchText as="p" variant="supporting">{value.overdueOpportunities} opportunities overdue · {value.opportunitiesMissingNextStep} missing a next step/date · {value.overdueObligations} overdue service, reply or review tasks.</CatchText>
      <DataTable ariaLabel="Company pipeline stages">
        <thead><tr><th>Stage</th><th>Opportunities now</th><th>Hosts now</th>
          <th>Hosts entering in report window</th></tr></thead>
        <tbody>{value.stages.map(row => <AdminTableRow key={row.stage}>
          <td>{row.stage.replaceAll("_", " ")}</td><td>{row.opportunities}</td>
          <td>{row.distinctHosts}</td><td>{row.distinctHostsEntered}</td>
        </AdminTableRow>)}</tbody>
      </DataTable>
      <CatchText as="p" variant="supporting">A host can have several opportunities and appear in several stages.
        Stage entries since {new Date(value.since).toLocaleDateString()} describe recorded movement, including reopens; these are
        not conversion rates. Revenue is verified separately in Pilot &amp; terms.</CatchText>
      <CatchText as="p" variant="supporting">{value.heldHosts} hosts on hold · {value.duplicateReviewHosts} identity reviews · {value.excludedArchivedOrRestrictedHosts} archived or restricted hosts excluded.</CatchText>
      <AdminButton disabled={report.isFetching} onClick={() => void report.refetch()}>
        Refresh totals</AdminButton>
    </> : null}
  </Panel>;
}
