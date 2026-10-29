import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:flutter/material.dart';

String hostRosterFieldCopy(
  BuildContext context,
  HostRosterField field,
) => switch (field) {
  HostRosterField.displayName => context.l10n.hostsOperationalRosterFieldName,
  HostRosterField.phone => context.l10n.hostsOperationalRosterFieldPhone,
  HostRosterField.email => context.l10n.hostsOperationalRosterFieldEmail,
  HostRosterField.city => context.l10n.hostsOperationalRosterFieldCity,
  HostRosterField.externalReference =>
    context.l10n.hostsOperationalRosterFieldReference,
  HostRosterField.arrivalGroup =>
    context.l10n.hostsOperationalRosterFieldArrivalGroup,
  HostRosterField.ticketType => context.l10n.hostsOperationalRosterFieldTicket,
  HostRosterField.revenueAmount =>
    context.l10n.hostsOperationalRosterFieldRevenue,
  HostRosterField.revenueCurrency =>
    context.l10n.hostsOperationalRosterFieldCurrency,
  HostRosterField.status => context.l10n.hostsOperationalRosterFieldStatus,
};

String hostRosterRowIssueCopy(BuildContext context, HostRosterRowIssue issue) =>
    switch (issue.type) {
      HostRosterRowIssueType.missingNameColumn =>
        context.l10n.hostsOperationalRosterIssueMissingNameColumn,
      HostRosterRowIssueType.duplicateMappedColumn =>
        context.l10n.hostsOperationalRosterIssueDuplicateMappedColumn,
      HostRosterRowIssueType.missingName =>
        context.l10n.hostsOperationalRosterIssueMissingName(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.missingStableIdentity =>
        context.l10n.hostsOperationalRosterIssueMissingStableIdentity(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.invalidPhone =>
        context.l10n.hostsOperationalRosterIssueInvalidPhone(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.invalidEmail =>
        context.l10n.hostsOperationalRosterIssueInvalidEmail(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.invalidCity =>
        context.l10n.hostsOperationalRosterIssueInvalidCity(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.invalidRevenueAmount =>
        context.l10n.hostsOperationalRosterIssueInvalidRevenue(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.missingRevenueCurrency =>
        context.l10n.hostsOperationalRosterIssueMissingRevenueCurrency(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.duplicateIdentity =>
        context.l10n.hostsOperationalRosterIssueDuplicateIdentity(
          row: issue.rowNumber ?? 0,
        ),
      HostRosterRowIssueType.unknownStatus =>
        context.l10n.hostsOperationalRosterIssueUnknownStatus(
          row: issue.rowNumber ?? 0,
          status: issue.value ?? '',
        ),
      HostRosterRowIssueType.excludedStatus =>
        context.l10n.hostsOperationalRosterIssueExcludedStatus(
          row: issue.rowNumber ?? 0,
          status: issue.value ?? '',
        ),
    };
