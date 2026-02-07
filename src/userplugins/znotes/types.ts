/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ZNoteAttachment {
    url: string;
    proxyUrl?: string;
    filename: string;
    contentType?: string;
    width?: number;
    height?: number;
}

export interface ZNote {
    id: string;
    messageId: string;
    channelId: string;
    guildId?: string;
    content: string;
    attachments?: ZNoteAttachment[];
    author: {
        id: string;
        username: string;
        avatar?: string;
    };
    timestamp: number;
    messageUrl: string;
    addedAt: number;
}

export type FilterMode = "channel" | "guild" | "all";

export interface FilterState {
    mode: FilterMode;
    channelId?: string;
    guildId?: string;
}
