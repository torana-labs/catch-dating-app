part of 'host_customers_screen.dart';

class HostStaticAudienceMembersEditor extends ConsumerStatefulWidget {
  const HostStaticAudienceMembersEditor({
    super.key,
    required this.organizerId,
    required this.selectedIds,
    required this.enabled,
    required this.onChanged,
  });

  final String organizerId;
  final Set<String> selectedIds;
  final bool enabled;
  final ValueChanged<Set<String>> onChanged;

  @override
  ConsumerState<HostStaticAudienceMembersEditor> createState() =>
      _HostStaticAudienceMembersEditorState();
}

class _HostStaticAudienceMembersEditorState
    extends ConsumerState<HostStaticAudienceMembersEditor> {
  late final String _initialSelection = jsonEncode(
    widget.selectedIds.toList()..sort(),
  );
  final _searchController = TextEditingController();
  final _newNames = <String, String>{};
  final _previousCursors = <String?>[];
  String? _search;
  String? _cursor;
  int _selectedPage = 0;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selectedProvider = hostStaticAudienceMembersProvider(
      widget.organizerId,
      _initialSelection,
    );
    final peopleProvider = hostAudienceProvider(
      widget.organizerId,
      HostAudienceQuery(
        search: _search,
        sort: HostAudienceSort.name,
        cursor: _cursor,
      ),
    );
    final people = ref.watch(peopleProvider);
    return CatchAsyncBoundary<List<HostStaticAudienceMember>>(
      value: ref.watch(selectedProvider),
      errorContext: AppErrorContext.customers,
      onRetry: () => ref.invalidate(selectedProvider),
      builder: (context, initialMembers) {
        final selected = [
          for (final id in widget.selectedIds)
            initialMembers
                    .where((row) => row.selectedContactId == id)
                    .firstOrNull ??
                HostStaticAudienceMember(
                  selectedContactId: id,
                  contactId: id,
                  displayName: _newNames[id],
                  available: true,
                ),
        ];
        final pageIndex = _selectedPage.clamp(
          0,
          selected.isEmpty ? 0 : (selected.length - 1) ~/ 25,
        );
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSection.fieldRows(
              title: context.l10n.hostAudienceSelectedCount(
                count: selected.length,
              ),
              footer: CatchText(
                context.l10n.hostAudienceStaticHelp,
                variant: CatchTextVariant.supporting,
              ),
              children: [
                if (selected.isEmpty)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostAudienceNoSelectedPeople,
                  ),
                if (selected.length >= 2500)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostAudienceSelectionLimit,
                  ),
                for (final member in selected.skip(pageIndex * 25).take(25))
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    key: ValueKey(
                      'host-static-remove-${member.selectedContactId}',
                    ),
                    title:
                        member.displayName ??
                        context.l10n.hostAudienceUnavailablePerson,
                    body: context.l10n.hostAudienceRemoveSelected,
                    onTap: widget.enabled
                        ? () => widget.onChanged(
                            {...widget.selectedIds}
                              ..remove(member.selectedContactId),
                          )
                        : null,
                  ),
                if (selected.length > 25) ...[
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    key: const ValueKey('host-static-selected-previous'),
                    title: context.l10n.hostAudiencePreviousPeople,
                    onTap: pageIndex > 0
                        ? () => setState(() => _selectedPage = pageIndex - 1)
                        : null,
                  ),
                  CatchField.action(
                    copy: catchFieldCopy(context.l10n),
                    key: const ValueKey('host-static-selected-next'),
                    title: context.l10n.hostAudienceNextPeople,
                    onTap: (pageIndex + 1) * 25 < selected.length
                        ? () => setState(() => _selectedPage = pageIndex + 1)
                        : null,
                  ),
                ],
              ],
            ),
            CatchSection.fieldRows(
              title: context.l10n.hostAudienceChoosePeople,
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: const ValueKey('host-static-search'),
                  title: context.l10n.hostAudienceSearchPeople,
                  contract: CatchContractConstraints
                      .listOrganizerContactsCallablePayloadQuery,
                  controller: _searchController,
                  textInputAction: TextInputAction.search,
                  states: <WidgetState>{
                    if (!widget.enabled) WidgetState.disabled,
                  },
                  onSubmitted: (value) => setState(() {
                    _search = value.trim().isEmpty ? null : value.trim();
                    _cursor = null;
                    _previousCursors.clear();
                  }),
                ),
              ],
            ),
            CatchAsyncBoundary<HostAudiencePage>(
              value: people,
              errorContext: AppErrorContext.customers,
              onRetry: () => ref.invalidate(peopleProvider),
              builder: (context, page) => CatchSection.fieldRows(
                title: context.l10n.hostAudienceAvailablePeople,
                children: [
                  if (page.contacts.isEmpty)
                    CatchField.read(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostAudienceNoPeopleFound,
                    ),
                  for (final person in page.contacts)
                    CatchField.toggle(
                      copy: catchFieldCopy(context.l10n),
                      key: ValueKey('host-static-person-${person.contactId}'),
                      title: person.displayName,
                      contractExemption:
                          'This selection edits the bounded staticMembers.contactIds array; it is not a stored boolean field.',
                      value: selected.any(
                        (member) => member.contactId == person.contactId,
                      ),
                      onChanged:
                          !widget.enabled ||
                              (selected.length >= 2500 &&
                                  !selected.any(
                                    (member) =>
                                        member.contactId == person.contactId,
                                  ))
                          ? null
                          : (value) {
                              final ids = {...widget.selectedIds};
                              if (value) {
                                if (ids.length >= 2500) return;
                                ids.add(person.contactId);
                                _newNames[person.contactId] =
                                    person.displayName;
                              } else {
                                ids.removeAll(
                                  selected
                                      .where(
                                        (member) =>
                                            member.contactId ==
                                            person.contactId,
                                      )
                                      .map(
                                        (member) => member.selectedContactId,
                                      ),
                                );
                              }
                              widget.onChanged(ids);
                            },
                    ),
                  if (_previousCursors.isNotEmpty)
                    CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host-static-previous'),
                      title: context.l10n.hostAudiencePreviousPeople,
                      onTap: () => setState(
                        () => _cursor = _previousCursors.removeLast(),
                      ),
                    ),
                  if (page.nextCursor != null)
                    CatchField.action(
                      copy: catchFieldCopy(context.l10n),
                      key: const ValueKey('host-static-next'),
                      title: context.l10n.hostAudienceNextPeople,
                      onTap: () => setState(() {
                        _previousCursors.add(_cursor);
                        _cursor = page.nextCursor;
                      }),
                    ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
