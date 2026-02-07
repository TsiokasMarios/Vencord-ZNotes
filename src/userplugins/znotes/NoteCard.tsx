/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { openImageModal } from "@utils/discord";
import { Parser, Text, Tooltip } from "@webpack/common";

import { ZNote, ZNoteAttachment } from "./types";
import { formatDate, formatTime } from "./utils";

const cl = classNameFactory("vc-znotes-card-");

interface NoteCardProps {
    note: ZNote;
    onDelete: () => void;
    onJump: () => void;
}

function isImageAttachment(a: ZNoteAttachment): boolean {
    return !!a.contentType?.startsWith("image/");
}

function isVideoAttachment(a: ZNoteAttachment): boolean {
    return !!a.contentType?.startsWith("video/");
}

function NoteCard({ note, onDelete, onJump }: NoteCardProps) {
    const getAvatarUrl = () => {
        if (!note.author.avatar) return null;
        return `https://cdn.discordapp.com/avatars/${note.author.id}/${note.author.avatar}.png?size=64`;
    };

    const truncateContent = (content: string, maxLength: number = 200) => {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + "...";
    };

    const imageAttachments = (note.attachments ?? []).filter(isImageAttachment);
    const videoAttachments = (note.attachments ?? []).filter(isVideoAttachment);
    const fileAttachments = (note.attachments ?? []).filter(a => !isImageAttachment(a) && !isVideoAttachment(a));
    const hasContent = note.content || imageAttachments.length > 0 || videoAttachments.length > 0 || fileAttachments.length > 0;

    return (
        <div className={cl("container")}>
            <div className={cl("header")}>
                <div className={cl("author")}>
                    {getAvatarUrl() ? (
                        <img
                            src={getAvatarUrl()!}
                            alt={note.author.username}
                            className={cl("avatar")}
                        />
                    ) : (
                        <div className={cl("avatar-placeholder")}>
                            {note.author.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className={cl("author-info")}>
                        <Text variant="text-md/medium" className={cl("username")}>
                            {note.author.username}
                        </Text>
                        <Text variant="text-xs/normal" className={cl("timestamp")}>
                            {formatDate(note.timestamp)} at {formatTime(note.timestamp)}
                        </Text>
                    </div>
                </div>
                <div className={cl("actions")}>
                    <Tooltip text="Jump to message">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <button
                                className={cl("action-btn", "jump")}
                                onClick={onJump}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
                                </svg>
                            </button>
                        )}
                    </Tooltip>
                    <Tooltip text="Delete note">
                        {({ onMouseEnter, onMouseLeave }) => (
                            <button
                                className={cl("action-btn", "delete")}
                                onClick={onDelete}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        )}
                    </Tooltip>
                </div>
            </div>
            <div className={cl("content")}>
                {note.content && (
                    <div className={cl("parsed-content")}>
                        {Parser.parse(note.content, true, {
                            channelId: note.channelId,
                            messageId: note.messageId,
                            allowLinks: true,
                            allowEmojiLinks: true,
                        })}
                    </div>
                )}

                {imageAttachments.length > 0 && (
                    <div className={cl("attachments")}>
                        {imageAttachments.map((a, i) => (
                            <img
                                key={i}
                                src={a.proxyUrl || a.url}
                                alt={a.filename}
                                className={cl("attachment-image")}
                                onClick={() => openImageModal({
                                    url: a.url,
                                    original: a.url,
                                    width: a.width,
                                    height: a.height
                                })}
                            />
                        ))}
                    </div>
                )}

                {videoAttachments.length > 0 && (
                    <div className={cl("attachments")}>
                        {videoAttachments.map((a, i) => (
                            <video
                                key={i}
                                src={a.proxyUrl || a.url}
                                controls
                                className={cl("attachment-video")}
                            />
                        ))}
                    </div>
                )}

                {fileAttachments.length > 0 && (
                    <div className={cl("file-attachments")}>
                        {fileAttachments.map((a, i) => (
                            <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cl("file-link")}
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" className={cl("file-icon")}>
                                    <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                                </svg>
                                <span className={cl("file-name")}>{a.filename}</span>
                            </a>
                        ))}
                    </div>
                )}

                {!hasContent && (
                    <Text variant="text-sm/normal">(No content)</Text>
                )}
            </div>
            <div className={cl("footer")}>
                <Text variant="text-xs/normal" className={cl("saved-date")}>
                    Saved on {formatDate(note.addedAt)} at {formatTime(note.addedAt)}
                </Text>
            </div>
        </div>
    );
}

export { NoteCard };
