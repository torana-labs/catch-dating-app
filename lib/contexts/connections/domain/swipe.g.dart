// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'swipe.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Swipe _$SwipeFromJson(Map<String, dynamic> json) => _Swipe(
  swiperId: json['swiperId'] as String,
  targetId: json['targetId'] as String,
  eventId: json['eventId'] as String,
  direction: $enumDecode(_$SwipeDirectionEnumMap, json['direction']),
  reactionTargetId: json['reactionTargetId'] as String?,
  reactionTargetType: $enumDecodeNullable(
    _$SwipeReactionTargetTypeEnumMap,
    json['reactionTargetType'],
  ),
  reactionTargetLabel: json['reactionTargetLabel'] as String?,
  reactionTargetPreview: json['reactionTargetPreview'] as String?,
  comment: json['comment'] as String?,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
);

Map<String, dynamic> _$SwipeToJson(_Swipe instance) => <String, dynamic>{
  'swiperId': instance.swiperId,
  'targetId': instance.targetId,
  'eventId': instance.eventId,
  'direction': _$SwipeDirectionEnumMap[instance.direction]!,
  'reactionTargetId': instance.reactionTargetId,
  'reactionTargetType':
      _$SwipeReactionTargetTypeEnumMap[instance.reactionTargetType],
  'reactionTargetLabel': instance.reactionTargetLabel,
  'reactionTargetPreview': instance.reactionTargetPreview,
  'comment': instance.comment,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
};

const _$SwipeDirectionEnumMap = {
  SwipeDirection.like: 'like',
  SwipeDirection.pass: 'pass',
};

const _$SwipeReactionTargetTypeEnumMap = {
  SwipeReactionTargetType.heroPhoto: 'heroPhoto',
  SwipeReactionTargetType.photo: 'photo',
  SwipeReactionTargetType.profilePrompt: 'profilePrompt',
  SwipeReactionTargetType.compatibility: 'compatibility',
  SwipeReactionTargetType.running: 'running',
  SwipeReactionTargetType.details: 'details',
  SwipeReactionTargetType.lifestyle: 'lifestyle',
};
