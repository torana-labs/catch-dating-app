// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'event_success_plan.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$EventSuccessPlan {

@JsonKey(includeToJson: false) String get id; String get eventId; String get organizerId; String? get layoutId; String get playbookId; List<String> get selectedModuleIds; int get targetAttendeeCount; EventSuccessStructureConfig get structureConfig; String get hostGoal; bool get wingmanRequestsEnabled; bool get contextualOpenersEnabled; bool get compatibilityAffectsRanking; EventSuccessQuestionnaireConfig get questionnaireConfig; EventSuccessConversationGraphConsentMode get conversationGraphConsentMode; int get activeStepIndex;/// The host's edited run of show; null while it follows the playbook.
 List<EventSuccessPlanStep>? get stepOverrides;/// Server milliseconds the active step started, moved later by paused
/// spans; null on plans that predate it, whose time follows the
/// schedule.
 int? get stepStartedAtMs;/// Server milliseconds the active step was paused; null while it runs.
 int? get pausedAtMs;/// Crawl stops the host changed on the night, by itinerary item id;
/// null while the route is the itinerary as published.
 List<EventSuccessCrawlStopChange>? get crawlStopChanges; int get liveControlRevision; int get assignmentDraftRevision; int get publishedRotationRoundIndex; int get publishedRevealRoundIndex; EventSuccessPlanStatus get status; EventSuccessRevealStatus get revealStatus; int get activeRevealRoundIndex;@NullableTimestampConverter() DateTime? get revealStartedAt; String? get attendeePrompt;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;@NullableTimestampConverter() DateTime? get frozenAt;@NullableTimestampConverter() DateTime? get completedAt;
/// Create a copy of EventSuccessPlan
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventSuccessPlanCopyWith<EventSuccessPlan> get copyWith => _$EventSuccessPlanCopyWithImpl<EventSuccessPlan>(this as EventSuccessPlan, _$identity);

  /// Serializes this EventSuccessPlan to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventSuccessPlan&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.layoutId, layoutId) || other.layoutId == layoutId)&&(identical(other.playbookId, playbookId) || other.playbookId == playbookId)&&const DeepCollectionEquality().equals(other.selectedModuleIds, selectedModuleIds)&&(identical(other.targetAttendeeCount, targetAttendeeCount) || other.targetAttendeeCount == targetAttendeeCount)&&(identical(other.structureConfig, structureConfig) || other.structureConfig == structureConfig)&&(identical(other.hostGoal, hostGoal) || other.hostGoal == hostGoal)&&(identical(other.wingmanRequestsEnabled, wingmanRequestsEnabled) || other.wingmanRequestsEnabled == wingmanRequestsEnabled)&&(identical(other.contextualOpenersEnabled, contextualOpenersEnabled) || other.contextualOpenersEnabled == contextualOpenersEnabled)&&(identical(other.compatibilityAffectsRanking, compatibilityAffectsRanking) || other.compatibilityAffectsRanking == compatibilityAffectsRanking)&&(identical(other.questionnaireConfig, questionnaireConfig) || other.questionnaireConfig == questionnaireConfig)&&(identical(other.conversationGraphConsentMode, conversationGraphConsentMode) || other.conversationGraphConsentMode == conversationGraphConsentMode)&&(identical(other.activeStepIndex, activeStepIndex) || other.activeStepIndex == activeStepIndex)&&const DeepCollectionEquality().equals(other.stepOverrides, stepOverrides)&&(identical(other.stepStartedAtMs, stepStartedAtMs) || other.stepStartedAtMs == stepStartedAtMs)&&(identical(other.pausedAtMs, pausedAtMs) || other.pausedAtMs == pausedAtMs)&&const DeepCollectionEquality().equals(other.crawlStopChanges, crawlStopChanges)&&(identical(other.liveControlRevision, liveControlRevision) || other.liveControlRevision == liveControlRevision)&&(identical(other.assignmentDraftRevision, assignmentDraftRevision) || other.assignmentDraftRevision == assignmentDraftRevision)&&(identical(other.publishedRotationRoundIndex, publishedRotationRoundIndex) || other.publishedRotationRoundIndex == publishedRotationRoundIndex)&&(identical(other.publishedRevealRoundIndex, publishedRevealRoundIndex) || other.publishedRevealRoundIndex == publishedRevealRoundIndex)&&(identical(other.status, status) || other.status == status)&&(identical(other.revealStatus, revealStatus) || other.revealStatus == revealStatus)&&(identical(other.activeRevealRoundIndex, activeRevealRoundIndex) || other.activeRevealRoundIndex == activeRevealRoundIndex)&&(identical(other.revealStartedAt, revealStartedAt) || other.revealStartedAt == revealStartedAt)&&(identical(other.attendeePrompt, attendeePrompt) || other.attendeePrompt == attendeePrompt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.frozenAt, frozenAt) || other.frozenAt == frozenAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,organizerId,layoutId,playbookId,const DeepCollectionEquality().hash(selectedModuleIds),targetAttendeeCount,structureConfig,hostGoal,wingmanRequestsEnabled,contextualOpenersEnabled,compatibilityAffectsRanking,questionnaireConfig,conversationGraphConsentMode,activeStepIndex,const DeepCollectionEquality().hash(stepOverrides),stepStartedAtMs,pausedAtMs,const DeepCollectionEquality().hash(crawlStopChanges),liveControlRevision,assignmentDraftRevision,publishedRotationRoundIndex,publishedRevealRoundIndex,status,revealStatus,activeRevealRoundIndex,revealStartedAt,attendeePrompt,createdAt,updatedAt,frozenAt,completedAt]);

@override
String toString() {
  return 'EventSuccessPlan(id: $id, eventId: $eventId, organizerId: $organizerId, layoutId: $layoutId, playbookId: $playbookId, selectedModuleIds: $selectedModuleIds, targetAttendeeCount: $targetAttendeeCount, structureConfig: $structureConfig, hostGoal: $hostGoal, wingmanRequestsEnabled: $wingmanRequestsEnabled, contextualOpenersEnabled: $contextualOpenersEnabled, compatibilityAffectsRanking: $compatibilityAffectsRanking, questionnaireConfig: $questionnaireConfig, conversationGraphConsentMode: $conversationGraphConsentMode, activeStepIndex: $activeStepIndex, stepOverrides: $stepOverrides, stepStartedAtMs: $stepStartedAtMs, pausedAtMs: $pausedAtMs, crawlStopChanges: $crawlStopChanges, liveControlRevision: $liveControlRevision, assignmentDraftRevision: $assignmentDraftRevision, publishedRotationRoundIndex: $publishedRotationRoundIndex, publishedRevealRoundIndex: $publishedRevealRoundIndex, status: $status, revealStatus: $revealStatus, activeRevealRoundIndex: $activeRevealRoundIndex, revealStartedAt: $revealStartedAt, attendeePrompt: $attendeePrompt, createdAt: $createdAt, updatedAt: $updatedAt, frozenAt: $frozenAt, completedAt: $completedAt)';
}


}

/// @nodoc
abstract mixin class $EventSuccessPlanCopyWith<$Res>  {
  factory $EventSuccessPlanCopyWith(EventSuccessPlan value, $Res Function(EventSuccessPlan) _then) = _$EventSuccessPlanCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String organizerId, String? layoutId, String playbookId, List<String> selectedModuleIds, int targetAttendeeCount, EventSuccessStructureConfig structureConfig, String hostGoal, bool wingmanRequestsEnabled, bool contextualOpenersEnabled, bool compatibilityAffectsRanking, EventSuccessQuestionnaireConfig questionnaireConfig, EventSuccessConversationGraphConsentMode conversationGraphConsentMode, int activeStepIndex, List<EventSuccessPlanStep>? stepOverrides, int? stepStartedAtMs, int? pausedAtMs, List<EventSuccessCrawlStopChange>? crawlStopChanges, int liveControlRevision, int assignmentDraftRevision, int publishedRotationRoundIndex, int publishedRevealRoundIndex, EventSuccessPlanStatus status, EventSuccessRevealStatus revealStatus, int activeRevealRoundIndex,@NullableTimestampConverter() DateTime? revealStartedAt, String? attendeePrompt,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? frozenAt,@NullableTimestampConverter() DateTime? completedAt
});




}
/// @nodoc
class _$EventSuccessPlanCopyWithImpl<$Res>
    implements $EventSuccessPlanCopyWith<$Res> {
  _$EventSuccessPlanCopyWithImpl(this._self, this._then);

  final EventSuccessPlan _self;
  final $Res Function(EventSuccessPlan) _then;

/// Create a copy of EventSuccessPlan
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? organizerId = null,Object? layoutId = freezed,Object? playbookId = null,Object? selectedModuleIds = null,Object? targetAttendeeCount = null,Object? structureConfig = null,Object? hostGoal = null,Object? wingmanRequestsEnabled = null,Object? contextualOpenersEnabled = null,Object? compatibilityAffectsRanking = null,Object? questionnaireConfig = null,Object? conversationGraphConsentMode = null,Object? activeStepIndex = null,Object? stepOverrides = freezed,Object? stepStartedAtMs = freezed,Object? pausedAtMs = freezed,Object? crawlStopChanges = freezed,Object? liveControlRevision = null,Object? assignmentDraftRevision = null,Object? publishedRotationRoundIndex = null,Object? publishedRevealRoundIndex = null,Object? status = null,Object? revealStatus = null,Object? activeRevealRoundIndex = null,Object? revealStartedAt = freezed,Object? attendeePrompt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? frozenAt = freezed,Object? completedAt = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,layoutId: freezed == layoutId ? _self.layoutId : layoutId // ignore: cast_nullable_to_non_nullable
as String?,playbookId: null == playbookId ? _self.playbookId : playbookId // ignore: cast_nullable_to_non_nullable
as String,selectedModuleIds: null == selectedModuleIds ? _self.selectedModuleIds : selectedModuleIds // ignore: cast_nullable_to_non_nullable
as List<String>,targetAttendeeCount: null == targetAttendeeCount ? _self.targetAttendeeCount : targetAttendeeCount // ignore: cast_nullable_to_non_nullable
as int,structureConfig: null == structureConfig ? _self.structureConfig : structureConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessStructureConfig,hostGoal: null == hostGoal ? _self.hostGoal : hostGoal // ignore: cast_nullable_to_non_nullable
as String,wingmanRequestsEnabled: null == wingmanRequestsEnabled ? _self.wingmanRequestsEnabled : wingmanRequestsEnabled // ignore: cast_nullable_to_non_nullable
as bool,contextualOpenersEnabled: null == contextualOpenersEnabled ? _self.contextualOpenersEnabled : contextualOpenersEnabled // ignore: cast_nullable_to_non_nullable
as bool,compatibilityAffectsRanking: null == compatibilityAffectsRanking ? _self.compatibilityAffectsRanking : compatibilityAffectsRanking // ignore: cast_nullable_to_non_nullable
as bool,questionnaireConfig: null == questionnaireConfig ? _self.questionnaireConfig : questionnaireConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessQuestionnaireConfig,conversationGraphConsentMode: null == conversationGraphConsentMode ? _self.conversationGraphConsentMode : conversationGraphConsentMode // ignore: cast_nullable_to_non_nullable
as EventSuccessConversationGraphConsentMode,activeStepIndex: null == activeStepIndex ? _self.activeStepIndex : activeStepIndex // ignore: cast_nullable_to_non_nullable
as int,stepOverrides: freezed == stepOverrides ? _self.stepOverrides : stepOverrides // ignore: cast_nullable_to_non_nullable
as List<EventSuccessPlanStep>?,stepStartedAtMs: freezed == stepStartedAtMs ? _self.stepStartedAtMs : stepStartedAtMs // ignore: cast_nullable_to_non_nullable
as int?,pausedAtMs: freezed == pausedAtMs ? _self.pausedAtMs : pausedAtMs // ignore: cast_nullable_to_non_nullable
as int?,crawlStopChanges: freezed == crawlStopChanges ? _self.crawlStopChanges : crawlStopChanges // ignore: cast_nullable_to_non_nullable
as List<EventSuccessCrawlStopChange>?,liveControlRevision: null == liveControlRevision ? _self.liveControlRevision : liveControlRevision // ignore: cast_nullable_to_non_nullable
as int,assignmentDraftRevision: null == assignmentDraftRevision ? _self.assignmentDraftRevision : assignmentDraftRevision // ignore: cast_nullable_to_non_nullable
as int,publishedRotationRoundIndex: null == publishedRotationRoundIndex ? _self.publishedRotationRoundIndex : publishedRotationRoundIndex // ignore: cast_nullable_to_non_nullable
as int,publishedRevealRoundIndex: null == publishedRevealRoundIndex ? _self.publishedRevealRoundIndex : publishedRevealRoundIndex // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventSuccessPlanStatus,revealStatus: null == revealStatus ? _self.revealStatus : revealStatus // ignore: cast_nullable_to_non_nullable
as EventSuccessRevealStatus,activeRevealRoundIndex: null == activeRevealRoundIndex ? _self.activeRevealRoundIndex : activeRevealRoundIndex // ignore: cast_nullable_to_non_nullable
as int,revealStartedAt: freezed == revealStartedAt ? _self.revealStartedAt : revealStartedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendeePrompt: freezed == attendeePrompt ? _self.attendeePrompt : attendeePrompt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,frozenAt: freezed == frozenAt ? _self.frozenAt : frozenAt // ignore: cast_nullable_to_non_nullable
as DateTime?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}

}


/// Adds pattern-matching-related methods to [EventSuccessPlan].
extension EventSuccessPlanPatterns on EventSuccessPlan {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventSuccessPlan value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventSuccessPlan() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventSuccessPlan value)  $default,){
final _that = this;
switch (_that) {
case _EventSuccessPlan():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventSuccessPlan value)?  $default,){
final _that = this;
switch (_that) {
case _EventSuccessPlan() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  int targetAttendeeCount,  EventSuccessStructureConfig structureConfig,  String hostGoal,  bool wingmanRequestsEnabled,  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  EventSuccessConversationGraphConsentMode conversationGraphConsentMode,  int activeStepIndex,  List<EventSuccessPlanStep>? stepOverrides,  int? stepStartedAtMs,  int? pausedAtMs,  List<EventSuccessCrawlStopChange>? crawlStopChanges,  int liveControlRevision,  int assignmentDraftRevision,  int publishedRotationRoundIndex,  int publishedRevealRoundIndex,  EventSuccessPlanStatus status,  EventSuccessRevealStatus revealStatus,  int activeRevealRoundIndex, @NullableTimestampConverter()  DateTime? revealStartedAt,  String? attendeePrompt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? frozenAt, @NullableTimestampConverter()  DateTime? completedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventSuccessPlan() when $default != null:
return $default(_that.id,_that.eventId,_that.organizerId,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.targetAttendeeCount,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.conversationGraphConsentMode,_that.activeStepIndex,_that.stepOverrides,_that.stepStartedAtMs,_that.pausedAtMs,_that.crawlStopChanges,_that.liveControlRevision,_that.assignmentDraftRevision,_that.publishedRotationRoundIndex,_that.publishedRevealRoundIndex,_that.status,_that.revealStatus,_that.activeRevealRoundIndex,_that.revealStartedAt,_that.attendeePrompt,_that.createdAt,_that.updatedAt,_that.frozenAt,_that.completedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  int targetAttendeeCount,  EventSuccessStructureConfig structureConfig,  String hostGoal,  bool wingmanRequestsEnabled,  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  EventSuccessConversationGraphConsentMode conversationGraphConsentMode,  int activeStepIndex,  List<EventSuccessPlanStep>? stepOverrides,  int? stepStartedAtMs,  int? pausedAtMs,  List<EventSuccessCrawlStopChange>? crawlStopChanges,  int liveControlRevision,  int assignmentDraftRevision,  int publishedRotationRoundIndex,  int publishedRevealRoundIndex,  EventSuccessPlanStatus status,  EventSuccessRevealStatus revealStatus,  int activeRevealRoundIndex, @NullableTimestampConverter()  DateTime? revealStartedAt,  String? attendeePrompt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? frozenAt, @NullableTimestampConverter()  DateTime? completedAt)  $default,) {final _that = this;
switch (_that) {
case _EventSuccessPlan():
return $default(_that.id,_that.eventId,_that.organizerId,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.targetAttendeeCount,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.conversationGraphConsentMode,_that.activeStepIndex,_that.stepOverrides,_that.stepStartedAtMs,_that.pausedAtMs,_that.crawlStopChanges,_that.liveControlRevision,_that.assignmentDraftRevision,_that.publishedRotationRoundIndex,_that.publishedRevealRoundIndex,_that.status,_that.revealStatus,_that.activeRevealRoundIndex,_that.revealStartedAt,_that.attendeePrompt,_that.createdAt,_that.updatedAt,_that.frozenAt,_that.completedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String? layoutId,  String playbookId,  List<String> selectedModuleIds,  int targetAttendeeCount,  EventSuccessStructureConfig structureConfig,  String hostGoal,  bool wingmanRequestsEnabled,  bool contextualOpenersEnabled,  bool compatibilityAffectsRanking,  EventSuccessQuestionnaireConfig questionnaireConfig,  EventSuccessConversationGraphConsentMode conversationGraphConsentMode,  int activeStepIndex,  List<EventSuccessPlanStep>? stepOverrides,  int? stepStartedAtMs,  int? pausedAtMs,  List<EventSuccessCrawlStopChange>? crawlStopChanges,  int liveControlRevision,  int assignmentDraftRevision,  int publishedRotationRoundIndex,  int publishedRevealRoundIndex,  EventSuccessPlanStatus status,  EventSuccessRevealStatus revealStatus,  int activeRevealRoundIndex, @NullableTimestampConverter()  DateTime? revealStartedAt,  String? attendeePrompt, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt, @NullableTimestampConverter()  DateTime? frozenAt, @NullableTimestampConverter()  DateTime? completedAt)?  $default,) {final _that = this;
switch (_that) {
case _EventSuccessPlan() when $default != null:
return $default(_that.id,_that.eventId,_that.organizerId,_that.layoutId,_that.playbookId,_that.selectedModuleIds,_that.targetAttendeeCount,_that.structureConfig,_that.hostGoal,_that.wingmanRequestsEnabled,_that.contextualOpenersEnabled,_that.compatibilityAffectsRanking,_that.questionnaireConfig,_that.conversationGraphConsentMode,_that.activeStepIndex,_that.stepOverrides,_that.stepStartedAtMs,_that.pausedAtMs,_that.crawlStopChanges,_that.liveControlRevision,_that.assignmentDraftRevision,_that.publishedRotationRoundIndex,_that.publishedRevealRoundIndex,_that.status,_that.revealStatus,_that.activeRevealRoundIndex,_that.revealStartedAt,_that.attendeePrompt,_that.createdAt,_that.updatedAt,_that.frozenAt,_that.completedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventSuccessPlan extends EventSuccessPlan {
  const _EventSuccessPlan({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.organizerId, this.layoutId, required this.playbookId, required final  List<String> selectedModuleIds, required this.targetAttendeeCount, this.structureConfig = const EventSuccessStructureConfig.legacyDefault(), required this.hostGoal, this.wingmanRequestsEnabled = true, this.contextualOpenersEnabled = true, this.compatibilityAffectsRanking = false, this.questionnaireConfig = const EventSuccessQuestionnaireConfig.defaultTemplate(), this.conversationGraphConsentMode = EventSuccessConversationGraphConsentMode.optIn, this.activeStepIndex = 0, final  List<EventSuccessPlanStep>? stepOverrides, this.stepStartedAtMs, this.pausedAtMs, final  List<EventSuccessCrawlStopChange>? crawlStopChanges, this.liveControlRevision = 0, this.assignmentDraftRevision = 0, this.publishedRotationRoundIndex = -1, this.publishedRevealRoundIndex = -1, this.status = EventSuccessPlanStatus.setup, this.revealStatus = EventSuccessRevealStatus.idle, this.activeRevealRoundIndex = 0, @NullableTimestampConverter() this.revealStartedAt, this.attendeePrompt, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt, @NullableTimestampConverter() this.frozenAt, @NullableTimestampConverter() this.completedAt}): _selectedModuleIds = selectedModuleIds,_stepOverrides = stepOverrides,_crawlStopChanges = crawlStopChanges,super._();
  factory _EventSuccessPlan.fromJson(Map<String, dynamic> json) => _$EventSuccessPlanFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String organizerId;
@override final  String? layoutId;
@override final  String playbookId;
 final  List<String> _selectedModuleIds;
@override List<String> get selectedModuleIds {
  if (_selectedModuleIds is EqualUnmodifiableListView) return _selectedModuleIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_selectedModuleIds);
}

@override final  int targetAttendeeCount;
@override@JsonKey() final  EventSuccessStructureConfig structureConfig;
@override final  String hostGoal;
@override@JsonKey() final  bool wingmanRequestsEnabled;
@override@JsonKey() final  bool contextualOpenersEnabled;
@override@JsonKey() final  bool compatibilityAffectsRanking;
@override@JsonKey() final  EventSuccessQuestionnaireConfig questionnaireConfig;
@override@JsonKey() final  EventSuccessConversationGraphConsentMode conversationGraphConsentMode;
@override@JsonKey() final  int activeStepIndex;
/// The host's edited run of show; null while it follows the playbook.
 final  List<EventSuccessPlanStep>? _stepOverrides;
/// The host's edited run of show; null while it follows the playbook.
@override List<EventSuccessPlanStep>? get stepOverrides {
  final value = _stepOverrides;
  if (value == null) return null;
  if (_stepOverrides is EqualUnmodifiableListView) return _stepOverrides;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}

/// Server milliseconds the active step started, moved later by paused
/// spans; null on plans that predate it, whose time follows the
/// schedule.
@override final  int? stepStartedAtMs;
/// Server milliseconds the active step was paused; null while it runs.
@override final  int? pausedAtMs;
/// Crawl stops the host changed on the night, by itinerary item id;
/// null while the route is the itinerary as published.
 final  List<EventSuccessCrawlStopChange>? _crawlStopChanges;
/// Crawl stops the host changed on the night, by itinerary item id;
/// null while the route is the itinerary as published.
@override List<EventSuccessCrawlStopChange>? get crawlStopChanges {
  final value = _crawlStopChanges;
  if (value == null) return null;
  if (_crawlStopChanges is EqualUnmodifiableListView) return _crawlStopChanges;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}

@override@JsonKey() final  int liveControlRevision;
@override@JsonKey() final  int assignmentDraftRevision;
@override@JsonKey() final  int publishedRotationRoundIndex;
@override@JsonKey() final  int publishedRevealRoundIndex;
@override@JsonKey() final  EventSuccessPlanStatus status;
@override@JsonKey() final  EventSuccessRevealStatus revealStatus;
@override@JsonKey() final  int activeRevealRoundIndex;
@override@NullableTimestampConverter() final  DateTime? revealStartedAt;
@override final  String? attendeePrompt;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;
@override@NullableTimestampConverter() final  DateTime? frozenAt;
@override@NullableTimestampConverter() final  DateTime? completedAt;

/// Create a copy of EventSuccessPlan
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventSuccessPlanCopyWith<_EventSuccessPlan> get copyWith => __$EventSuccessPlanCopyWithImpl<_EventSuccessPlan>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventSuccessPlanToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventSuccessPlan&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.layoutId, layoutId) || other.layoutId == layoutId)&&(identical(other.playbookId, playbookId) || other.playbookId == playbookId)&&const DeepCollectionEquality().equals(other._selectedModuleIds, _selectedModuleIds)&&(identical(other.targetAttendeeCount, targetAttendeeCount) || other.targetAttendeeCount == targetAttendeeCount)&&(identical(other.structureConfig, structureConfig) || other.structureConfig == structureConfig)&&(identical(other.hostGoal, hostGoal) || other.hostGoal == hostGoal)&&(identical(other.wingmanRequestsEnabled, wingmanRequestsEnabled) || other.wingmanRequestsEnabled == wingmanRequestsEnabled)&&(identical(other.contextualOpenersEnabled, contextualOpenersEnabled) || other.contextualOpenersEnabled == contextualOpenersEnabled)&&(identical(other.compatibilityAffectsRanking, compatibilityAffectsRanking) || other.compatibilityAffectsRanking == compatibilityAffectsRanking)&&(identical(other.questionnaireConfig, questionnaireConfig) || other.questionnaireConfig == questionnaireConfig)&&(identical(other.conversationGraphConsentMode, conversationGraphConsentMode) || other.conversationGraphConsentMode == conversationGraphConsentMode)&&(identical(other.activeStepIndex, activeStepIndex) || other.activeStepIndex == activeStepIndex)&&const DeepCollectionEquality().equals(other._stepOverrides, _stepOverrides)&&(identical(other.stepStartedAtMs, stepStartedAtMs) || other.stepStartedAtMs == stepStartedAtMs)&&(identical(other.pausedAtMs, pausedAtMs) || other.pausedAtMs == pausedAtMs)&&const DeepCollectionEquality().equals(other._crawlStopChanges, _crawlStopChanges)&&(identical(other.liveControlRevision, liveControlRevision) || other.liveControlRevision == liveControlRevision)&&(identical(other.assignmentDraftRevision, assignmentDraftRevision) || other.assignmentDraftRevision == assignmentDraftRevision)&&(identical(other.publishedRotationRoundIndex, publishedRotationRoundIndex) || other.publishedRotationRoundIndex == publishedRotationRoundIndex)&&(identical(other.publishedRevealRoundIndex, publishedRevealRoundIndex) || other.publishedRevealRoundIndex == publishedRevealRoundIndex)&&(identical(other.status, status) || other.status == status)&&(identical(other.revealStatus, revealStatus) || other.revealStatus == revealStatus)&&(identical(other.activeRevealRoundIndex, activeRevealRoundIndex) || other.activeRevealRoundIndex == activeRevealRoundIndex)&&(identical(other.revealStartedAt, revealStartedAt) || other.revealStartedAt == revealStartedAt)&&(identical(other.attendeePrompt, attendeePrompt) || other.attendeePrompt == attendeePrompt)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.frozenAt, frozenAt) || other.frozenAt == frozenAt)&&(identical(other.completedAt, completedAt) || other.completedAt == completedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,eventId,organizerId,layoutId,playbookId,const DeepCollectionEquality().hash(_selectedModuleIds),targetAttendeeCount,structureConfig,hostGoal,wingmanRequestsEnabled,contextualOpenersEnabled,compatibilityAffectsRanking,questionnaireConfig,conversationGraphConsentMode,activeStepIndex,const DeepCollectionEquality().hash(_stepOverrides),stepStartedAtMs,pausedAtMs,const DeepCollectionEquality().hash(_crawlStopChanges),liveControlRevision,assignmentDraftRevision,publishedRotationRoundIndex,publishedRevealRoundIndex,status,revealStatus,activeRevealRoundIndex,revealStartedAt,attendeePrompt,createdAt,updatedAt,frozenAt,completedAt]);

@override
String toString() {
  return 'EventSuccessPlan(id: $id, eventId: $eventId, organizerId: $organizerId, layoutId: $layoutId, playbookId: $playbookId, selectedModuleIds: $selectedModuleIds, targetAttendeeCount: $targetAttendeeCount, structureConfig: $structureConfig, hostGoal: $hostGoal, wingmanRequestsEnabled: $wingmanRequestsEnabled, contextualOpenersEnabled: $contextualOpenersEnabled, compatibilityAffectsRanking: $compatibilityAffectsRanking, questionnaireConfig: $questionnaireConfig, conversationGraphConsentMode: $conversationGraphConsentMode, activeStepIndex: $activeStepIndex, stepOverrides: $stepOverrides, stepStartedAtMs: $stepStartedAtMs, pausedAtMs: $pausedAtMs, crawlStopChanges: $crawlStopChanges, liveControlRevision: $liveControlRevision, assignmentDraftRevision: $assignmentDraftRevision, publishedRotationRoundIndex: $publishedRotationRoundIndex, publishedRevealRoundIndex: $publishedRevealRoundIndex, status: $status, revealStatus: $revealStatus, activeRevealRoundIndex: $activeRevealRoundIndex, revealStartedAt: $revealStartedAt, attendeePrompt: $attendeePrompt, createdAt: $createdAt, updatedAt: $updatedAt, frozenAt: $frozenAt, completedAt: $completedAt)';
}


}

/// @nodoc
abstract mixin class _$EventSuccessPlanCopyWith<$Res> implements $EventSuccessPlanCopyWith<$Res> {
  factory _$EventSuccessPlanCopyWith(_EventSuccessPlan value, $Res Function(_EventSuccessPlan) _then) = __$EventSuccessPlanCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String organizerId, String? layoutId, String playbookId, List<String> selectedModuleIds, int targetAttendeeCount, EventSuccessStructureConfig structureConfig, String hostGoal, bool wingmanRequestsEnabled, bool contextualOpenersEnabled, bool compatibilityAffectsRanking, EventSuccessQuestionnaireConfig questionnaireConfig, EventSuccessConversationGraphConsentMode conversationGraphConsentMode, int activeStepIndex, List<EventSuccessPlanStep>? stepOverrides, int? stepStartedAtMs, int? pausedAtMs, List<EventSuccessCrawlStopChange>? crawlStopChanges, int liveControlRevision, int assignmentDraftRevision, int publishedRotationRoundIndex, int publishedRevealRoundIndex, EventSuccessPlanStatus status, EventSuccessRevealStatus revealStatus, int activeRevealRoundIndex,@NullableTimestampConverter() DateTime? revealStartedAt, String? attendeePrompt,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt,@NullableTimestampConverter() DateTime? frozenAt,@NullableTimestampConverter() DateTime? completedAt
});




}
/// @nodoc
class __$EventSuccessPlanCopyWithImpl<$Res>
    implements _$EventSuccessPlanCopyWith<$Res> {
  __$EventSuccessPlanCopyWithImpl(this._self, this._then);

  final _EventSuccessPlan _self;
  final $Res Function(_EventSuccessPlan) _then;

/// Create a copy of EventSuccessPlan
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? organizerId = null,Object? layoutId = freezed,Object? playbookId = null,Object? selectedModuleIds = null,Object? targetAttendeeCount = null,Object? structureConfig = null,Object? hostGoal = null,Object? wingmanRequestsEnabled = null,Object? contextualOpenersEnabled = null,Object? compatibilityAffectsRanking = null,Object? questionnaireConfig = null,Object? conversationGraphConsentMode = null,Object? activeStepIndex = null,Object? stepOverrides = freezed,Object? stepStartedAtMs = freezed,Object? pausedAtMs = freezed,Object? crawlStopChanges = freezed,Object? liveControlRevision = null,Object? assignmentDraftRevision = null,Object? publishedRotationRoundIndex = null,Object? publishedRevealRoundIndex = null,Object? status = null,Object? revealStatus = null,Object? activeRevealRoundIndex = null,Object? revealStartedAt = freezed,Object? attendeePrompt = freezed,Object? createdAt = null,Object? updatedAt = null,Object? frozenAt = freezed,Object? completedAt = freezed,}) {
  return _then(_EventSuccessPlan(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,layoutId: freezed == layoutId ? _self.layoutId : layoutId // ignore: cast_nullable_to_non_nullable
as String?,playbookId: null == playbookId ? _self.playbookId : playbookId // ignore: cast_nullable_to_non_nullable
as String,selectedModuleIds: null == selectedModuleIds ? _self._selectedModuleIds : selectedModuleIds // ignore: cast_nullable_to_non_nullable
as List<String>,targetAttendeeCount: null == targetAttendeeCount ? _self.targetAttendeeCount : targetAttendeeCount // ignore: cast_nullable_to_non_nullable
as int,structureConfig: null == structureConfig ? _self.structureConfig : structureConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessStructureConfig,hostGoal: null == hostGoal ? _self.hostGoal : hostGoal // ignore: cast_nullable_to_non_nullable
as String,wingmanRequestsEnabled: null == wingmanRequestsEnabled ? _self.wingmanRequestsEnabled : wingmanRequestsEnabled // ignore: cast_nullable_to_non_nullable
as bool,contextualOpenersEnabled: null == contextualOpenersEnabled ? _self.contextualOpenersEnabled : contextualOpenersEnabled // ignore: cast_nullable_to_non_nullable
as bool,compatibilityAffectsRanking: null == compatibilityAffectsRanking ? _self.compatibilityAffectsRanking : compatibilityAffectsRanking // ignore: cast_nullable_to_non_nullable
as bool,questionnaireConfig: null == questionnaireConfig ? _self.questionnaireConfig : questionnaireConfig // ignore: cast_nullable_to_non_nullable
as EventSuccessQuestionnaireConfig,conversationGraphConsentMode: null == conversationGraphConsentMode ? _self.conversationGraphConsentMode : conversationGraphConsentMode // ignore: cast_nullable_to_non_nullable
as EventSuccessConversationGraphConsentMode,activeStepIndex: null == activeStepIndex ? _self.activeStepIndex : activeStepIndex // ignore: cast_nullable_to_non_nullable
as int,stepOverrides: freezed == stepOverrides ? _self._stepOverrides : stepOverrides // ignore: cast_nullable_to_non_nullable
as List<EventSuccessPlanStep>?,stepStartedAtMs: freezed == stepStartedAtMs ? _self.stepStartedAtMs : stepStartedAtMs // ignore: cast_nullable_to_non_nullable
as int?,pausedAtMs: freezed == pausedAtMs ? _self.pausedAtMs : pausedAtMs // ignore: cast_nullable_to_non_nullable
as int?,crawlStopChanges: freezed == crawlStopChanges ? _self._crawlStopChanges : crawlStopChanges // ignore: cast_nullable_to_non_nullable
as List<EventSuccessCrawlStopChange>?,liveControlRevision: null == liveControlRevision ? _self.liveControlRevision : liveControlRevision // ignore: cast_nullable_to_non_nullable
as int,assignmentDraftRevision: null == assignmentDraftRevision ? _self.assignmentDraftRevision : assignmentDraftRevision // ignore: cast_nullable_to_non_nullable
as int,publishedRotationRoundIndex: null == publishedRotationRoundIndex ? _self.publishedRotationRoundIndex : publishedRotationRoundIndex // ignore: cast_nullable_to_non_nullable
as int,publishedRevealRoundIndex: null == publishedRevealRoundIndex ? _self.publishedRevealRoundIndex : publishedRevealRoundIndex // ignore: cast_nullable_to_non_nullable
as int,status: null == status ? _self.status : status // ignore: cast_nullable_to_non_nullable
as EventSuccessPlanStatus,revealStatus: null == revealStatus ? _self.revealStatus : revealStatus // ignore: cast_nullable_to_non_nullable
as EventSuccessRevealStatus,activeRevealRoundIndex: null == activeRevealRoundIndex ? _self.activeRevealRoundIndex : activeRevealRoundIndex // ignore: cast_nullable_to_non_nullable
as int,revealStartedAt: freezed == revealStartedAt ? _self.revealStartedAt : revealStartedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,attendeePrompt: freezed == attendeePrompt ? _self.attendeePrompt : attendeePrompt // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,frozenAt: freezed == frozenAt ? _self.frozenAt : frozenAt // ignore: cast_nullable_to_non_nullable
as DateTime?,completedAt: freezed == completedAt ? _self.completedAt : completedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,
  ));
}


}


/// @nodoc
mixin _$EventSuccessCrawlStopChange {

 String get stopId; String get title; String? get address; int get changedAtMs;
/// Create a copy of EventSuccessCrawlStopChange
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventSuccessCrawlStopChangeCopyWith<EventSuccessCrawlStopChange> get copyWith => _$EventSuccessCrawlStopChangeCopyWithImpl<EventSuccessCrawlStopChange>(this as EventSuccessCrawlStopChange, _$identity);

  /// Serializes this EventSuccessCrawlStopChange to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventSuccessCrawlStopChange&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.title, title) || other.title == title)&&(identical(other.address, address) || other.address == address)&&(identical(other.changedAtMs, changedAtMs) || other.changedAtMs == changedAtMs));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stopId,title,address,changedAtMs);

@override
String toString() {
  return 'EventSuccessCrawlStopChange(stopId: $stopId, title: $title, address: $address, changedAtMs: $changedAtMs)';
}


}

/// @nodoc
abstract mixin class $EventSuccessCrawlStopChangeCopyWith<$Res>  {
  factory $EventSuccessCrawlStopChangeCopyWith(EventSuccessCrawlStopChange value, $Res Function(EventSuccessCrawlStopChange) _then) = _$EventSuccessCrawlStopChangeCopyWithImpl;
@useResult
$Res call({
 String stopId, String title, String? address, int changedAtMs
});




}
/// @nodoc
class _$EventSuccessCrawlStopChangeCopyWithImpl<$Res>
    implements $EventSuccessCrawlStopChangeCopyWith<$Res> {
  _$EventSuccessCrawlStopChangeCopyWithImpl(this._self, this._then);

  final EventSuccessCrawlStopChange _self;
  final $Res Function(EventSuccessCrawlStopChange) _then;

/// Create a copy of EventSuccessCrawlStopChange
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stopId = null,Object? title = null,Object? address = freezed,Object? changedAtMs = null,}) {
  return _then(_self.copyWith(
stopId: null == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,changedAtMs: null == changedAtMs ? _self.changedAtMs : changedAtMs // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [EventSuccessCrawlStopChange].
extension EventSuccessCrawlStopChangePatterns on EventSuccessCrawlStopChange {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventSuccessCrawlStopChange value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventSuccessCrawlStopChange value)  $default,){
final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventSuccessCrawlStopChange value)?  $default,){
final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String stopId,  String title,  String? address,  int changedAtMs)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange() when $default != null:
return $default(_that.stopId,_that.title,_that.address,_that.changedAtMs);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String stopId,  String title,  String? address,  int changedAtMs)  $default,) {final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange():
return $default(_that.stopId,_that.title,_that.address,_that.changedAtMs);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String stopId,  String title,  String? address,  int changedAtMs)?  $default,) {final _that = this;
switch (_that) {
case _EventSuccessCrawlStopChange() when $default != null:
return $default(_that.stopId,_that.title,_that.address,_that.changedAtMs);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventSuccessCrawlStopChange implements EventSuccessCrawlStopChange {
  const _EventSuccessCrawlStopChange({required this.stopId, required this.title, this.address, required this.changedAtMs});
  factory _EventSuccessCrawlStopChange.fromJson(Map<String, dynamic> json) => _$EventSuccessCrawlStopChangeFromJson(json);

@override final  String stopId;
@override final  String title;
@override final  String? address;
@override final  int changedAtMs;

/// Create a copy of EventSuccessCrawlStopChange
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventSuccessCrawlStopChangeCopyWith<_EventSuccessCrawlStopChange> get copyWith => __$EventSuccessCrawlStopChangeCopyWithImpl<_EventSuccessCrawlStopChange>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventSuccessCrawlStopChangeToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventSuccessCrawlStopChange&&(identical(other.stopId, stopId) || other.stopId == stopId)&&(identical(other.title, title) || other.title == title)&&(identical(other.address, address) || other.address == address)&&(identical(other.changedAtMs, changedAtMs) || other.changedAtMs == changedAtMs));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stopId,title,address,changedAtMs);

@override
String toString() {
  return 'EventSuccessCrawlStopChange(stopId: $stopId, title: $title, address: $address, changedAtMs: $changedAtMs)';
}


}

/// @nodoc
abstract mixin class _$EventSuccessCrawlStopChangeCopyWith<$Res> implements $EventSuccessCrawlStopChangeCopyWith<$Res> {
  factory _$EventSuccessCrawlStopChangeCopyWith(_EventSuccessCrawlStopChange value, $Res Function(_EventSuccessCrawlStopChange) _then) = __$EventSuccessCrawlStopChangeCopyWithImpl;
@override @useResult
$Res call({
 String stopId, String title, String? address, int changedAtMs
});




}
/// @nodoc
class __$EventSuccessCrawlStopChangeCopyWithImpl<$Res>
    implements _$EventSuccessCrawlStopChangeCopyWith<$Res> {
  __$EventSuccessCrawlStopChangeCopyWithImpl(this._self, this._then);

  final _EventSuccessCrawlStopChange _self;
  final $Res Function(_EventSuccessCrawlStopChange) _then;

/// Create a copy of EventSuccessCrawlStopChange
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stopId = null,Object? title = null,Object? address = freezed,Object? changedAtMs = null,}) {
  return _then(_EventSuccessCrawlStopChange(
stopId: null == stopId ? _self.stopId : stopId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,changedAtMs: null == changedAtMs ? _self.changedAtMs : changedAtMs // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$EventSuccessPlanStep {

 String get stepId; String get title; int get durationMinutes; String get hostInstruction; String get attendeeExperience;@JsonKey(unknownEnumValue: EventSuccessStage.activity) EventSuccessStage get stage; List<String> get moduleIds;
/// Create a copy of EventSuccessPlanStep
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventSuccessPlanStepCopyWith<EventSuccessPlanStep> get copyWith => _$EventSuccessPlanStepCopyWithImpl<EventSuccessPlanStep>(this as EventSuccessPlanStep, _$identity);

  /// Serializes this EventSuccessPlanStep to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventSuccessPlanStep&&(identical(other.stepId, stepId) || other.stepId == stepId)&&(identical(other.title, title) || other.title == title)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.hostInstruction, hostInstruction) || other.hostInstruction == hostInstruction)&&(identical(other.attendeeExperience, attendeeExperience) || other.attendeeExperience == attendeeExperience)&&(identical(other.stage, stage) || other.stage == stage)&&const DeepCollectionEquality().equals(other.moduleIds, moduleIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stepId,title,durationMinutes,hostInstruction,attendeeExperience,stage,const DeepCollectionEquality().hash(moduleIds));

@override
String toString() {
  return 'EventSuccessPlanStep(stepId: $stepId, title: $title, durationMinutes: $durationMinutes, hostInstruction: $hostInstruction, attendeeExperience: $attendeeExperience, stage: $stage, moduleIds: $moduleIds)';
}


}

/// @nodoc
abstract mixin class $EventSuccessPlanStepCopyWith<$Res>  {
  factory $EventSuccessPlanStepCopyWith(EventSuccessPlanStep value, $Res Function(EventSuccessPlanStep) _then) = _$EventSuccessPlanStepCopyWithImpl;
@useResult
$Res call({
 String stepId, String title, int durationMinutes, String hostInstruction, String attendeeExperience,@JsonKey(unknownEnumValue: EventSuccessStage.activity) EventSuccessStage stage, List<String> moduleIds
});




}
/// @nodoc
class _$EventSuccessPlanStepCopyWithImpl<$Res>
    implements $EventSuccessPlanStepCopyWith<$Res> {
  _$EventSuccessPlanStepCopyWithImpl(this._self, this._then);

  final EventSuccessPlanStep _self;
  final $Res Function(EventSuccessPlanStep) _then;

/// Create a copy of EventSuccessPlanStep
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? stepId = null,Object? title = null,Object? durationMinutes = null,Object? hostInstruction = null,Object? attendeeExperience = null,Object? stage = null,Object? moduleIds = null,}) {
  return _then(_self.copyWith(
stepId: null == stepId ? _self.stepId : stepId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,durationMinutes: null == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int,hostInstruction: null == hostInstruction ? _self.hostInstruction : hostInstruction // ignore: cast_nullable_to_non_nullable
as String,attendeeExperience: null == attendeeExperience ? _self.attendeeExperience : attendeeExperience // ignore: cast_nullable_to_non_nullable
as String,stage: null == stage ? _self.stage : stage // ignore: cast_nullable_to_non_nullable
as EventSuccessStage,moduleIds: null == moduleIds ? _self.moduleIds : moduleIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}

}


/// Adds pattern-matching-related methods to [EventSuccessPlanStep].
extension EventSuccessPlanStepPatterns on EventSuccessPlanStep {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventSuccessPlanStep value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventSuccessPlanStep() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventSuccessPlanStep value)  $default,){
final _that = this;
switch (_that) {
case _EventSuccessPlanStep():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventSuccessPlanStep value)?  $default,){
final _that = this;
switch (_that) {
case _EventSuccessPlanStep() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String stepId,  String title,  int durationMinutes,  String hostInstruction,  String attendeeExperience, @JsonKey(unknownEnumValue: EventSuccessStage.activity)  EventSuccessStage stage,  List<String> moduleIds)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventSuccessPlanStep() when $default != null:
return $default(_that.stepId,_that.title,_that.durationMinutes,_that.hostInstruction,_that.attendeeExperience,_that.stage,_that.moduleIds);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String stepId,  String title,  int durationMinutes,  String hostInstruction,  String attendeeExperience, @JsonKey(unknownEnumValue: EventSuccessStage.activity)  EventSuccessStage stage,  List<String> moduleIds)  $default,) {final _that = this;
switch (_that) {
case _EventSuccessPlanStep():
return $default(_that.stepId,_that.title,_that.durationMinutes,_that.hostInstruction,_that.attendeeExperience,_that.stage,_that.moduleIds);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String stepId,  String title,  int durationMinutes,  String hostInstruction,  String attendeeExperience, @JsonKey(unknownEnumValue: EventSuccessStage.activity)  EventSuccessStage stage,  List<String> moduleIds)?  $default,) {final _that = this;
switch (_that) {
case _EventSuccessPlanStep() when $default != null:
return $default(_that.stepId,_that.title,_that.durationMinutes,_that.hostInstruction,_that.attendeeExperience,_that.stage,_that.moduleIds);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventSuccessPlanStep extends EventSuccessPlanStep {
  const _EventSuccessPlanStep({required this.stepId, required this.title, required this.durationMinutes, this.hostInstruction = '', this.attendeeExperience = '', @JsonKey(unknownEnumValue: EventSuccessStage.activity) this.stage = EventSuccessStage.activity, final  List<String> moduleIds = const <String>[]}): _moduleIds = moduleIds,super._();
  factory _EventSuccessPlanStep.fromJson(Map<String, dynamic> json) => _$EventSuccessPlanStepFromJson(json);

@override final  String stepId;
@override final  String title;
@override final  int durationMinutes;
@override@JsonKey() final  String hostInstruction;
@override@JsonKey() final  String attendeeExperience;
@override@JsonKey(unknownEnumValue: EventSuccessStage.activity) final  EventSuccessStage stage;
 final  List<String> _moduleIds;
@override@JsonKey() List<String> get moduleIds {
  if (_moduleIds is EqualUnmodifiableListView) return _moduleIds;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_moduleIds);
}


/// Create a copy of EventSuccessPlanStep
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventSuccessPlanStepCopyWith<_EventSuccessPlanStep> get copyWith => __$EventSuccessPlanStepCopyWithImpl<_EventSuccessPlanStep>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventSuccessPlanStepToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventSuccessPlanStep&&(identical(other.stepId, stepId) || other.stepId == stepId)&&(identical(other.title, title) || other.title == title)&&(identical(other.durationMinutes, durationMinutes) || other.durationMinutes == durationMinutes)&&(identical(other.hostInstruction, hostInstruction) || other.hostInstruction == hostInstruction)&&(identical(other.attendeeExperience, attendeeExperience) || other.attendeeExperience == attendeeExperience)&&(identical(other.stage, stage) || other.stage == stage)&&const DeepCollectionEquality().equals(other._moduleIds, _moduleIds));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,stepId,title,durationMinutes,hostInstruction,attendeeExperience,stage,const DeepCollectionEquality().hash(_moduleIds));

@override
String toString() {
  return 'EventSuccessPlanStep(stepId: $stepId, title: $title, durationMinutes: $durationMinutes, hostInstruction: $hostInstruction, attendeeExperience: $attendeeExperience, stage: $stage, moduleIds: $moduleIds)';
}


}

/// @nodoc
abstract mixin class _$EventSuccessPlanStepCopyWith<$Res> implements $EventSuccessPlanStepCopyWith<$Res> {
  factory _$EventSuccessPlanStepCopyWith(_EventSuccessPlanStep value, $Res Function(_EventSuccessPlanStep) _then) = __$EventSuccessPlanStepCopyWithImpl;
@override @useResult
$Res call({
 String stepId, String title, int durationMinutes, String hostInstruction, String attendeeExperience,@JsonKey(unknownEnumValue: EventSuccessStage.activity) EventSuccessStage stage, List<String> moduleIds
});




}
/// @nodoc
class __$EventSuccessPlanStepCopyWithImpl<$Res>
    implements _$EventSuccessPlanStepCopyWith<$Res> {
  __$EventSuccessPlanStepCopyWithImpl(this._self, this._then);

  final _EventSuccessPlanStep _self;
  final $Res Function(_EventSuccessPlanStep) _then;

/// Create a copy of EventSuccessPlanStep
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? stepId = null,Object? title = null,Object? durationMinutes = null,Object? hostInstruction = null,Object? attendeeExperience = null,Object? stage = null,Object? moduleIds = null,}) {
  return _then(_EventSuccessPlanStep(
stepId: null == stepId ? _self.stepId : stepId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,durationMinutes: null == durationMinutes ? _self.durationMinutes : durationMinutes // ignore: cast_nullable_to_non_nullable
as int,hostInstruction: null == hostInstruction ? _self.hostInstruction : hostInstruction // ignore: cast_nullable_to_non_nullable
as String,attendeeExperience: null == attendeeExperience ? _self.attendeeExperience : attendeeExperience // ignore: cast_nullable_to_non_nullable
as String,stage: null == stage ? _self.stage : stage // ignore: cast_nullable_to_non_nullable
as EventSuccessStage,moduleIds: null == moduleIds ? _self._moduleIds : moduleIds // ignore: cast_nullable_to_non_nullable
as List<String>,
  ));
}


}


/// @nodoc
mixin _$EventSuccessFeedback {

@JsonKey(includeToJson: false) String get id; String get eventId; String get organizerId; String get uid; int get welcomeRating; int get structureRating; int get metNewPeopleCount; bool get safetyConcern; String? get privateNote;@TimestampConverter() DateTime get createdAt;@TimestampConverter() DateTime get updatedAt;
/// Create a copy of EventSuccessFeedback
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$EventSuccessFeedbackCopyWith<EventSuccessFeedback> get copyWith => _$EventSuccessFeedbackCopyWithImpl<EventSuccessFeedback>(this as EventSuccessFeedback, _$identity);

  /// Serializes this EventSuccessFeedback to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is EventSuccessFeedback&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.welcomeRating, welcomeRating) || other.welcomeRating == welcomeRating)&&(identical(other.structureRating, structureRating) || other.structureRating == structureRating)&&(identical(other.metNewPeopleCount, metNewPeopleCount) || other.metNewPeopleCount == metNewPeopleCount)&&(identical(other.safetyConcern, safetyConcern) || other.safetyConcern == safetyConcern)&&(identical(other.privateNote, privateNote) || other.privateNote == privateNote)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,organizerId,uid,welcomeRating,structureRating,metNewPeopleCount,safetyConcern,privateNote,createdAt,updatedAt);

@override
String toString() {
  return 'EventSuccessFeedback(id: $id, eventId: $eventId, organizerId: $organizerId, uid: $uid, welcomeRating: $welcomeRating, structureRating: $structureRating, metNewPeopleCount: $metNewPeopleCount, safetyConcern: $safetyConcern, privateNote: $privateNote, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $EventSuccessFeedbackCopyWith<$Res>  {
  factory $EventSuccessFeedbackCopyWith(EventSuccessFeedback value, $Res Function(EventSuccessFeedback) _then) = _$EventSuccessFeedbackCopyWithImpl;
@useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String organizerId, String uid, int welcomeRating, int structureRating, int metNewPeopleCount, bool safetyConcern, String? privateNote,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class _$EventSuccessFeedbackCopyWithImpl<$Res>
    implements $EventSuccessFeedbackCopyWith<$Res> {
  _$EventSuccessFeedbackCopyWithImpl(this._self, this._then);

  final EventSuccessFeedback _self;
  final $Res Function(EventSuccessFeedback) _then;

/// Create a copy of EventSuccessFeedback
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? eventId = null,Object? organizerId = null,Object? uid = null,Object? welcomeRating = null,Object? structureRating = null,Object? metNewPeopleCount = null,Object? safetyConcern = null,Object? privateNote = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,welcomeRating: null == welcomeRating ? _self.welcomeRating : welcomeRating // ignore: cast_nullable_to_non_nullable
as int,structureRating: null == structureRating ? _self.structureRating : structureRating // ignore: cast_nullable_to_non_nullable
as int,metNewPeopleCount: null == metNewPeopleCount ? _self.metNewPeopleCount : metNewPeopleCount // ignore: cast_nullable_to_non_nullable
as int,safetyConcern: null == safetyConcern ? _self.safetyConcern : safetyConcern // ignore: cast_nullable_to_non_nullable
as bool,privateNote: freezed == privateNote ? _self.privateNote : privateNote // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [EventSuccessFeedback].
extension EventSuccessFeedbackPatterns on EventSuccessFeedback {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _EventSuccessFeedback value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _EventSuccessFeedback() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _EventSuccessFeedback value)  $default,){
final _that = this;
switch (_that) {
case _EventSuccessFeedback():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _EventSuccessFeedback value)?  $default,){
final _that = this;
switch (_that) {
case _EventSuccessFeedback() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String uid,  int welcomeRating,  int structureRating,  int metNewPeopleCount,  bool safetyConcern,  String? privateNote, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _EventSuccessFeedback() when $default != null:
return $default(_that.id,_that.eventId,_that.organizerId,_that.uid,_that.welcomeRating,_that.structureRating,_that.metNewPeopleCount,_that.safetyConcern,_that.privateNote,_that.createdAt,_that.updatedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String uid,  int welcomeRating,  int structureRating,  int metNewPeopleCount,  bool safetyConcern,  String? privateNote, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _EventSuccessFeedback():
return $default(_that.id,_that.eventId,_that.organizerId,_that.uid,_that.welcomeRating,_that.structureRating,_that.metNewPeopleCount,_that.safetyConcern,_that.privateNote,_that.createdAt,_that.updatedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function(@JsonKey(includeToJson: false)  String id,  String eventId,  String organizerId,  String uid,  int welcomeRating,  int structureRating,  int metNewPeopleCount,  bool safetyConcern,  String? privateNote, @TimestampConverter()  DateTime createdAt, @TimestampConverter()  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _EventSuccessFeedback() when $default != null:
return $default(_that.id,_that.eventId,_that.organizerId,_that.uid,_that.welcomeRating,_that.structureRating,_that.metNewPeopleCount,_that.safetyConcern,_that.privateNote,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _EventSuccessFeedback implements EventSuccessFeedback {
  const _EventSuccessFeedback({@JsonKey(includeToJson: false) required this.id, required this.eventId, required this.organizerId, required this.uid, required this.welcomeRating, required this.structureRating, required this.metNewPeopleCount, this.safetyConcern = false, this.privateNote, @TimestampConverter() required this.createdAt, @TimestampConverter() required this.updatedAt});
  factory _EventSuccessFeedback.fromJson(Map<String, dynamic> json) => _$EventSuccessFeedbackFromJson(json);

@override@JsonKey(includeToJson: false) final  String id;
@override final  String eventId;
@override final  String organizerId;
@override final  String uid;
@override final  int welcomeRating;
@override final  int structureRating;
@override final  int metNewPeopleCount;
@override@JsonKey() final  bool safetyConcern;
@override final  String? privateNote;
@override@TimestampConverter() final  DateTime createdAt;
@override@TimestampConverter() final  DateTime updatedAt;

/// Create a copy of EventSuccessFeedback
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$EventSuccessFeedbackCopyWith<_EventSuccessFeedback> get copyWith => __$EventSuccessFeedbackCopyWithImpl<_EventSuccessFeedback>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$EventSuccessFeedbackToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _EventSuccessFeedback&&(identical(other.id, id) || other.id == id)&&(identical(other.eventId, eventId) || other.eventId == eventId)&&(identical(other.organizerId, organizerId) || other.organizerId == organizerId)&&(identical(other.uid, uid) || other.uid == uid)&&(identical(other.welcomeRating, welcomeRating) || other.welcomeRating == welcomeRating)&&(identical(other.structureRating, structureRating) || other.structureRating == structureRating)&&(identical(other.metNewPeopleCount, metNewPeopleCount) || other.metNewPeopleCount == metNewPeopleCount)&&(identical(other.safetyConcern, safetyConcern) || other.safetyConcern == safetyConcern)&&(identical(other.privateNote, privateNote) || other.privateNote == privateNote)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,eventId,organizerId,uid,welcomeRating,structureRating,metNewPeopleCount,safetyConcern,privateNote,createdAt,updatedAt);

@override
String toString() {
  return 'EventSuccessFeedback(id: $id, eventId: $eventId, organizerId: $organizerId, uid: $uid, welcomeRating: $welcomeRating, structureRating: $structureRating, metNewPeopleCount: $metNewPeopleCount, safetyConcern: $safetyConcern, privateNote: $privateNote, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$EventSuccessFeedbackCopyWith<$Res> implements $EventSuccessFeedbackCopyWith<$Res> {
  factory _$EventSuccessFeedbackCopyWith(_EventSuccessFeedback value, $Res Function(_EventSuccessFeedback) _then) = __$EventSuccessFeedbackCopyWithImpl;
@override @useResult
$Res call({
@JsonKey(includeToJson: false) String id, String eventId, String organizerId, String uid, int welcomeRating, int structureRating, int metNewPeopleCount, bool safetyConcern, String? privateNote,@TimestampConverter() DateTime createdAt,@TimestampConverter() DateTime updatedAt
});




}
/// @nodoc
class __$EventSuccessFeedbackCopyWithImpl<$Res>
    implements _$EventSuccessFeedbackCopyWith<$Res> {
  __$EventSuccessFeedbackCopyWithImpl(this._self, this._then);

  final _EventSuccessFeedback _self;
  final $Res Function(_EventSuccessFeedback) _then;

/// Create a copy of EventSuccessFeedback
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? eventId = null,Object? organizerId = null,Object? uid = null,Object? welcomeRating = null,Object? structureRating = null,Object? metNewPeopleCount = null,Object? safetyConcern = null,Object? privateNote = freezed,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_EventSuccessFeedback(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,eventId: null == eventId ? _self.eventId : eventId // ignore: cast_nullable_to_non_nullable
as String,organizerId: null == organizerId ? _self.organizerId : organizerId // ignore: cast_nullable_to_non_nullable
as String,uid: null == uid ? _self.uid : uid // ignore: cast_nullable_to_non_nullable
as String,welcomeRating: null == welcomeRating ? _self.welcomeRating : welcomeRating // ignore: cast_nullable_to_non_nullable
as int,structureRating: null == structureRating ? _self.structureRating : structureRating // ignore: cast_nullable_to_non_nullable
as int,metNewPeopleCount: null == metNewPeopleCount ? _self.metNewPeopleCount : metNewPeopleCount // ignore: cast_nullable_to_non_nullable
as int,safetyConcern: null == safetyConcern ? _self.safetyConcern : safetyConcern // ignore: cast_nullable_to_non_nullable
as bool,privateNote: freezed == privateNote ? _self.privateNote : privateNote // ignore: cast_nullable_to_non_nullable
as String?,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}

// dart format on
