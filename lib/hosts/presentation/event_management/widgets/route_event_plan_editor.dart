import 'package:catch_dating_app/contexts/events/domain/route_event_plan.dart';
import 'package:catch_dating_app/events/shared/event_route_labels.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/route_path_builder_screen.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/kernel/location_coordinate.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

enum _PacePreset { social, steady, fast }

/// Composes route operations independently from the event's broader format.
///
/// Runs, walks, crawls, rides, and custom moving events share these controls;
/// the selected activity only supplies a useful starting preset.
class RouteEventPlanEditor extends StatefulWidget {
  const RouteEventPlanEditor({
    super.key,
    required this.activityKind,
    required this.plan,
    required this.onChanged,
    required this.initialCenter,
    this.loadMapTiles = true,
  });

  final ActivityKind activityKind;
  final RouteEventPlan? plan;
  final ValueChanged<RouteEventPlan?> onChanged;
  final LocationCoordinate initialCenter;
  final bool loadMapTiles;

  @override
  State<RouteEventPlanEditor> createState() => _RouteEventPlanEditorState();
}

class _RouteEventPlanEditorState extends State<RouteEventPlanEditor> {
  static const _movementField = 'route-movement';
  static const _shapeField = 'route-shape';
  static const _groupField = 'route-group';
  static const _cadenceField = 'route-cadence';
  static const _stopsField = 'route-stops';
  static const _rolesField = 'route-roles';
  static const _paceGroupsField = 'route-pace-groups';
  static const _trackingField = 'route-live-tracking';

  final CatchAccordionController _accordion = CatchAccordionController();

  @override
  void initState() {
    super.initState();
    _accordion.addListener(_handleAccordionChanged);
  }

  @override
  void dispose() {
    _accordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    super.dispose();
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  void _setOpen(String field, bool open) {
    if (open && !_accordion.isExpanded(field)) {
      _accordion.toggle(field);
    } else if (!open && _accordion.isExpanded(field)) {
      _accordion.collapse();
    }
  }

  @override
  Widget build(BuildContext context) {
    final plan = widget.plan;
    final accent = ActivityPalette.resolve(context, widget.activityKind).accent;
    return CatchSection.fieldRows(
      title: context.l10n.hostsRouteEventPlanSectionTitle,
      children: [
        CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          key: CreateEventFormKeys.routePlanEnabled,
          title: context.l10n.hostsRouteEventPlanOptInTitle,
          body: context.l10n.hostsRouteEventPlanOptInBody,
          contractExemption:
              'Controls optional routePlan presence; nested fields use generated bindings.',
          value: plan != null,
          onChanged: (enabled) => widget.onChanged(
            enabled
                ? (RouteEventPlan.defaultForActivity(widget.activityKind) ??
                      RouteEventPlan.customWalk)
                : null,
          ),
          icon: CatchIcons.route,
          iconColor: accent,
        ),
        if (plan != null)
          CatchField.control(
            copy: catchFieldCopy(context.l10n),
            key: CreateEventFormKeys.routePlanSummary,
            title: context.l10n.hostsRouteEventPlanSummaryTitle,
            body: [
              routeMovementLabel(context.l10n, plan.movementMode),
              routeGroupLabel(context.l10n, plan.groupStrategy),
              routeCadenceLabel(context.l10n, plan.stopCadence),
            ].join(' · '),
            contractExemption:
                'Disclosure for nested routePlan fields with generated bindings.',
            icon: CatchIcons.route,
            iconColor: accent,
            child: CatchSection.containedFieldRows(
              children: [
                CatchField<RouteMovementMode>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeMovement,
                  title: context.l10n.hostsRouteEventPlanMovementTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanMovementMode,
                  contractValueBuilder: (value) => value.name,
                  values: RouteMovementMode.values,
                  itemLabelBuilder: (value) =>
                      routeMovementLabel(context.l10n, value),
                  selected: {plan.movementMode},
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(movementMode: selection.single),
                  ),
                  disclosureMode: _accordion.isExpanded(_movementField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_movementField, open),
                  icon: CatchIcons.swap,
                  iconColor: accent,
                ),
                CatchField<RouteShape>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeShape,
                  title: context.l10n.hostsRouteEventPlanShapeTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanRouteShape,
                  contractValueBuilder: (value) => value.name,
                  values: RouteShape.values,
                  itemLabelBuilder: (value) =>
                      routeShapeLabel(context.l10n, value),
                  selected: {plan.routeShape},
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(routeShape: selection.single),
                  ),
                  disclosureMode: _accordion.isExpanded(_shapeField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_shapeField, open),
                  icon: CatchIcons.map,
                  iconColor: accent,
                ),
                CatchField<RouteGroupStrategy>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeGroupStrategy,
                  title: context.l10n.hostsRouteEventPlanGroupTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanGroupStrategy,
                  contractValueBuilder: (value) => value.name,
                  values: RouteGroupStrategy.values,
                  itemLabelBuilder: (value) =>
                      routeGroupLabel(context.l10n, value),
                  selected: {plan.groupStrategy},
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(groupStrategy: selection.single),
                  ),
                  disclosureMode: _accordion.isExpanded(_groupField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_groupField, open),
                  icon: CatchIcons.people,
                  iconColor: accent,
                ),
                CatchField<RouteStopCadence>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeStopCadence,
                  title: context.l10n.hostsRouteEventPlanCadenceTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopCadence,
                  contractValueBuilder: (value) => value.name,
                  values: RouteStopCadence.values,
                  itemLabelBuilder: (value) =>
                      routeCadenceLabel(context.l10n, value),
                  selected: {plan.stopCadence},
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(stopCadence: selection.single),
                  ),
                  disclosureMode: _accordion.isExpanded(_cadenceField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_cadenceField, open),
                  icon: CatchIcons.rules,
                  iconColor: accent,
                ),
                CatchField<RouteStopKind>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeStopKinds,
                  title: context.l10n.hostsRouteEventPlanStopsTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanStopKinds,
                  contractValueBuilder: (value) => value.name,
                  values: RouteStopKind.values,
                  itemLabelBuilder: (value) =>
                      routeStopLabel(context.l10n, value),
                  selected: plan.stopKinds.toSet(),
                  mode: CatchChipMode.multiple,
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(
                      stopKinds: RouteStopKind.values
                          .where(selection.contains)
                          .toList(growable: false),
                    ),
                  ),
                  disclosureMode: _accordion.isExpanded(_stopsField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_stopsField, open),
                  icon: CatchIcons.dining,
                  iconColor: accent,
                ),
                CatchField<RouteRoleKind>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeRoleKinds,
                  title: context.l10n.hostsRouteEventPlanRolesTitle,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanRoleKinds,
                  contractValueBuilder: (value) => value.name,
                  values: RouteRoleKind.values,
                  itemLabelBuilder: (value) => _roleLabel(context, value),
                  selected: plan.roleKinds.toSet(),
                  mode: CatchChipMode.multiple,
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(
                      roleKinds: RouteRoleKind.values
                          .where(selection.contains)
                          .toList(growable: false),
                    ),
                  ),
                  disclosureMode: _accordion.isExpanded(_rolesField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_rolesField, open),
                  icon: CatchIcons.people,
                  iconColor: accent,
                ),
                CatchFieldLanes.single(
                  key: CreateEventFormKeys.routePath,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      CatchFieldContentRow(
                        labelCopy: catchFieldLabelTextCopy(context.l10n),

                        title: context.l10n.hostsRouteEventPlanPathTitle,
                        body: plan.path.length >= 2
                            ? context.l10n.hostsRouteEventPlanPathCount(
                                count: plan.path.length,
                              )
                            : context.l10n.hostsRouteEventPlanPathEmpty,
                      ),
                      gapH8,
                      CatchButton(
                        label: context.l10n.hostsRouteEventPlanPathAction,
                        variant: CatchButtonVariant.secondary,
                        onPressed: () => _editPath(plan),
                      ),
                    ],
                  ),
                ),
                CatchField<_PacePreset>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routePaceGroups,
                  title: context.l10n.hostsRouteEventPlanPaceGroupsTitle,
                  body: context.l10n.hostsRouteEventPlanPaceGroupsBody,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanPaceGroups,
                  contractValueBuilder: (value) => value.name,
                  values: _PacePreset.values,
                  itemLabelBuilder: (value) => _pacePresetLabel(context, value),
                  selected: _selectedPacePresets(plan),
                  allowEmptySelection: true,
                  mode: CatchChipMode.multiple,
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(paceGroups: _paceGroupsFor(selection)),
                  ),
                  disclosureMode: _accordion.isExpanded(_paceGroupsField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_paceGroupsField, open),
                  icon: CatchIcons.pace,
                  iconColor: accent,
                ),
                CatchField<RouteLiveTrackingMode>.choices(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.routeLiveTracking,
                  title: context.l10n.hostsRouteEventPlanTrackingTitle,
                  body: context.l10n.hostsRouteEventPlanTrackingBody,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadEventFormatActivityDetailsRoutePlanLiveTrackingPolicyMode,
                  contractValueBuilder: (value) => value.name,
                  values: RouteLiveTrackingMode.values,
                  itemLabelBuilder: (value) => _trackingLabel(context, value),
                  selected: {plan.liveTrackingPolicy.mode},
                  onSelectionChanged: (selection) => widget.onChanged(
                    plan.copyWith(
                      liveTrackingPolicy: RouteLiveTrackingPolicy(
                        mode: selection.single,
                        staleAfterSeconds: 120,
                        retentionMinutes: 60,
                      ),
                    ),
                  ),
                  disclosureMode: _accordion.isExpanded(_trackingField)
                      ? CatchFieldMode.controlledExpanded
                      : CatchFieldMode.controlledCollapsed,
                  onOpenChanged: (open) => _setOpen(_trackingField, open),
                  icon: CatchIcons.location,
                  iconColor: accent,
                ),
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _editPath(RouteEventPlan plan) async {
    final path = await Navigator.of(context).push<List<RoutePoint>>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => RoutePathBuilderScreen(
          initialCenter: widget.initialCenter,
          initialPath: plan.path,
          enableNetworkTiles: widget.loadMapTiles,
        ),
      ),
    );
    if (path != null) widget.onChanged(plan.copyWith(path: path));
  }

  Set<_PacePreset> _selectedPacePresets(RouteEventPlan plan) => plan.paceGroups
      .map(
        (group) => _PacePreset.values.where((value) => value.name == group.id),
      )
      .expand((values) => values)
      .toSet();

  List<RoutePaceGroup> _paceGroupsFor(Set<_PacePreset> selection) {
    return _PacePreset.values
        .where(selection.contains)
        .map(
          (value) => RoutePaceGroup(
            id: value.name,
            label: _pacePresetLabel(context, value),
            sortOrder: value.index,
            targetPaceSecondsPerKm: switch (value) {
              _PacePreset.social => 450,
              _PacePreset.steady => 360,
              _PacePreset.fast => 300,
            },
          ),
        )
        .toList(growable: false);
  }

  String _pacePresetLabel(BuildContext context, _PacePreset value) =>
      switch (value) {
        _PacePreset.social => context.l10n.hostsRouteEventPlanPaceSocial,
        _PacePreset.steady => context.l10n.hostsRouteEventPlanPaceSteady,
        _PacePreset.fast => context.l10n.hostsRouteEventPlanPaceFast,
      };

  String _trackingLabel(BuildContext context, RouteLiveTrackingMode value) =>
      switch (value) {
        RouteLiveTrackingMode.disabled =>
          context.l10n.hostsRouteEventPlanTrackingDisabled,
        RouteLiveTrackingMode.hostOnly =>
          context.l10n.hostsRouteEventPlanTrackingHostOnly,
        RouteLiveTrackingMode.authorizedOperators =>
          context.l10n.hostsRouteEventPlanTrackingOperators,
      };

  String _roleLabel(BuildContext context, RouteRoleKind value) =>
      switch (value) {
        RouteRoleKind.routeLead => context.l10n.hostsRouteEventPlanRoleLead,
        RouteRoleKind.sweep => context.l10n.hostsRouteEventPlanRoleSweep,
        RouteRoleKind.pacer => context.l10n.hostsRouteEventPlanRolePacer,
        RouteRoleKind.stopHost => context.l10n.hostsRouteEventPlanRoleStopHost,
        RouteRoleKind.marshal => context.l10n.hostsRouteEventPlanRoleMarshal,
        RouteRoleKind.photographer =>
          context.l10n.hostsRouteEventPlanRolePhotographer,
      };
}
