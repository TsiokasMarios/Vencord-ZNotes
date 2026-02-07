/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, Popout, SelectedChannelStore, useRef, useState } from "@webpack/common";

import { NotesPanel } from "./NotesPanel";
import { ZNote, ZNoteAttachment } from "./types";

const DATASTORE_KEY = "znotes-v1";
const IS_DESKTOP = typeof VencordNative !== "undefined";

const Native = IS_DESKTOP
    ? VencordNative.pluginHelpers.ZNotes as PluginNative<typeof import("./native")>
    : null;

export const settings = definePluginSettings({
    useNativeStorage: {
        type: OptionType.BOOLEAN,
        description: "Store notes in a JSON file for easy backup (desktop only). File location shown below.",
        default: true,
        disabled: () => !IS_DESKTOP
    }
});

function shouldUseNative(): boolean {
    return IS_DESKTOP && settings.store.useNativeStorage;
}

export async function getAllNotes(): Promise<ZNote[]> {
    if (shouldUseNative() && Native) {
        return Native.readNotes();
    }
    return await DataStore.get<ZNote[]>(DATASTORE_KEY) || [];
}

export async function addNote(note: ZNote): Promise<void> {
    const notes = await getAllNotes();
    if (notes.some(n => n.messageId === note.messageId)) return;
    notes.unshift(note);

    if (shouldUseNative() && Native) {
        Native.writeNotes(notes);
    } else {
        await DataStore.set(DATASTORE_KEY, notes);
    }
}

export async function removeNote(noteId: string): Promise<void> {
    const notes = await getAllNotes();
    const filtered = notes.filter(n => n.id !== noteId);

    if (shouldUseNative() && Native) {
        Native.writeNotes(filtered);
    } else {
        await DataStore.set(DATASTORE_KEY, filtered);
    }
}

export async function getNotesFilePath(): Promise<string | null> {
    if (IS_DESKTOP && Native) {
        return await Native.getNotesFilePath();
    }
    return null;
}

export async function exportNotesToFile(filePath: string): Promise<boolean> {
    if (!IS_DESKTOP || !Native) return false;
    const notes = await getAllNotes();
    return Native.exportNotesToFile(filePath, notes);
}

export async function importNotesFromFile(filePath: string): Promise<ZNote[] | null> {
    if (!IS_DESKTOP || !Native) return null;
    const imported = await Native.importNotesFromFile(filePath);
    if (imported) {
        if (shouldUseNative() && Native) {
            Native.writeNotes(imported);
        } else {
            await DataStore.set(DATASTORE_KEY, imported);
        }
    }
    return imported;
}

function generateNoteId(): string {
    return `znote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildMessageUrl(message: Message): string {
    const channel = ChannelStore.getChannel(message.channel_id);
    if (!channel) return "";

    const guildId = channel.guild_id || "@me";
    return `https://discord.com/channels/${guildId}/${message.channel_id}/${message.id}`;
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    // Try "copy-text" first (present when message has text), then fall back to "copy-link" (always present)
    const group = findGroupChildrenByChildId("copy-text", children)
        ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    const anchorIndex = group.findIndex(c => c?.props?.id === "copy-text" || c?.props?.id === "copy-link");
    if (anchorIndex === -1) return;

    group.splice(anchorIndex + 1, 0, (
        <Menu.MenuItem
            id="znotes-add"
            key="znotes-add"
            label="Add to ZNotes"
            action={async () => {
                const channel = ChannelStore.getChannel(message.channel_id);
                const attachments: ZNoteAttachment[] = (message.attachments ?? []).map((a: any) => ({
                    url: a.url,
                    proxyUrl: a.proxy_url,
                    filename: a.filename,
                    contentType: a.content_type,
                    width: a.width,
                    height: a.height
                }));
                const note: ZNote = {
                    id: generateNoteId(),
                    messageId: message.id,
                    channelId: message.channel_id,
                    guildId: channel?.guild_id,
                    content: message.content,
                    attachments,
                    author: {
                        id: message.author.id,
                        username: message.author.username,
                        avatar: message.author.avatar
                    },
                    timestamp: (message.timestamp as any)?.valueOf?.() || Date.now(),
                    messageUrl: buildMessageUrl(message),
                    addedAt: Date.now()
                };
                await addNote(note);
            }}
        />
    ));
};

function NotesIcon({ height = 24, width = 24, className }: { height?: number | string; width?: number | string; className?: string; }) {
    return (
        <svg viewBox="0 0 24 24" height={height} width={width} className={className}>
            <path
                fill="currentColor"
                d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
            />
        </svg>
    );
}

const ZNotesChatBarButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);

    if (!isMainChat) return null;

    const currentChannelId = SelectedChannelStore.getChannelId();

    return (
        <Popout
            position="top"
            align="center"
            animation={Popout.Animation.FADE}
            shouldShow={isOpen}
            onRequestClose={() => setIsOpen(false)}
            targetElementRef={buttonRef}
            renderPopout={() => (
                <ErrorBoundary noop>
                    <NotesPanel
                        initialChannelId={currentChannelId}
                        onClose={() => setIsOpen(false)}
                    />
                </ErrorBoundary>
            )}
        >
            {(_, { isShown }) => (
                <div ref={buttonRef}>
                    <ChatBarButton
                        tooltip="ZNotes"
                        onClick={() => setIsOpen(v => !v)}
                    >
                        <NotesIcon height={20} width={20} />
                    </ChatBarButton>
                </div>
            )}
        </Popout>
    );
};

export default definePlugin({
    name: "ZNotes",
    description: "Save messages to custom notes with smart filtering and pagination",
    authors: [Devs.Ven],
    dependencies: ["DynamicImageModalAPI"],
    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    },

    chatBarButton: {
        icon: NotesIcon,
        render: ZNotesChatBarButton
    }
});
