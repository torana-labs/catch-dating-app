// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_prompts.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ProfilePromptAnswer _$ProfilePromptAnswerFromJson(Map<String, dynamic> json) =>
    _ProfilePromptAnswer(
      promptId: json['promptId'] as String,
      prompt: json['prompt'] as String,
      answer: json['answer'] as String? ?? '',
    );

Map<String, dynamic> _$ProfilePromptAnswerToJson(
  _ProfilePromptAnswer instance,
) => <String, dynamic>{
  'promptId': instance.promptId,
  'prompt': instance.prompt,
  'answer': instance.answer,
};

_PhotoPromptAnswer _$PhotoPromptAnswerFromJson(Map<String, dynamic> json) =>
    _PhotoPromptAnswer(
      photoIndex: (json['photoIndex'] as num).toInt(),
      promptId: json['promptId'] as String,
      prompt: json['prompt'] as String,
      caption: json['caption'] as String? ?? '',
    );

Map<String, dynamic> _$PhotoPromptAnswerToJson(_PhotoPromptAnswer instance) =>
    <String, dynamic>{
      'photoIndex': instance.photoIndex,
      'promptId': instance.promptId,
      'prompt': instance.prompt,
      'caption': instance.caption,
    };
