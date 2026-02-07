/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { findCssClassesLazy } from "@webpack";
import { ChannelRouter, ChannelStore, Dialog, MessageActions, ScrollerThin, Select, Text, useEffect, useState } from "@webpack/common";

const PopoutClasses = findCssClassesLazy("container", "scroller", "list");

import { getAllNotes, removeNote } from "./index";
import { NoteCard } from "./NoteCard";
import { FilterMode, ZNote } from "./types";
import { getTotalPages, paginateNotes } from "./utils";

const NOTES_PER_PAGE = 10;
const cl = classNameFactory("vc-znotes-panel-");

interface NotesPanelProps {
    initialChannelId: string | null;
    onClose: () => void;
}

type SortField = "date" | "author";
type SortOrder = "asc" | "desc";

export function NotesPanel({ initialChannelId, onClose }: NotesPanelProps) {
    const [notes, setNotes] = useState<ZNote[]>([]);
    const [filteredNotes, setFilteredNotes] = useState<ZNote[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterMode, setFilterMode] = useState<FilterMode>("channel");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("date");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [isLoading, setIsLoading] = useState(true);

    const currentChannel = initialChannelId ? ChannelStore.getChannel(initialChannelId) : null;
    const currentGuildId = currentChannel?.guild_id;

    useEffect(() => {
        loadNotes();
    }, []);

    useEffect(() => {
        applyFilterAndSort();
    }, [notes, filterMode, searchQuery, sortField, sortOrder]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filteredNotes]);

    const loadNotes = async () => {
        setIsLoading(true);
        const allNotes = await getAllNotes();
        setNotes(allNotes);
        setIsLoading(false);
    };

    const applyFilterAndSort = () => {
        let filtered = [...notes];

        // Apply location filter
        if (filterMode === "channel" && currentChannel) {
            filtered = notes.filter(n => n.channelId === currentChannel.id);
        } else if (filterMode === "guild" && currentGuildId) {
            filtered = notes.filter(n => n.guildId === currentGuildId);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(n =>
                n.content.toLowerCase().includes(query) ||
                n.author.username.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let comparison = 0;
            if (sortField === "date") {
                comparison = a.addedAt - b.addedAt;
            } else if (sortField === "author") {
                comparison = a.author.username.localeCompare(b.author.username);
            }
            return sortOrder === "asc" ? comparison : -comparison;
        });

        setFilteredNotes(filtered);
    };

    const handleDelete = async (noteId: string) => {
        await removeNote(noteId);
        await loadNotes();
    };

    const handleJumpToMessage = (note: ZNote) => {
        if (note.channelId && note.messageId) {
            // Navigate to channel first, then jump to the exact message
            ChannelRouter.transitionToChannel(note.channelId);
            setTimeout(() => {
                MessageActions.jumpToMessage({
                    channelId: note.channelId,
                    messageId: note.messageId,
                    flash: true,
                    jumpType: "ANIMATED"
                });
            }, 100);
            onClose();
        }
    };

    const paginatedNotes = paginateNotes(filteredNotes, currentPage, NOTES_PER_PAGE);
    const totalPages = getTotalPages(filteredNotes.length, NOTES_PER_PAGE);
    const startIndex = filteredNotes.length > 0 ? (currentPage - 1) * NOTES_PER_PAGE + 1 : 0;
    const endIndex = Math.min(startIndex + paginatedNotes.length - 1, filteredNotes.length);

    const getFilterLabel = () => {
        switch (filterMode) {
            case "channel": return "Channel";
            case "guild": return "Server";
            case "all": return "All Servers";
        }
    };

    return (
        <Dialog className={PopoutClasses.container} style={{ width: "800px", minWidth: "800px", maxWidth: "800px" }}>
            <div className={cl("wrapper")}>
                {/* Header with title and search */}
                <div className={cl("top-bar")}>
                    <Text variant="heading-lg/semibold" className={cl("title")}>
                        Notes - {startIndex}/{filteredNotes.length}
                    </Text>
                    <div className={cl("search-box")}>
                        <input
                            type="text"
                            placeholder="Search"
                            className={cl("search-input")}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        <svg className={cl("search-icon")} viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M21.707 20.293L16.314 14.9C17.404 13.508 18 11.775 18 10C18 5.589 14.411 2 10 2C5.589 2 2 5.589 2 10C2 14.411 5.589 18 10 18C11.775 18 13.508 17.404 14.9 16.314L20.293 21.707L21.707 20.293ZM10 16C6.691 16 4 13.309 4 10C4 6.691 6.691 4 10 4C13.309 4 16 6.691 16 10C16 13.309 13.309 16 10 16Z"/>
                        </svg>
                    </div>
                </div>

                {/* Filter and sort controls */}
                <div className={cl("controls-bar")}>
                    <div className={cl("filter-tabs")}>
                        <button
                            className={cl("filter-tab", filterMode === "channel" ? "active" : "")}
                            onClick={() => setFilterMode("channel")}
                        >
                            Channel
                        </button>
                        <button
                            className={cl("filter-tab", filterMode === "guild" ? "active" : "")}
                            onClick={() => setFilterMode("guild")}
                        >
                            Server
                        </button>
                        <button
                            className={cl("filter-tab", filterMode === "all" ? "active" : "")}
                            onClick={() => setFilterMode("all")}
                        >
                            All Servers
                        </button>
                    </div>
                    <div className={cl("sort-controls")}>
                        <span className={cl("sort-label")}>Sort by:</span>
                        <Select
                            options={[
                                { label: "Note Date", value: "date" },
                                { label: "Author", value: "author" }
                            ]}
                            isSelected={v => v === sortField}
                            select={v => setSortField(v as SortField)}
                            serialize={v => v}
                            className={cl("sort-select")}
                        />
                        <Select
                            options={[
                                { label: "Ascending", value: "asc" },
                                { label: "Descending", value: "desc" }
                            ]}
                            isSelected={v => v === sortOrder}
                            select={v => setSortOrder(v as SortOrder)}
                            serialize={v => v}
                            className={cl("sort-select")}
                        />
                    </div>
                </div>

                {/* Notes list */}
                <div className={cl("content")}>
                    {isLoading ? (
                        <div className={cl("loading")}>
                            <Text variant="heading-md/medium">Loading notes...</Text>
                        </div>
                    ) : filteredNotes.length === 0 ? (
                        <div className={cl("empty")}>
                            <Text variant="heading-md/medium" className={cl("empty-title")}>
                                {searchQuery ? "No matching notes found" : "No notes saved yet"}
                            </Text>
                            <Text variant="text-sm/normal" className={cl("empty-subtext")}>
                                {searchQuery
                                    ? "Try adjusting your search query"
                                    : "Right-click any message and select 'Add to ZNotes' to save it"}
                            </Text>
                        </div>
                    ) : (
                        <>
                            <ScrollerThin className={cl("scroller")}>
                                <div className={cl("notes-list")}>
                                    {paginatedNotes.map(note => (
                                        <NoteCard
                                            key={note.id}
                                            note={note}
                                            onDelete={() => handleDelete(note.id)}
                                            onJump={() => handleJumpToMessage(note)}
                                        />
                                    ))}
                                </div>
                            </ScrollerThin>

                            {totalPages > 1 && (
                                <div className={cl("pagination")}>
                                    <button
                                        className={cl("page-btn")}
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(1)}
                                    >
                                        ⟪
                                    </button>
                                    <button
                                        className={cl("page-btn")}
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        ←
                                    </button>
                                    <span className={cl("page-info")}>
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        className={cl("page-btn")}
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        →
                                    </button>
                                    <button
                                        className={cl("page-btn")}
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(totalPages)}
                                    >
                                        ⟫
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Dialog>
    );
}
