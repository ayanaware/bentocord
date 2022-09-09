import { AdvancedMessageContent, AdvancedMessageContentEdit, InteractionContent, InteractionContentEdit } from 'eris';

export type AgnosticMessageContent = AdvancedMessageContent & InteractionContent;
export type AgnosticMessageContentEdit = AdvancedMessageContentEdit & InteractionContentEdit;
