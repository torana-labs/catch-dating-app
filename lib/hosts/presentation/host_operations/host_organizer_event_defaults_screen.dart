part of '../host_operations_screen.dart';

class HostOrganizerEventDefaultsScreen extends ConsumerStatefulWidget {
  const HostOrganizerEventDefaultsScreen({
    super.key,
    required this.clubId,
    this.managerEventSetupPreferences,
    this.onManagerEventSetupPreferencesChanged,
  });

  final String clubId;

  /// Supplied only by a manager-authorized preferences read.
  final ManagerEventSetupPreferences? managerEventSetupPreferences;

  /// Supplied only after a revision-fenced manager settings writer exists.
  final ValueChanged<ManagerEventSetupPreferences>?
  onManagerEventSetupPreferencesChanged;

  @override
  ConsumerState<HostOrganizerEventDefaultsScreen> createState() =>
      _HostOrganizerEventDefaultsScreenState();
}

class _HostOrganizerEventDefaultsScreenState
    extends ConsumerState<HostOrganizerEventDefaultsScreen> {
  ({String userId, String organizerId})? _loadedScope;

  @override
  Widget build(BuildContext context) {
    return HostOrganizerSpokeAsyncBoundary._(
      clubId: widget.clubId,
      title: context.l10n.hostsHostOrganizerEditTabLabelEventDefaults,
      builder: (context, organizer, uid, isOwner) {
        final scope = (userId: uid, organizerId: widget.clubId);
        final managerEnabled =
            isOwner && widget.managerEventSetupPreferences == null;
        if (!managerEnabled) _loadedScope = null;
        return Consumer(
          builder: (context, managerRef, _) {
            final manager = managerEnabled
                ? managerRef.watch(
                    hostManagerEventSetupDefaultsControllerProvider(scope),
                  )
                : null;
            final controller = managerEnabled
                ? managerRef.read(
                    hostManagerEventSetupDefaultsControllerProvider(
                      scope,
                    ).notifier,
                  )
                : null;
            if (managerEnabled && _loadedScope != scope) {
              _loadedScope = scope;
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (mounted && _loadedScope == scope) {
                  unawaited(
                    managerRef
                        .read(
                          hostManagerEventSetupDefaultsControllerProvider(
                            scope,
                          ).notifier,
                        )
                        .load(),
                  );
                }
              });
            }
            return isOwner
                ? HostOrganizerDefaultsEditor._(
                    organizer: organizer,
                    builder: (context, defaults, apply, errorMessage, _) =>
                        CatchSectionList(
                          emptyStateOmitted: true,
                          children: [
                            CatchSection.fieldRows(
                              first: true,
                              title: context.l10n.hostsEventDefaultsBasics,
                              children: [
                                CatchField.read(
                                  copy: catchFieldCopy(context.l10n),
                                  title: context.l10n.hostsPrivateEventCity,
                                  body: organizer.location,
                                  icon: CatchIcons.location,
                                ),
                                CatchFieldSupportRow(
                                  text:
                                      context.l10n.hostsEventDefaultsCitySource,
                                  color: CatchTokens.of(context).ink2,
                                ),
                                CatchField.read(
                                  copy: catchFieldCopy(context.l10n),
                                  title: context.l10n.hostsPrivateEventTimezone,
                                  body:
                                      manager?.current?.timezone ??
                                      context
                                          .l10n
                                          .hostsEventDefaultsChooseEachEvent,
                                  icon: CatchIcons.web,
                                ),
                                CatchFieldSupportRow(
                                  text: context
                                      .l10n
                                      .hostsEventDefaultsTimezoneSource,
                                  color: CatchTokens.of(context).ink2,
                                ),
                              ],
                            ),
                            OrganizerPolicyDefaultsCard(
                              defaults: defaults.eventPolicy,
                              currencyCode: currencyCodeForCityName(
                                organizer.location,
                              ),
                              activityKind: defaults.primaryActivityKind,
                              onActivityChanged: (activityKind) => apply(
                                (current) => _hostDefaultsWithActivity(
                                  current,
                                  activityKind,
                                ),
                              ),
                              onChanged: (update) => apply(
                                (current) => current.copyWith(
                                  eventPolicy: update(current.eventPolicy),
                                ),
                              ),
                            ),
                            if (widget.managerEventSetupPreferences != null)
                              HostManagerEventSetupPreferencesSection(
                                preferences:
                                    widget.managerEventSetupPreferences!,
                                onChanged: widget
                                    .onManagerEventSetupPreferencesChanged,
                              )
                            else if (manager?.current != null)
                              CatchSectionList(
                                emptyStateOmitted: true,
                                children: [
                                  HostManagerEventSetupPreferencesSection(
                                    preferences: manager!.current!.preferences,
                                    onChanged: manager.canEdit
                                        ? (next) =>
                                              unawaited(controller!.save(next))
                                        : null,
                                  ),
                                  if (manager.pending != null)
                                    CatchSection.fieldRows(
                                      title: context
                                          .l10n
                                          .hostsEventDefaultsPendingUpdate,
                                      children: [
                                        CatchField.read(
                                          copy: catchFieldCopy(context.l10n),
                                          title: context
                                              .l10n
                                              .hostsEventDefaultsPendingUpdate,
                                          body: context
                                              .l10n
                                              .hostsEventDefaultsPendingUpdateBody,
                                          icon: CatchIcons.locked,
                                        ),
                                        CatchField.action(
                                          copy: catchFieldCopy(context.l10n),
                                          title: context
                                              .l10n
                                              .hostsEventDefaultsRetryUpdate,
                                          onTap: manager.saving
                                              ? null
                                              : () => unawaited(
                                                  controller!.retryPending(),
                                                ),
                                        ),
                                      ],
                                    ),
                                  if (manager.error != null)
                                    CatchFieldSupportRow(
                                      text: context
                                          .l10n
                                          .hostsEventDefaultsManagerUnavailableBody,
                                      color: CatchTokens.of(context).danger,
                                      showErrorIcon: true,
                                    ),
                                ],
                              )
                            else
                              CatchSection.fieldRows(
                                title: context
                                    .l10n
                                    .hostsEventDefaultsPaymentHeading,
                                children: [
                                  CatchField.read(
                                    copy: catchFieldCopy(context.l10n),
                                    title: context
                                        .l10n
                                        .hostsEventDefaultsManagerUnavailable,
                                    body: context
                                        .l10n
                                        .hostsEventDefaultsManagerUnavailableBody,
                                    icon: CatchIcons.locked,
                                  ),
                                  if (manager?.pending != null)
                                    CatchField.action(
                                      copy: catchFieldCopy(context.l10n),
                                      title: context
                                          .l10n
                                          .hostsEventDefaultsRetryUpdate,
                                      body: context
                                          .l10n
                                          .hostsEventDefaultsPendingUpdateBody,
                                      onTap: manager!.saving
                                          ? null
                                          : () => unawaited(
                                              controller!.retryPending(),
                                            ),
                                    ),
                                  if (manager?.pending == null &&
                                      manager?.error != null)
                                    CatchField.action(
                                      copy: catchFieldCopy(context.l10n),
                                      title: context
                                          .l10n
                                          .hostsPrivateEventRetryDefaultsRead,
                                      onTap: () =>
                                          unawaited(controller!.load()),
                                    ),
                                ],
                              ),
                            if (errorMessage != null)
                              CatchFieldSupportRow(
                                text: errorMessage,
                                color: CatchTokens.of(context).danger,
                                showErrorIcon: true,
                              ),
                          ],
                        ),
                  )
                : HostOrganizerReadOnlyDefaultsSection._(organizer: organizer);
          },
        );
      },
    );
  }
}
