/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, IpcMainInvokeEvent } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const NOTES_DIR = join(app.getPath("userData"), "..", "VencordZNotes");
const NOTES_FILE = join(NOTES_DIR, "znotes.json");

function ensureDir() {
    if (!existsSync(NOTES_DIR)) {
        mkdirSync(NOTES_DIR, { recursive: true });
    }
}

export function getNotesFilePath(_: IpcMainInvokeEvent): string {
    return NOTES_FILE;
}

export function readNotes(_: IpcMainInvokeEvent): any[] {
    try {
        ensureDir();
        if (!existsSync(NOTES_FILE)) {
            return [];
        }
        const data = readFileSync(NOTES_FILE, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        console.error("[ZNotes] Failed to read notes file:", e);
        return [];
    }
}

export function writeNotes(_: IpcMainInvokeEvent, notes: any[]): boolean {
    try {
        ensureDir();
        writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), "utf-8");
        return true;
    } catch (e) {
        console.error("[ZNotes] Failed to write notes file:", e);
        return false;
    }
}

export function exportNotesToFile(_: IpcMainInvokeEvent, filePath: string, notes: any[]): boolean {
    try {
        writeFileSync(filePath, JSON.stringify(notes, null, 2), "utf-8");
        return true;
    } catch (e) {
        console.error("[ZNotes] Failed to export notes:", e);
        return false;
    }
}

export function importNotesFromFile(_: IpcMainInvokeEvent, filePath: string): any[] | null {
    try {
        const data = readFileSync(filePath, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        console.error("[ZNotes] Failed to import notes:", e);
        return null;
    }
}
