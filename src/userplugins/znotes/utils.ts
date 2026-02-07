/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FilterMode, FilterState,ZNote } from "./types";

export function filterNotes(
    notes: ZNote[],
    filter: FilterState,
    channelIdToGuildId: Map<string, string | undefined>
): { notes: ZNote[]; filterApplied: FilterMode } {
    const { mode, channelId, guildId } = filter;

    if (mode === "all" || (!channelId && !guildId)) {
        return { notes, filterApplied: "all" };
    }

    if (mode === "channel" && channelId) {
        const channelNotes = notes.filter(n => n.channelId === channelId);
        if (channelNotes.length > 0) {
            return { notes: channelNotes, filterApplied: "channel" };
        }

        const targetGuildId = channelIdToGuildId.get(channelId);
        if (targetGuildId) {
            const guildNotes = notes.filter(n => n.guildId === targetGuildId);
            if (guildNotes.length > 0) {
                return { notes: guildNotes, filterApplied: "guild" };
            }
        }

        return { notes, filterApplied: "all" };
    }

    if (mode === "guild" && guildId) {
        const guildNotes = notes.filter(n => n.guildId === guildId);
        if (guildNotes.length > 0) {
            return { notes: guildNotes, filterApplied: "guild" };
        }
        return { notes, filterApplied: "all" };
    }

    return { notes, filterApplied: "all" };
}

export function paginateNotes(notes: ZNote[], page: number, perPage: number): ZNote[] {
    const start = (page - 1) * perPage;
    return notes.slice(start, start + perPage);
}

export function getTotalPages(totalNotes: number, perPage: number): number {
    return Math.ceil(totalNotes / perPage);
}

export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

export function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit"
    });
}
