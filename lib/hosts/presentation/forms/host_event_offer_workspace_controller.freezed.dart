// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'host_event_offer_workspace_controller.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;
/// @nodoc
mixin _$HostEventOfferWorkspaceState {

 bool get busy; HostOfferWorkspaceStage get stage; bool get recoveringPending; bool get refreshTargetOnRetry; Object? get error; bool get selectionStale; List<String> get ids; String? get resultHash; List<HostOfferEventTarget> get events; String? get nextEventCursor; HostOfferEventTarget? get event; HostOfferEventConfiguration? get configuration; List<HostFormResponseDetail> get details; List<HostFormResponseDetail> get missingContacts; Map<String, String> get personalLinks; HostOfferBatchDraft? get draft; String? get commitRequestId; List<Map<String, Object?>> get offers; String? get nextOfferCursor; String? get refreshedReceiptId; HostEventOffer? get selectedOffer; HostOfferHandoff? get handoff; String? get referenceRequestId; String? get reviewRequestId; bool get messageCopied; bool get handoffOpenFailed; HostOfferFlowView get offerFlow; bool get actorAvailable;
/// Create a copy of HostEventOfferWorkspaceState
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$HostEventOfferWorkspaceStateCopyWith<HostEventOfferWorkspaceState> get copyWith => _$HostEventOfferWorkspaceStateCopyWithImpl<HostEventOfferWorkspaceState>(this as HostEventOfferWorkspaceState, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is HostEventOfferWorkspaceState&&(identical(other.busy, busy) || other.busy == busy)&&(identical(other.stage, stage) || other.stage == stage)&&(identical(other.recoveringPending, recoveringPending) || other.recoveringPending == recoveringPending)&&(identical(other.refreshTargetOnRetry, refreshTargetOnRetry) || other.refreshTargetOnRetry == refreshTargetOnRetry)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.selectionStale, selectionStale) || other.selectionStale == selectionStale)&&const DeepCollectionEquality().equals(other.ids, ids)&&(identical(other.resultHash, resultHash) || other.resultHash == resultHash)&&const DeepCollectionEquality().equals(other.events, events)&&(identical(other.nextEventCursor, nextEventCursor) || other.nextEventCursor == nextEventCursor)&&(identical(other.event, event) || other.event == event)&&(identical(other.configuration, configuration) || other.configuration == configuration)&&const DeepCollectionEquality().equals(other.details, details)&&const DeepCollectionEquality().equals(other.missingContacts, missingContacts)&&const DeepCollectionEquality().equals(other.personalLinks, personalLinks)&&(identical(other.draft, draft) || other.draft == draft)&&(identical(other.commitRequestId, commitRequestId) || other.commitRequestId == commitRequestId)&&const DeepCollectionEquality().equals(other.offers, offers)&&(identical(other.nextOfferCursor, nextOfferCursor) || other.nextOfferCursor == nextOfferCursor)&&(identical(other.refreshedReceiptId, refreshedReceiptId) || other.refreshedReceiptId == refreshedReceiptId)&&(identical(other.selectedOffer, selectedOffer) || other.selectedOffer == selectedOffer)&&(identical(other.handoff, handoff) || other.handoff == handoff)&&(identical(other.referenceRequestId, referenceRequestId) || other.referenceRequestId == referenceRequestId)&&(identical(other.reviewRequestId, reviewRequestId) || other.reviewRequestId == reviewRequestId)&&(identical(other.messageCopied, messageCopied) || other.messageCopied == messageCopied)&&(identical(other.handoffOpenFailed, handoffOpenFailed) || other.handoffOpenFailed == handoffOpenFailed)&&(identical(other.offerFlow, offerFlow) || other.offerFlow == offerFlow)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hashAll([runtimeType,busy,stage,recoveringPending,refreshTargetOnRetry,const DeepCollectionEquality().hash(error),selectionStale,const DeepCollectionEquality().hash(ids),resultHash,const DeepCollectionEquality().hash(events),nextEventCursor,event,configuration,const DeepCollectionEquality().hash(details),const DeepCollectionEquality().hash(missingContacts),const DeepCollectionEquality().hash(personalLinks),draft,commitRequestId,const DeepCollectionEquality().hash(offers),nextOfferCursor,refreshedReceiptId,selectedOffer,handoff,referenceRequestId,reviewRequestId,messageCopied,handoffOpenFailed,offerFlow,actorAvailable]);

@override
String toString() {
  return 'HostEventOfferWorkspaceState(busy: $busy, stage: $stage, recoveringPending: $recoveringPending, refreshTargetOnRetry: $refreshTargetOnRetry, error: $error, selectionStale: $selectionStale, ids: $ids, resultHash: $resultHash, events: $events, nextEventCursor: $nextEventCursor, event: $event, configuration: $configuration, details: $details, missingContacts: $missingContacts, personalLinks: $personalLinks, draft: $draft, commitRequestId: $commitRequestId, offers: $offers, nextOfferCursor: $nextOfferCursor, refreshedReceiptId: $refreshedReceiptId, selectedOffer: $selectedOffer, handoff: $handoff, referenceRequestId: $referenceRequestId, reviewRequestId: $reviewRequestId, messageCopied: $messageCopied, handoffOpenFailed: $handoffOpenFailed, offerFlow: $offerFlow, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class $HostEventOfferWorkspaceStateCopyWith<$Res>  {
  factory $HostEventOfferWorkspaceStateCopyWith(HostEventOfferWorkspaceState value, $Res Function(HostEventOfferWorkspaceState) _then) = _$HostEventOfferWorkspaceStateCopyWithImpl;
@useResult
$Res call({
 bool busy, HostOfferWorkspaceStage stage, bool recoveringPending, bool refreshTargetOnRetry, Object? error, bool selectionStale, List<String> ids, String? resultHash, List<HostOfferEventTarget> events, String? nextEventCursor, HostOfferEventTarget? event, HostOfferEventConfiguration? configuration, List<HostFormResponseDetail> details, List<HostFormResponseDetail> missingContacts, Map<String, String> personalLinks, HostOfferBatchDraft? draft, String? commitRequestId, List<Map<String, Object?>> offers, String? nextOfferCursor, String? refreshedReceiptId, HostEventOffer? selectedOffer, HostOfferHandoff? handoff, String? referenceRequestId, String? reviewRequestId, bool messageCopied, bool handoffOpenFailed, HostOfferFlowView offerFlow, bool actorAvailable
});




}
/// @nodoc
class _$HostEventOfferWorkspaceStateCopyWithImpl<$Res>
    implements $HostEventOfferWorkspaceStateCopyWith<$Res> {
  _$HostEventOfferWorkspaceStateCopyWithImpl(this._self, this._then);

  final HostEventOfferWorkspaceState _self;
  final $Res Function(HostEventOfferWorkspaceState) _then;

/// Create a copy of HostEventOfferWorkspaceState
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? busy = null,Object? stage = null,Object? recoveringPending = null,Object? refreshTargetOnRetry = null,Object? error = freezed,Object? selectionStale = null,Object? ids = null,Object? resultHash = freezed,Object? events = null,Object? nextEventCursor = freezed,Object? event = freezed,Object? configuration = freezed,Object? details = null,Object? missingContacts = null,Object? personalLinks = null,Object? draft = freezed,Object? commitRequestId = freezed,Object? offers = null,Object? nextOfferCursor = freezed,Object? refreshedReceiptId = freezed,Object? selectedOffer = freezed,Object? handoff = freezed,Object? referenceRequestId = freezed,Object? reviewRequestId = freezed,Object? messageCopied = null,Object? handoffOpenFailed = null,Object? offerFlow = null,Object? actorAvailable = null,}) {
  return _then(_self.copyWith(
busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,stage: null == stage ? _self.stage : stage // ignore: cast_nullable_to_non_nullable
as HostOfferWorkspaceStage,recoveringPending: null == recoveringPending ? _self.recoveringPending : recoveringPending // ignore: cast_nullable_to_non_nullable
as bool,refreshTargetOnRetry: null == refreshTargetOnRetry ? _self.refreshTargetOnRetry : refreshTargetOnRetry // ignore: cast_nullable_to_non_nullable
as bool,error: freezed == error ? _self.error : error ,selectionStale: null == selectionStale ? _self.selectionStale : selectionStale // ignore: cast_nullable_to_non_nullable
as bool,ids: null == ids ? _self.ids : ids // ignore: cast_nullable_to_non_nullable
as List<String>,resultHash: freezed == resultHash ? _self.resultHash : resultHash // ignore: cast_nullable_to_non_nullable
as String?,events: null == events ? _self.events : events // ignore: cast_nullable_to_non_nullable
as List<HostOfferEventTarget>,nextEventCursor: freezed == nextEventCursor ? _self.nextEventCursor : nextEventCursor // ignore: cast_nullable_to_non_nullable
as String?,event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as HostOfferEventTarget?,configuration: freezed == configuration ? _self.configuration : configuration // ignore: cast_nullable_to_non_nullable
as HostOfferEventConfiguration?,details: null == details ? _self.details : details // ignore: cast_nullable_to_non_nullable
as List<HostFormResponseDetail>,missingContacts: null == missingContacts ? _self.missingContacts : missingContacts // ignore: cast_nullable_to_non_nullable
as List<HostFormResponseDetail>,personalLinks: null == personalLinks ? _self.personalLinks : personalLinks // ignore: cast_nullable_to_non_nullable
as Map<String, String>,draft: freezed == draft ? _self.draft : draft // ignore: cast_nullable_to_non_nullable
as HostOfferBatchDraft?,commitRequestId: freezed == commitRequestId ? _self.commitRequestId : commitRequestId // ignore: cast_nullable_to_non_nullable
as String?,offers: null == offers ? _self.offers : offers // ignore: cast_nullable_to_non_nullable
as List<Map<String, Object?>>,nextOfferCursor: freezed == nextOfferCursor ? _self.nextOfferCursor : nextOfferCursor // ignore: cast_nullable_to_non_nullable
as String?,refreshedReceiptId: freezed == refreshedReceiptId ? _self.refreshedReceiptId : refreshedReceiptId // ignore: cast_nullable_to_non_nullable
as String?,selectedOffer: freezed == selectedOffer ? _self.selectedOffer : selectedOffer // ignore: cast_nullable_to_non_nullable
as HostEventOffer?,handoff: freezed == handoff ? _self.handoff : handoff // ignore: cast_nullable_to_non_nullable
as HostOfferHandoff?,referenceRequestId: freezed == referenceRequestId ? _self.referenceRequestId : referenceRequestId // ignore: cast_nullable_to_non_nullable
as String?,reviewRequestId: freezed == reviewRequestId ? _self.reviewRequestId : reviewRequestId // ignore: cast_nullable_to_non_nullable
as String?,messageCopied: null == messageCopied ? _self.messageCopied : messageCopied // ignore: cast_nullable_to_non_nullable
as bool,handoffOpenFailed: null == handoffOpenFailed ? _self.handoffOpenFailed : handoffOpenFailed // ignore: cast_nullable_to_non_nullable
as bool,offerFlow: null == offerFlow ? _self.offerFlow : offerFlow // ignore: cast_nullable_to_non_nullable
as HostOfferFlowView,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [HostEventOfferWorkspaceState].
extension HostEventOfferWorkspaceStatePatterns on HostEventOfferWorkspaceState {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _HostEventOfferWorkspaceState value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _HostEventOfferWorkspaceState value)  $default,){
final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _HostEventOfferWorkspaceState value)?  $default,){
final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( bool busy,  HostOfferWorkspaceStage stage,  bool recoveringPending,  bool refreshTargetOnRetry,  Object? error,  bool selectionStale,  List<String> ids,  String? resultHash,  List<HostOfferEventTarget> events,  String? nextEventCursor,  HostOfferEventTarget? event,  HostOfferEventConfiguration? configuration,  List<HostFormResponseDetail> details,  List<HostFormResponseDetail> missingContacts,  Map<String, String> personalLinks,  HostOfferBatchDraft? draft,  String? commitRequestId,  List<Map<String, Object?>> offers,  String? nextOfferCursor,  String? refreshedReceiptId,  HostEventOffer? selectedOffer,  HostOfferHandoff? handoff,  String? referenceRequestId,  String? reviewRequestId,  bool messageCopied,  bool handoffOpenFailed,  HostOfferFlowView offerFlow,  bool actorAvailable)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState() when $default != null:
return $default(_that.busy,_that.stage,_that.recoveringPending,_that.refreshTargetOnRetry,_that.error,_that.selectionStale,_that.ids,_that.resultHash,_that.events,_that.nextEventCursor,_that.event,_that.configuration,_that.details,_that.missingContacts,_that.personalLinks,_that.draft,_that.commitRequestId,_that.offers,_that.nextOfferCursor,_that.refreshedReceiptId,_that.selectedOffer,_that.handoff,_that.referenceRequestId,_that.reviewRequestId,_that.messageCopied,_that.handoffOpenFailed,_that.offerFlow,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( bool busy,  HostOfferWorkspaceStage stage,  bool recoveringPending,  bool refreshTargetOnRetry,  Object? error,  bool selectionStale,  List<String> ids,  String? resultHash,  List<HostOfferEventTarget> events,  String? nextEventCursor,  HostOfferEventTarget? event,  HostOfferEventConfiguration? configuration,  List<HostFormResponseDetail> details,  List<HostFormResponseDetail> missingContacts,  Map<String, String> personalLinks,  HostOfferBatchDraft? draft,  String? commitRequestId,  List<Map<String, Object?>> offers,  String? nextOfferCursor,  String? refreshedReceiptId,  HostEventOffer? selectedOffer,  HostOfferHandoff? handoff,  String? referenceRequestId,  String? reviewRequestId,  bool messageCopied,  bool handoffOpenFailed,  HostOfferFlowView offerFlow,  bool actorAvailable)  $default,) {final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState():
return $default(_that.busy,_that.stage,_that.recoveringPending,_that.refreshTargetOnRetry,_that.error,_that.selectionStale,_that.ids,_that.resultHash,_that.events,_that.nextEventCursor,_that.event,_that.configuration,_that.details,_that.missingContacts,_that.personalLinks,_that.draft,_that.commitRequestId,_that.offers,_that.nextOfferCursor,_that.refreshedReceiptId,_that.selectedOffer,_that.handoff,_that.referenceRequestId,_that.reviewRequestId,_that.messageCopied,_that.handoffOpenFailed,_that.offerFlow,_that.actorAvailable);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( bool busy,  HostOfferWorkspaceStage stage,  bool recoveringPending,  bool refreshTargetOnRetry,  Object? error,  bool selectionStale,  List<String> ids,  String? resultHash,  List<HostOfferEventTarget> events,  String? nextEventCursor,  HostOfferEventTarget? event,  HostOfferEventConfiguration? configuration,  List<HostFormResponseDetail> details,  List<HostFormResponseDetail> missingContacts,  Map<String, String> personalLinks,  HostOfferBatchDraft? draft,  String? commitRequestId,  List<Map<String, Object?>> offers,  String? nextOfferCursor,  String? refreshedReceiptId,  HostEventOffer? selectedOffer,  HostOfferHandoff? handoff,  String? referenceRequestId,  String? reviewRequestId,  bool messageCopied,  bool handoffOpenFailed,  HostOfferFlowView offerFlow,  bool actorAvailable)?  $default,) {final _that = this;
switch (_that) {
case _HostEventOfferWorkspaceState() when $default != null:
return $default(_that.busy,_that.stage,_that.recoveringPending,_that.refreshTargetOnRetry,_that.error,_that.selectionStale,_that.ids,_that.resultHash,_that.events,_that.nextEventCursor,_that.event,_that.configuration,_that.details,_that.missingContacts,_that.personalLinks,_that.draft,_that.commitRequestId,_that.offers,_that.nextOfferCursor,_that.refreshedReceiptId,_that.selectedOffer,_that.handoff,_that.referenceRequestId,_that.reviewRequestId,_that.messageCopied,_that.handoffOpenFailed,_that.offerFlow,_that.actorAvailable);case _:
  return null;

}
}

}

/// @nodoc


class _HostEventOfferWorkspaceState extends HostEventOfferWorkspaceState {
  const _HostEventOfferWorkspaceState({this.busy = false, this.stage = HostOfferWorkspaceStage.idle, this.recoveringPending = false, this.refreshTargetOnRetry = false, this.error, this.selectionStale = false, final  List<String> ids = const [], this.resultHash, final  List<HostOfferEventTarget> events = const [], this.nextEventCursor, this.event, this.configuration, final  List<HostFormResponseDetail> details = const [], final  List<HostFormResponseDetail> missingContacts = const [], final  Map<String, String> personalLinks = const {}, this.draft, this.commitRequestId, final  List<Map<String, Object?>> offers = const [], this.nextOfferCursor, this.refreshedReceiptId, this.selectedOffer, this.handoff, this.referenceRequestId, this.reviewRequestId, this.messageCopied = false, this.handoffOpenFailed = false, this.offerFlow = const HostOfferFlowView(status: HostOfferFlowStatus.idle), this.actorAvailable = true}): _ids = ids,_events = events,_details = details,_missingContacts = missingContacts,_personalLinks = personalLinks,_offers = offers,super._();
  

@override@JsonKey() final  bool busy;
@override@JsonKey() final  HostOfferWorkspaceStage stage;
@override@JsonKey() final  bool recoveringPending;
@override@JsonKey() final  bool refreshTargetOnRetry;
@override final  Object? error;
@override@JsonKey() final  bool selectionStale;
 final  List<String> _ids;
@override@JsonKey() List<String> get ids {
  if (_ids is EqualUnmodifiableListView) return _ids;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_ids);
}

@override final  String? resultHash;
 final  List<HostOfferEventTarget> _events;
@override@JsonKey() List<HostOfferEventTarget> get events {
  if (_events is EqualUnmodifiableListView) return _events;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_events);
}

@override final  String? nextEventCursor;
@override final  HostOfferEventTarget? event;
@override final  HostOfferEventConfiguration? configuration;
 final  List<HostFormResponseDetail> _details;
@override@JsonKey() List<HostFormResponseDetail> get details {
  if (_details is EqualUnmodifiableListView) return _details;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_details);
}

 final  List<HostFormResponseDetail> _missingContacts;
@override@JsonKey() List<HostFormResponseDetail> get missingContacts {
  if (_missingContacts is EqualUnmodifiableListView) return _missingContacts;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_missingContacts);
}

 final  Map<String, String> _personalLinks;
@override@JsonKey() Map<String, String> get personalLinks {
  if (_personalLinks is EqualUnmodifiableMapView) return _personalLinks;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableMapView(_personalLinks);
}

@override final  HostOfferBatchDraft? draft;
@override final  String? commitRequestId;
 final  List<Map<String, Object?>> _offers;
@override@JsonKey() List<Map<String, Object?>> get offers {
  if (_offers is EqualUnmodifiableListView) return _offers;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_offers);
}

@override final  String? nextOfferCursor;
@override final  String? refreshedReceiptId;
@override final  HostEventOffer? selectedOffer;
@override final  HostOfferHandoff? handoff;
@override final  String? referenceRequestId;
@override final  String? reviewRequestId;
@override@JsonKey() final  bool messageCopied;
@override@JsonKey() final  bool handoffOpenFailed;
@override@JsonKey() final  HostOfferFlowView offerFlow;
@override@JsonKey() final  bool actorAvailable;

/// Create a copy of HostEventOfferWorkspaceState
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$HostEventOfferWorkspaceStateCopyWith<_HostEventOfferWorkspaceState> get copyWith => __$HostEventOfferWorkspaceStateCopyWithImpl<_HostEventOfferWorkspaceState>(this, _$identity);



@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _HostEventOfferWorkspaceState&&(identical(other.busy, busy) || other.busy == busy)&&(identical(other.stage, stage) || other.stage == stage)&&(identical(other.recoveringPending, recoveringPending) || other.recoveringPending == recoveringPending)&&(identical(other.refreshTargetOnRetry, refreshTargetOnRetry) || other.refreshTargetOnRetry == refreshTargetOnRetry)&&const DeepCollectionEquality().equals(other.error, error)&&(identical(other.selectionStale, selectionStale) || other.selectionStale == selectionStale)&&const DeepCollectionEquality().equals(other._ids, _ids)&&(identical(other.resultHash, resultHash) || other.resultHash == resultHash)&&const DeepCollectionEquality().equals(other._events, _events)&&(identical(other.nextEventCursor, nextEventCursor) || other.nextEventCursor == nextEventCursor)&&(identical(other.event, event) || other.event == event)&&(identical(other.configuration, configuration) || other.configuration == configuration)&&const DeepCollectionEquality().equals(other._details, _details)&&const DeepCollectionEquality().equals(other._missingContacts, _missingContacts)&&const DeepCollectionEquality().equals(other._personalLinks, _personalLinks)&&(identical(other.draft, draft) || other.draft == draft)&&(identical(other.commitRequestId, commitRequestId) || other.commitRequestId == commitRequestId)&&const DeepCollectionEquality().equals(other._offers, _offers)&&(identical(other.nextOfferCursor, nextOfferCursor) || other.nextOfferCursor == nextOfferCursor)&&(identical(other.refreshedReceiptId, refreshedReceiptId) || other.refreshedReceiptId == refreshedReceiptId)&&(identical(other.selectedOffer, selectedOffer) || other.selectedOffer == selectedOffer)&&(identical(other.handoff, handoff) || other.handoff == handoff)&&(identical(other.referenceRequestId, referenceRequestId) || other.referenceRequestId == referenceRequestId)&&(identical(other.reviewRequestId, reviewRequestId) || other.reviewRequestId == reviewRequestId)&&(identical(other.messageCopied, messageCopied) || other.messageCopied == messageCopied)&&(identical(other.handoffOpenFailed, handoffOpenFailed) || other.handoffOpenFailed == handoffOpenFailed)&&(identical(other.offerFlow, offerFlow) || other.offerFlow == offerFlow)&&(identical(other.actorAvailable, actorAvailable) || other.actorAvailable == actorAvailable));
}


@override
int get hashCode => Object.hashAll([runtimeType,busy,stage,recoveringPending,refreshTargetOnRetry,const DeepCollectionEquality().hash(error),selectionStale,const DeepCollectionEquality().hash(_ids),resultHash,const DeepCollectionEquality().hash(_events),nextEventCursor,event,configuration,const DeepCollectionEquality().hash(_details),const DeepCollectionEquality().hash(_missingContacts),const DeepCollectionEquality().hash(_personalLinks),draft,commitRequestId,const DeepCollectionEquality().hash(_offers),nextOfferCursor,refreshedReceiptId,selectedOffer,handoff,referenceRequestId,reviewRequestId,messageCopied,handoffOpenFailed,offerFlow,actorAvailable]);

@override
String toString() {
  return 'HostEventOfferWorkspaceState(busy: $busy, stage: $stage, recoveringPending: $recoveringPending, refreshTargetOnRetry: $refreshTargetOnRetry, error: $error, selectionStale: $selectionStale, ids: $ids, resultHash: $resultHash, events: $events, nextEventCursor: $nextEventCursor, event: $event, configuration: $configuration, details: $details, missingContacts: $missingContacts, personalLinks: $personalLinks, draft: $draft, commitRequestId: $commitRequestId, offers: $offers, nextOfferCursor: $nextOfferCursor, refreshedReceiptId: $refreshedReceiptId, selectedOffer: $selectedOffer, handoff: $handoff, referenceRequestId: $referenceRequestId, reviewRequestId: $reviewRequestId, messageCopied: $messageCopied, handoffOpenFailed: $handoffOpenFailed, offerFlow: $offerFlow, actorAvailable: $actorAvailable)';
}


}

/// @nodoc
abstract mixin class _$HostEventOfferWorkspaceStateCopyWith<$Res> implements $HostEventOfferWorkspaceStateCopyWith<$Res> {
  factory _$HostEventOfferWorkspaceStateCopyWith(_HostEventOfferWorkspaceState value, $Res Function(_HostEventOfferWorkspaceState) _then) = __$HostEventOfferWorkspaceStateCopyWithImpl;
@override @useResult
$Res call({
 bool busy, HostOfferWorkspaceStage stage, bool recoveringPending, bool refreshTargetOnRetry, Object? error, bool selectionStale, List<String> ids, String? resultHash, List<HostOfferEventTarget> events, String? nextEventCursor, HostOfferEventTarget? event, HostOfferEventConfiguration? configuration, List<HostFormResponseDetail> details, List<HostFormResponseDetail> missingContacts, Map<String, String> personalLinks, HostOfferBatchDraft? draft, String? commitRequestId, List<Map<String, Object?>> offers, String? nextOfferCursor, String? refreshedReceiptId, HostEventOffer? selectedOffer, HostOfferHandoff? handoff, String? referenceRequestId, String? reviewRequestId, bool messageCopied, bool handoffOpenFailed, HostOfferFlowView offerFlow, bool actorAvailable
});




}
/// @nodoc
class __$HostEventOfferWorkspaceStateCopyWithImpl<$Res>
    implements _$HostEventOfferWorkspaceStateCopyWith<$Res> {
  __$HostEventOfferWorkspaceStateCopyWithImpl(this._self, this._then);

  final _HostEventOfferWorkspaceState _self;
  final $Res Function(_HostEventOfferWorkspaceState) _then;

/// Create a copy of HostEventOfferWorkspaceState
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? busy = null,Object? stage = null,Object? recoveringPending = null,Object? refreshTargetOnRetry = null,Object? error = freezed,Object? selectionStale = null,Object? ids = null,Object? resultHash = freezed,Object? events = null,Object? nextEventCursor = freezed,Object? event = freezed,Object? configuration = freezed,Object? details = null,Object? missingContacts = null,Object? personalLinks = null,Object? draft = freezed,Object? commitRequestId = freezed,Object? offers = null,Object? nextOfferCursor = freezed,Object? refreshedReceiptId = freezed,Object? selectedOffer = freezed,Object? handoff = freezed,Object? referenceRequestId = freezed,Object? reviewRequestId = freezed,Object? messageCopied = null,Object? handoffOpenFailed = null,Object? offerFlow = null,Object? actorAvailable = null,}) {
  return _then(_HostEventOfferWorkspaceState(
busy: null == busy ? _self.busy : busy // ignore: cast_nullable_to_non_nullable
as bool,stage: null == stage ? _self.stage : stage // ignore: cast_nullable_to_non_nullable
as HostOfferWorkspaceStage,recoveringPending: null == recoveringPending ? _self.recoveringPending : recoveringPending // ignore: cast_nullable_to_non_nullable
as bool,refreshTargetOnRetry: null == refreshTargetOnRetry ? _self.refreshTargetOnRetry : refreshTargetOnRetry // ignore: cast_nullable_to_non_nullable
as bool,error: freezed == error ? _self.error : error ,selectionStale: null == selectionStale ? _self.selectionStale : selectionStale // ignore: cast_nullable_to_non_nullable
as bool,ids: null == ids ? _self._ids : ids // ignore: cast_nullable_to_non_nullable
as List<String>,resultHash: freezed == resultHash ? _self.resultHash : resultHash // ignore: cast_nullable_to_non_nullable
as String?,events: null == events ? _self._events : events // ignore: cast_nullable_to_non_nullable
as List<HostOfferEventTarget>,nextEventCursor: freezed == nextEventCursor ? _self.nextEventCursor : nextEventCursor // ignore: cast_nullable_to_non_nullable
as String?,event: freezed == event ? _self.event : event // ignore: cast_nullable_to_non_nullable
as HostOfferEventTarget?,configuration: freezed == configuration ? _self.configuration : configuration // ignore: cast_nullable_to_non_nullable
as HostOfferEventConfiguration?,details: null == details ? _self._details : details // ignore: cast_nullable_to_non_nullable
as List<HostFormResponseDetail>,missingContacts: null == missingContacts ? _self._missingContacts : missingContacts // ignore: cast_nullable_to_non_nullable
as List<HostFormResponseDetail>,personalLinks: null == personalLinks ? _self._personalLinks : personalLinks // ignore: cast_nullable_to_non_nullable
as Map<String, String>,draft: freezed == draft ? _self.draft : draft // ignore: cast_nullable_to_non_nullable
as HostOfferBatchDraft?,commitRequestId: freezed == commitRequestId ? _self.commitRequestId : commitRequestId // ignore: cast_nullable_to_non_nullable
as String?,offers: null == offers ? _self._offers : offers // ignore: cast_nullable_to_non_nullable
as List<Map<String, Object?>>,nextOfferCursor: freezed == nextOfferCursor ? _self.nextOfferCursor : nextOfferCursor // ignore: cast_nullable_to_non_nullable
as String?,refreshedReceiptId: freezed == refreshedReceiptId ? _self.refreshedReceiptId : refreshedReceiptId // ignore: cast_nullable_to_non_nullable
as String?,selectedOffer: freezed == selectedOffer ? _self.selectedOffer : selectedOffer // ignore: cast_nullable_to_non_nullable
as HostEventOffer?,handoff: freezed == handoff ? _self.handoff : handoff // ignore: cast_nullable_to_non_nullable
as HostOfferHandoff?,referenceRequestId: freezed == referenceRequestId ? _self.referenceRequestId : referenceRequestId // ignore: cast_nullable_to_non_nullable
as String?,reviewRequestId: freezed == reviewRequestId ? _self.reviewRequestId : reviewRequestId // ignore: cast_nullable_to_non_nullable
as String?,messageCopied: null == messageCopied ? _self.messageCopied : messageCopied // ignore: cast_nullable_to_non_nullable
as bool,handoffOpenFailed: null == handoffOpenFailed ? _self.handoffOpenFailed : handoffOpenFailed // ignore: cast_nullable_to_non_nullable
as bool,offerFlow: null == offerFlow ? _self.offerFlow : offerFlow // ignore: cast_nullable_to_non_nullable
as HostOfferFlowView,actorAvailable: null == actorAvailable ? _self.actorAvailable : actorAvailable // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
